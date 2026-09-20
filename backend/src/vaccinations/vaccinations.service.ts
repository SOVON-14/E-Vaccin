import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChildAccessService } from '../children/child-access.service';
import { RecordVaccinationDto } from './dto/record-vaccination.dto';
import { VaccinationStatus, AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly childAccess: ChildAccessService,
  ) {}

  async record(dto: RecordVaccinationDto, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
    });
    if (!child) {
      throw new NotFoundException(`Enfant #${dto.childId} introuvable`);
    }

    const vaccine = await this.prisma.vaccine.findUnique({
      where: { id: dto.vaccineId },
    });
    if (!vaccine) {
      throw new NotFoundException(`Vaccin #${dto.vaccineId} introuvable`);
    }

    let healthCenterId = dto.healthCenterId;
    let healthWorkerId: string | null = null;

    if (user.role === UserRole.HEALTH_WORKER && user.healthWorker) {
      healthWorkerId = user.healthWorker.id;
      // Un agent enregistre toujours dans son propre centre : le DTO ne peut
      // pas redéfinir le lieu de l'acte médical.
      healthCenterId = user.healthWorker.healthCenterId;
    } else {
      healthCenterId = healthCenterId || child.healthCenterId;
      // Get default worker from that center if available
      const defaultWorker = await this.prisma.healthWorker.findFirst({
        where: { healthCenterId },
      });
      healthWorkerId = defaultWorker?.id || null;
    }

    if (!healthWorkerId) {
      throw new BadRequestException('Aucun agent de santé associé pour enregistrer cette vaccination');
    }

    // Check vaccine batch availability
    const batch = await this.prisma.vaccineBatch.findFirst({
      where: {
        batchNumber: dto.batchNumber,
        vaccineId: dto.vaccineId,
      },
    });

    if (batch) {
      if (batch.currentQuantity <= 0) {
        throw new BadRequestException(`Le stock du lot ${dto.batchNumber} est épuisé.`);
      }
      if (new Date(batch.expirationDate) < new Date()) {
        throw new BadRequestException(`Le lot ${dto.batchNumber} est périmé depuis le ${batch.expirationDate.toLocaleDateString('fr')}.`);
      }
    }

    const vacDate = dto.vaccinationDate ? new Date(dto.vaccinationDate) : new Date();

    // Check for next dose schedule
    const nextSchedule = await this.prisma.vaccineSchedule.findUnique({
      where: {
        vaccineId_doseNumber: {
          vaccineId: dto.vaccineId,
          doseNumber: dto.doseNumber + 1,
        },
      },
    });

    let nextDueDate: Date | null = null;
    if (nextSchedule) {
      const intervalDays = nextSchedule.intervalFromPreviousDose || 30;
      nextDueDate = new Date(vacDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    // Execute atomic transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Vaccination record
      const vaccination = await tx.vaccination.create({
        data: {
          childId: dto.childId,
          vaccineId: dto.vaccineId,
          doseNumber: dto.doseNumber,
          batchNumber: dto.batchNumber,
          healthCenterId,
          healthWorkerId,
          vaccinationDate: vacDate,
          nextDueDate,
          status: VaccinationStatus.COMPLETED,
          notes: dto.notes,
          adverseReaction: dto.adverseReaction,
        },
        include: {
          vaccine: true,
          healthCenter: true,
          healthWorker: true,
        },
      });

      // 2. Decrement batch quantity if batch exists
      if (batch) {
        await tx.vaccineBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: { decrement: 1 },
          },
        });

        // 3. Log stock movement
        await tx.stockMovement.create({
          data: {
            vaccineBatchId: batch.id,
            healthCenterId,
            movementType: 'OUT',
            quantity: 1,
            reason: `Administration dose ${dto.doseNumber} pour l’enfant ${child.uniqueId}`,
            performedBy: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          },
        });
      }

      // 4. Create Next Appointment if applicable
      if (nextDueDate && nextSchedule) {
        await tx.appointment.create({
          data: {
            childId: dto.childId,
            vaccineId: dto.vaccineId,
            doseNumber: dto.doseNumber + 1,
            healthCenterId,
            scheduledDate: nextDueDate,
            status: VaccinationStatus.SCHEDULED,
            notes: `Rappel automatique généré après la dose ${dto.doseNumber}`,
          },
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.VACCINATION_CREATED,
          entityType: 'Vaccination',
          entityId: vaccination.id,
          newValue: {
            childId: dto.childId,
            vaccineCode: vaccine.code,
            doseNumber: dto.doseNumber,
            batchNumber: dto.batchNumber,
          },
        },
      });

      return vaccination;
    });

    return result;
  }

  async findByChild(childId: string, user: any) {
    // Contrôle d'accès : parent propriétaire, agent du centre, ou admin.
    await this.childAccess.findAccessibleChildOrThrow(childId, user);

    return this.prisma.vaccination.findMany({
      where: { childId },
      include: {
        vaccine: true,
        healthCenter: { select: { name: true, code: true } },
        healthWorker: { select: { firstName: true, lastName: true, licenseNumber: true } },
      },
      orderBy: { vaccinationDate: 'desc' },
    });
  }
}
