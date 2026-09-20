import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChildAccessService } from './child-access.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UserRole, AuditAction, VaccinationStatus } from '@prisma/client';

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly childAccess: ChildAccessService,
  ) {}

  async create(dto: CreateChildDto, user: any) {
    let parentId = dto.parentId;

    if (user.role === UserRole.PARENT) {
      if (!user.parent?.id) {
        throw new BadRequestException('Profil parent introuvable pour ce compte');
      }
      parentId = user.parent.id;
    } else if (!parentId) {
      throw new BadRequestException('L’identifiant du parent est obligatoire');
    }

    // Verify parent existence
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException('Parent spécifié introuvable');
    }

    // Verify health center existence
    const center = await this.prisma.healthCenter.findUnique({
      where: { id: dto.healthCenterId },
    });
    if (!center) {
      throw new NotFoundException('Centre de santé introuvable');
    }

    // Un agent (HEALTH_WORKER / CENTER_MANAGER) ne peut créer un enfant que
    // dans son propre centre ; seul l'ADMIN a une portée globale.
    if (
      (user.role === UserRole.HEALTH_WORKER || user.role === UserRole.CENTER_MANAGER) &&
      user.healthWorker?.healthCenterId !== dto.healthCenterId
    ) {
      throw new ForbiddenException(
        'Un agent ne peut enregistrer un enfant que dans son propre centre de santé',
      );
    }

    // Generate unique public ID
    const year = new Date().getFullYear();
    const count = await this.prisma.child.count();
    const sequence = String(count + 1).padStart(6, '0');
    const uniqueId = `EV-${year}-${sequence}`;

    // Generate QR Code containing verification payload
    const qrPayload = JSON.stringify({
      uniqueId,
      name: `${dto.firstName} ${dto.lastName}`,
      dob: dto.dateOfBirth,
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    const child = await this.prisma.$transaction(async (tx) => {
      const newChild = await tx.child.create({
        data: {
          uniqueId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth),
          placeOfBirth: dto.placeOfBirth,
          gender: dto.gender,
          bloodType: dto.bloodType,
          qrCode,
          parentId,
          healthCenterId: dto.healthCenterId,
        },
        include: {
          parent: true,
          healthCenter: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.CHILD_CREATED,
          entityType: 'Child',
          entityId: newChild.id,
          newValue: { uniqueId, name: `${newChild.firstName} ${newChild.lastName}` },
        },
      });

      return newChild;
    });

    return child;
  }

  async findAll(user: any, search?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (user.role === UserRole.PARENT) {
      where.parentId = user.parent?.id;
    } else if (user.role === UserRole.HEALTH_WORKER || user.role === UserRole.CENTER_MANAGER) {
      if (!user.healthWorker?.healthCenterId) {
        throw new ForbiddenException(
          'Aucun centre de santé associé à ce compte : accès à la liste des enfants refusé',
        );
      }
      // Un agent ne liste que les enfants de son centre ; seul l'ADMIN voit tout.
      where.healthCenterId = user.healthWorker.healthCenterId;
    }

    if (search) {
      where.OR = [
        { uniqueId: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.child.count({ where }),
      this.prisma.child.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: { select: { firstName: true, lastName: true } },
          healthCenter: { select: { id: true, name: true, code: true } },
          _count: { select: { vaccinations: true, appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    // Contrôle d'accès : parent propriétaire, agent du centre, ou admin.
    await this.childAccess.findAccessibleChildOrThrow(id, user);

    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            user: { select: { email: true, phone: true } },
          },
        },
        healthCenter: true,
        vaccinations: {
          include: {
            vaccine: true,
            healthWorker: true,
          },
          orderBy: { vaccinationDate: 'desc' },
        },
        appointments: {
          include: {
            vaccine: true,
          },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!child) {
      throw new NotFoundException(`Enfant #${id} introuvable`);
    }

    // Redondance volontaire : le ChildAccessService a déjà autorisé l'accès.
    return child;
  }

  async findByUniqueId(uniqueId: string, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { uniqueId },
      include: {
        parent: {
          include: {
            user: { select: { email: true, phone: true } },
          },
        },
        healthCenter: true,
        vaccinations: {
          include: {
            vaccine: true,
            healthWorker: true,
          },
          orderBy: { vaccinationDate: 'desc' },
        },
      },
    });

    if (!child) {
      throw new NotFoundException(`Enfant avec le code ${uniqueId} introuvable`);
    }

    // Contrôle d'accès identique à findOne : le scan d'un QR code ne doit
    // pas permettre de consulter un dossier hors de son périmètre.
    this.childAccess.assertCanAccessChild(child, user);

    return child;
  }

  async getUpcomingVaccinations(childId: string, user: any) {
    // Contrôle d'accès : parent propriétaire, agent du centre, ou admin.
    const child = await this.childAccess.findAccessibleChildOrThrow(childId, user);

    const vaccinations = await this.prisma.vaccination.findMany({
      where: { childId: child.id },
      select: { vaccineId: true, doseNumber: true },
    });

    const birthDate = new Date(child.dateOfBirth);
    const schedules = await this.prisma.vaccineSchedule.findMany({
      where: { isActive: true },
      include: { vaccine: true },
      orderBy: { minAgeDays: 'asc' },
    });

    const completedVaccineMap = new Set(
      vaccinations.map((v) => `${v.vaccineId}-${v.doseNumber}`),
    );

    const upcoming = [];
    const now = new Date();

    for (const schedule of schedules) {
      const key = `${schedule.vaccineId}-${schedule.doseNumber}`;
      if (!completedVaccineMap.has(key)) {
        const dueDate = new Date(birthDate.getTime() + schedule.minAgeDays * 24 * 60 * 60 * 1000);
        const maxDueDate = new Date(birthDate.getTime() + schedule.maxAgeDays * 24 * 60 * 60 * 1000);
        const isOverdue = now > maxDueDate;

        upcoming.push({
          vaccine: schedule.vaccine,
          doseNumber: schedule.doseNumber,
          dueDate,
          description: schedule.description,
          status: isOverdue ? VaccinationStatus.OVERDUE : VaccinationStatus.SCHEDULED,
          daysRemaining: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)),
        });
      }
    }

    return upcoming;
  }
}
