import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationStatus,
  NotificationType,
  UserRole,
  VaccinationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationSenderService } from './channels/notification-sender.service';
import { CreateNotificationDto } from './dto/notifications.dto';

/** Fenêtre de rappel par défaut : RDV dans les 48 h. */
const DEFAULT_REMINDER_WINDOW_HOURS = 48;

/**
 * Notifications : boîte de réception utilisateur + génération automatique
 * des rappels de rendez-vous + file d'envoi vers les canaux.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: NotificationSenderService,
    private readonly config: ConfigService,
  ) {}

  // ── Boîte de réception ─────────────────────────────────────────────

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        recipientEmail: dto.recipientEmail,
        recipientPhone: dto.recipientPhone,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        status: NotificationStatus.PENDING,
      },
    });
  }

  async findByUser(userId: string, status?: NotificationStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = { userId };
    if (status) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Liste globale — réservée ADMIN (supervision de la file d'envoi). */
  async findAll(status?: NotificationStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { email: true, role: true } } },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Accuse de réception canal (webhook provider) : PENDING/SENT → DELIVERED. */
  async markDelivered(id: string, userId?: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification #${id} introuvable`);
    }
    if (userId && notification.userId !== userId) {
      throw new ForbiddenException('Notification étrangère à ce compte');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  /**
   * Réinjecte les échecs dans la file (retry manuel opérateur).
   * Retourne le nombre de notifications remises en PENDING.
   */
  async requeueFailed(userId?: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        status: NotificationStatus.FAILED,
        ...(userId ? { userId } : {}),
      },
      data: { status: NotificationStatus.PENDING, error: null },
    });
    this.logger.log(`Retry : ${result.count} notification(s) remise(s) en file`);
    return result;
  }

  // ── Rappels automatiques de rendez-vous ────────────────────────────

  /**
   * Génère les notifications de rappel pour les RDV à venir dans la fenêtre
   * configurée (REMINDER_WINDOW_HOURS, défaut 48 h) dont reminderSent=false.
   * Idempotent : le flag reminderSent empêche tout doublon.
   */
  async generateAppointmentReminders(): Promise<{ generated: number }> {
    const windowHours = Number(
      this.config.get<string>('REMINDER_WINDOW_HOURS') ?? DEFAULT_REMINDER_WINDOW_HOURS,
    );
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowHours * 3_600_000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: VaccinationStatus.SCHEDULED,
        reminderSent: false,
        scheduledDate: { gte: now, lte: windowEnd },
      },
      include: {
        child: true,
        vaccine: true,
        healthCenter: true,
      },
      take: 200, // garde-fou : traitements par lots
    });

    let generated = 0;

    for (const apt of appointments) {
      // Le destinataire est le compte User du parent de l'enfant.
      const parent = await this.prisma.parent.findUnique({
        where: { id: apt.child.parentId },
        include: { user: true },
      });
      if (!parent?.user) {
        this.logger.warn(
          `RDV ${apt.id} : parent sans compte utilisateur, rappel impossible`,
        );
        continue;
      }

      const when = apt.scheduledDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      const title = 'Rappel de vaccination';
      const message =
        `Le vaccin ${apt.vaccine.name} (dose ${apt.doseNumber}) de ${apt.child.firstName} ` +
        `${apt.child.lastName} est prévu le ${when} au ${apt.healthCenter.name}.`;

      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.notification.create({
            data: {
              userId: parent.userId,
              type: NotificationType.SMS,
              title,
              message,
              recipientPhone: parent.user.phone,
              recipientEmail: parent.user.email,
              metadata: {
                appointmentId: apt.id,
                childId: apt.childId,
                vaccineId: apt.vaccineId,
                doseNumber: apt.doseNumber,
                scheduledDate: apt.scheduledDate.toISOString(),
              },
              status: NotificationStatus.PENDING,
            },
          });

          // Flag posé dans la même transaction : pas de double rappel.
          await tx.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true },
          });
        });
        generated++;
      } catch (error) {
        this.logger.error(
          `Échec de génération du rappel pour le RDV ${apt.id} : ${String(error)}`,
        );
      }
    }

    if (generated > 0) {
      this.logger.log(`${generated} rappel(s) de rendez-vous généré(s)`);
    }
    return { generated };
  }

  // ── File d'envoi ───────────────────────────────────────────────────

  /**
   * Expédie les notifications PENDING dues (scheduledAt passé ou absent).
   * Marque SENT ou FAILED avec le libellé d'erreur du canal.
   */
  async processPendingNotifications(): Promise<{ sent: number; failed: number }> {
    const due = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    let sent = 0;
    let failed = 0;

    for (const notification of due) {
      try {
        const result = await this.sender.send({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          recipientEmail: notification.recipientEmail,
          recipientPhone: notification.recipientPhone,
          metadata: notification.metadata,
        });

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: result.ok
            ? { status: NotificationStatus.SENT, sentAt: new Date(), error: null }
            : { status: NotificationStatus.FAILED, error: result.error ?? 'Erreur inconnue' },
        });

        result.ok ? sent++ : failed++;
      } catch (error) {
        failed++;
        await this.prisma.notification
          .update({
            where: { id: notification.id },
            data: { status: NotificationStatus.FAILED, error: String(error) },
          })
          .catch(() => undefined);
        this.logger.error(`Envoi impossible (${notification.id}) : ${String(error)}`);
      }
    }

    if (due.length > 0) {
      this.logger.log(`File d'envoi : ${sent} envoyée(s), ${failed} échec(s)`);
    }
    return { sent, failed };
  }
}
