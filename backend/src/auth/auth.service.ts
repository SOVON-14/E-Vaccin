import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email ou téléphone existe déjà');
    }

    const hashedPassword = await argon2.hash(dto.password);

    // Défense en profondeur : même si le DTO était contourné, un rôle privilégié
    // (ADMIN, CENTER_MANAGER) ne peut jamais être auto-attribué via l'inscription
    // publique. Ces comptes sont créés par un ADMIN.
    const privilegedRoles: UserRole[] = [UserRole.ADMIN, UserRole.CENTER_MANAGER];
    const role =
      dto.role && !privilegedRoles.includes(dto.role) ? dto.role : UserRole.PARENT;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          role,
        },
      });

      if (role === UserRole.PARENT) {
        await tx.parent.create({
          data: {
            userId: newUser.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      } else if (role === UserRole.HEALTH_WORKER) {
        if (!dto.healthCenterId || !dto.licenseNumber) {
          throw new BadRequestException('Le centre de santé et le numéro de licence sont requis pour un agent');
        }
        await tx.healthWorker.create({
          data: {
            userId: newUser.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            licenseNumber: dto.licenseNumber,
            healthCenterId: dto.healthCenterId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: AuditAction.USER_CREATED,
          entityType: 'User',
          entityId: newUser.id,
          newValue: { email: newUser.email, role: newUser.role },
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        parent: true,
        healthWorker: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Votre compte est désactivé');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Compte temporairement verrouillé suite à trop de tentatives');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Reset failed login attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: user.id,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const firstName = user.parent?.firstName || user.healthWorker?.firstName || 'Utilisateur';
    const lastName = user.parent?.lastName || user.healthWorker?.lastName || '';

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName,
        lastName,
        healthCenterId: user.healthWorker?.healthCenterId,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }

    // Revoke current refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(tokenRecord.user.id, tokenRecord.user.email, tokenRecord.user.role);
    await this.storeRefreshToken(tokenRecord.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: userId,
      },
    });

    return { message: 'Déconnexion réussie' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
      secret: this.configService.get<string>('JWT_SECRET') || 'your_jwt_secret_change_in_production',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your_refresh_secret_change_in_production',
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
