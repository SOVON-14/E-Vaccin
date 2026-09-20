import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserRole, AuditAction } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Fake Prisma en mémoire : table `user` + transaction séquentielle.
 * Suffisant pour tester la logique métier d'AuthService sans base réelle.
 */
function createFakePrisma() {
  const db = { user: [] as any[], refreshToken: [] as any[], auditLog: [] as any[] };
  const userDelegate = {
    findUnique: jest.fn(({ where }: any) =>
      db.user.find((u) => u.email === where.email || u.id === where.id) ?? null,
    ),
    findFirst: jest.fn(({ where }: any) => {
      const or = where?.OR ?? [];
      return (
        db.user.find((u) =>
          or.some((cond: any) =>
            (cond.email && u.email === cond.email) || (cond.phone && u.phone === cond.phone),
          ),
        ) ?? null
      );
    }),
    create: jest.fn(({ data }: any) => {
      const user = { id: `user-${db.user.length + 1}`, ...data };
      db.user.push(user);
      return user;
    }),
    update: jest.fn(({ where, data }: any) => {
      const user = db.user.find((u) => u.id === where.id);
      if (!user) throw new Error('user not found');
      Object.assign(user, data);
      return user;
    }),
  };
  const prisma: any = {
    user: userDelegate,
    parent: { create: jest.fn(({ data }: any) => ({ id: 'parent-1', ...data })) },
    healthWorker: { create: jest.fn(({ data }: any) => ({ id: 'worker-1', ...data })) },
    refreshToken: {
      create: jest.fn(({ data }: any) => {
        const token = { id: `rt-${db.refreshToken.length + 1}`, revokedAt: null, ...data };
        db.refreshToken.push(token);
        return token;
      }),
      findUnique: jest.fn(({ where }: any) => {
        const token = db.refreshToken.find((t) => t.token === where.token) ?? null;
        if (token) {
          // Simule l'"include: { user: true }" du service.
          token.user = db.user.find((u) => u.id === token.userId) ?? null;
        }
        return token;
      }),
      update: jest.fn(({ where, data }: any) => {
        const token = db.refreshToken.find((t) => t.id === where.id || t.token === where.token);
        if (!token) throw new Error('token not found');
        Object.assign(token, data);
        return token;
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        let count = 0;
        for (const t of db.refreshToken) {
          if (where.userId !== undefined && t.userId !== where.userId) continue;
          if (where.token !== undefined && t.token !== where.token) continue;
          if (where.revokedAt === null && t.revokedAt !== null) continue;
          Object.assign(t, data);
          count++;
        }
        return { count };
      }),
    },
    auditLog: {
      create: jest.fn(({ data }: any) => {
        const entry = { id: `audit-${db.auditLog.length + 1}`, ...data };
        db.auditLog.push(entry);
        return entry;
      }),
    },
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => fn(prisma)),
    _db: db,
  };
  return prisma;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createFakePrisma>;
  let jwtService: JwtService;

  beforeEach(async () => {
    prisma = createFakePrisma();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(
              (payload: any, opts?: any) =>
                `jwt.${Buffer.from(JSON.stringify({ ...payload, opts })).toString('base64url')}`,
            ),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  describe('register', () => {
    const baseDto = {
      email: 'parent@test.com',
      password: 'Password123!',
      firstName: 'Koffi',
      lastName: 'Dosseh',
    };

    it('crée un PARENT avec profil Parent et retourne les tokens', async () => {
      const result = await service.register({ ...baseDto, role: UserRole.PARENT });

      expect(result.user.email).toBe(baseDto.email);
      expect(result.user.role).toBe(UserRole.PARENT);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.parent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ firstName: 'Koffi' }) }),
      );
      expect(prisma._db.auditLog).toHaveLength(1);
      expect(prisma._db.auditLog[0].action).toBe(AuditAction.USER_CREATED);
    });

    it("hache le mot de passe avec argon2 (jamais en clair)", async () => {
      await service.register({ ...baseDto, role: UserRole.PARENT });

      const stored = prisma._db.user[0].password;
      expect(stored).not.toBe(baseDto.password);
      await expect(argon2.verify(stored, baseDto.password)).resolves.toBe(true);
    });

    it('crée un HEALTH_WORKER avec son profil et son centre', async () => {
      const dto = {
        ...baseDto,
        email: 'agent@test.com',
        role: UserRole.HEALTH_WORKER,
        healthCenterId: 'center-1',
        licenseNumber: 'HW-001',
      };

      const result = await service.register(dto);

      expect(result.user.role).toBe(UserRole.HEALTH_WORKER);
      expect(prisma.healthWorker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ healthCenterId: 'center-1', licenseNumber: 'HW-001' }),
        }),
      );
    });

    it('refuse un HEALTH_WORKER sans centre ni licence', async () => {
      await expect(
        service.register({ ...baseDto, role: UserRole.HEALTH_WORKER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sanitise un rôle privilégié injecté dans le DTO vers PARENT (défense en profondeur)', async () => {
      // Simule un DTO falsifié : le service ne doit JAMAIS créer d'ADMIN.
      const result = await service.register({
        ...baseDto,
        role: UserRole.ADMIN as any,
      });

      expect(result.user.role).toBe(UserRole.PARENT);
      expect(prisma.parent.create).toHaveBeenCalled();
      const stored = prisma._db.user[0];
      expect(stored.role).toBe(UserRole.PARENT);
    });

    it('sanitise aussi CENTER_MANAGER vers PARENT', async () => {
      const result = await service.register({
        ...baseDto,
        role: UserRole.CENTER_MANAGER as any,
      });
      expect(result.user.role).toBe(UserRole.PARENT);
    });

    it('refuse un email déjà utilisé', async () => {
      await service.register({ ...baseDto, role: UserRole.PARENT });
      await expect(service.register({ ...baseDto, role: UserRole.PARENT })).rejects.toThrow(
        ConflictException,
      );
    });

    it('refuse un téléphone déjà utilisé', async () => {
      await service.register({ ...baseDto, phone: '+22890000000', role: UserRole.PARENT });
      await expect(
        service.register({
          ...baseDto,
          email: 'other@test.com',
          phone: '+22890000000',
          role: UserRole.PARENT,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          id: 'user-1',
          email: 'parent@test.com',
          password: await argon2.hash('Password123!'),
          role: UserRole.PARENT,
          isActive: true,
          failedLoginAttempts: 0,
        },
      } as any);
    });

    it('connecte un utilisateur valide et renvoie les tokens', async () => {
      const result = await service.login({ email: 'parent@test.com', password: 'Password123!' });

      expect(result.user.email).toBe('parent@test.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma._db.auditLog.some((a) => a.action === AuditAction.LOGIN)).toBe(true);
    });

    it("refuse un mauvais mot de passe et incrémente failedLoginAttempts", async () => {
      await expect(
        service.login({ email: 'parent@test.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma._db.user[0].failedLoginAttempts).toBe(1);
    });

    it("verrouille le compte après 5 échecs (lockedUntil positionné)", async () => {
      prisma._db.user[0].failedLoginAttempts = 4;

      await expect(
        service.login({ email: 'parent@test.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma._db.user[0].failedLoginAttempts).toBe(5);
      expect(prisma._db.user[0].lockedUntil).toBeInstanceOf(Date);
      expect(prisma._db.user[0].lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('refuse un compte verrouillé même avec le bon mot de passe', async () => {
      prisma._db.user[0].lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

      await expect(
        service.login({ email: 'parent@test.com', password: 'Password123!' }),
      ).rejects.toThrow('verrouillé');
    });

    it('refuse un compte désactivé', async () => {
      prisma._db.user[0].isActive = false;

      await expect(
        service.login({ email: 'parent@test.com', password: 'Password123!' }),
      ).rejects.toThrow('désactivé');
    });

    it("refuse un email inexistant sans révéler d'information", async () => {
      await expect(
        service.login({ email: 'ghost@test.com', password: 'Whatever123!' }),
      ).rejects.toThrow('Identifiants incorrects');
    });

    it("réinitialise les compteurs après une connexion réussie", async () => {
      prisma._db.user[0].failedLoginAttempts = 3;

      await service.login({ email: 'parent@test.com', password: 'Password123!' });

      expect(prisma._db.user[0].failedLoginAttempts).toBe(0);
      expect(prisma._db.user[0].lockedUntil).toBeNull();
    });
  });

  describe('refreshTokens (rotation)', () => {
    it("révoque l'ancien token et émet une nouvelle paire", async () => {
      await prisma.refreshToken.create({
        data: {
          token: 'valid-refresh-token',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 86400_000),
        },
      } as any);
      await prisma.user.create({
        data: { id: 'user-1', email: 'parent@test.com', role: UserRole.PARENT, isActive: true },
      } as any);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(prisma._db.refreshToken[0].revokedAt).toBeInstanceOf(Date);
      expect(prisma._db.refreshToken).toHaveLength(2);
    });

    it("refuse un token déjà révoqué (rejeu détecté)", async () => {
      await prisma.refreshToken.create({
        data: {
          token: 'revoked-token',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 86400_000),
          revokedAt: new Date(),
        },
      } as any);
      await prisma.user.create({
        data: { id: 'user-1', email: 'parent@test.com', role: UserRole.PARENT, isActive: true },
      } as any);

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('refuse un token expiré', async () => {
      await prisma.refreshToken.create({
        data: {
          token: 'expired-token',
          userId: 'user-1',
          expiresAt: new Date(Date.now() - 1000),
        },
      } as any);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('révoque uniquement le refresh token fourni', async () => {
      await prisma.refreshToken.create({
        data: { token: 't1', userId: 'user-1', expiresAt: new Date(Date.now() + 86400_000) },
      } as any);
      await prisma.refreshToken.create({
        data: { token: 't2', userId: 'user-1', expiresAt: new Date(Date.now() + 86400_000) },
      } as any);

      await service.logout('user-1', 't1');

      const revoked = prisma._db.refreshToken.find((t) => t.token === 't1');
      const kept = prisma._db.refreshToken.find((t) => t.token === 't2');
      expect(revoked.revokedAt).toBeInstanceOf(Date);
      expect(kept.revokedAt).toBeNull();
    });

    it('révoque toutes les sessions sans token fourni', async () => {
      await prisma.refreshToken.create({
        data: { token: 't1', userId: 'user-1', expiresAt: new Date(Date.now() + 86400_000) },
      } as any);
      await prisma.refreshToken.create({
        data: { token: 't2', userId: 'user-1', expiresAt: new Date(Date.now() + 86400_000) },
      } as any);

      await service.logout('user-1');

      expect(prisma._db.refreshToken.every((t) => t.revokedAt !== null)).toBe(true);
    });
  });
});
