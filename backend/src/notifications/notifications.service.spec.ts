import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
  VaccinationStatus,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationSenderService } from './channels/notification-sender.service';
import { PrismaService } from '../common/prisma/prisma.service';

function createFakePrisma() {
  return {
    notification: {
      create: jest.fn(({ data }: any) => ({ id: 'notif-1', ...data })),
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      update: jest.fn(({ data }: any) => ({ id: 'notif-1', ...data })),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    appointment: {
      findMany: jest.fn(async () => []),
      update: jest.fn(({ data }: any) => ({ id: 'apt-1', ...data })),
    },
    parent: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) =>
      fn({
        notification: { create: jest.fn(({ data }: any) => ({ id: 'notif-tx', ...data })) },
        appointment: { update: jest.fn(({ data }: any) => ({ id: 'apt-1', ...data })) },
      }),
    ),
  };
}

function fakeSender(overrides: Partial<{ ok: boolean; error: string }> = {}) {
  return { send: jest.fn(async () => ({ ok: true, providerId: 'sim-1', ...overrides })) };
}

/** RDV dans 24 h, non rappelé, planifié. */
function upcomingAppointment(overrides: any = {}) {
  return {
    id: 'apt-1',
    childId: 'child-1',
    vaccineId: 'v-bcg',
    doseNumber: 2,
    scheduledDate: new Date(Date.now() + 24 * 3_600_000),
    status: VaccinationStatus.SCHEDULED,
    reminderSent: false,
    child: { id: 'child-1', firstName: 'Kévin', lastName: 'Dosseh', parentId: 'parent-1' },
    vaccine: { id: 'v-bcg', name: 'BCG' },
    healthCenter: { id: 'center-1', name: 'CHR Lomé' },
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createFakePrisma>;
  let sender: ReturnType<typeof fakeSender>;

  beforeEach(async () => {
    prisma = createFakePrisma();
    sender = fakeSender();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationSenderService, useValue: sender },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('generateAppointmentReminders', () => {
    it('génère un rappel SMS pour un RDV dans la fenêtre et pose reminderSent', async () => {
      prisma.appointment.findMany.mockResolvedValue([upcomingAppointment()]);
      prisma.parent.findUnique.mockResolvedValue({
        id: 'parent-1',
        userId: 'user-parent',
        user: { id: 'user-parent', phone: '+22890000000', email: 'parent@test.com' },
      });

      const txDouble = {
        notification: { create: jest.fn() },
        appointment: { update: jest.fn() },
      };
      (prisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(txDouble));

      const { generated } = await service.generateAppointmentReminders();

      expect(generated).toBe(1);
      const data = txDouble.notification.create.mock.calls[0][0].data;
      expect(data.userId).toBe('user-parent');
      expect(data.type).toBe(NotificationType.SMS);
      expect(data.status).toBe(NotificationStatus.PENDING);
      expect(data.recipientPhone).toBe('+22890000000');
      expect(data.message).toContain('BCG');
      expect(data.message).toContain('Kévin');
      expect(data.metadata.appointmentId).toBe('apt-1');
    });

    it('ne génère AUCUN doublon : RDV déjà rappelé (reminderSent) est exclu', async () => {
      prisma.appointment.findMany.mockResolvedValue(
        [upcomingAppointment({ reminderSent: true })],
      );
      // Le where du findMany doit lui-même filtrer reminderSent: false.
      await service.generateAppointmentReminders();

      const where = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.reminderSent).toBe(false);
      expect(where.status).toBe(VaccinationStatus.SCHEDULED);
    });

    it('n’inclut que les RDV dans la fenêtre [maintenant, maintenant + 48 h]', async () => {
      await service.generateAppointmentReminders();

      const where = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0].where;
      const gte = where.scheduledDate.gte as Date;
      const lte = where.scheduledDate.lte as Date;
      expect(gte.getTime()).toBeLessThanOrEqual(Date.now());
      expect(lte.getTime()).toBeGreaterThan(Date.now());
      // ~48 h de fenêtre
      expect(lte.getTime() - gte.getTime()).toBeCloseTo(48 * 3_600_000, -4);
    });

    it('ignore un RDV dont le parent n’a pas de compte (pas de crash)', async () => {
      prisma.appointment.findMany.mockResolvedValue([upcomingAppointment()]);
      prisma.parent.findUnique.mockResolvedValue(null);

      const { generated } = await service.generateAppointmentReminders();
      expect(generated).toBe(0);
    });

    it('traite par lots (take: 200) pour éviter les traitements infinis', async () => {
      await service.generateAppointmentReminders();
      expect((prisma.appointment.findMany as jest.Mock).mock.calls[0][0].take).toBe(200);
    });

    it('pose reminderSent dans la MÊME transaction que la notification', async () => {
      prisma.appointment.findMany.mockResolvedValue([upcomingAppointment()]);
      prisma.parent.findUnique.mockResolvedValue({
        id: 'parent-1',
        userId: 'user-parent',
        user: { phone: '+22890000000', email: 'parent@test.com' },
      });

      await service.generateAppointmentReminders();

      const txUsed = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      // On exécute le callback avec un double pour capturer les appels.
      const txDouble = {
        notification: { create: jest.fn() },
        appointment: { update: jest.fn() },
      };
      (prisma.$transaction as jest.Mock).mockImplementationOnce((fn: any) => fn(txDouble));

      await service.generateAppointmentReminders();

      expect(txDouble.notification.create).toHaveBeenCalled();
      expect(txDouble.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reminderSent: true } }),
      );
    });
  });

  describe('processPendingNotifications', () => {
    const pendingNotif = {
      id: 'notif-1',
      type: NotificationType.SMS,
      title: 'Rappel',
      message: 'Message',
      recipientPhone: '+22890000000',
      recipientEmail: 'parent@test.com',
      status: NotificationStatus.PENDING,
      metadata: null,
    };

    it('envoie les PENDING dues et marque SENT avec sentAt', async () => {
      prisma.notification.findMany.mockResolvedValue([{ ...pendingNotif }]);

      const { sent, failed } = await service.processPendingNotifications();

      expect(sent).toBe(1);
      expect(failed).toBe(0);
      expect(sender.send).toHaveBeenCalled();
      const updateData = (prisma.notification.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.status).toBe(NotificationStatus.SENT);
      expect(updateData.sentAt).toBeInstanceOf(Date);
    });

    it('marque FAILED sans lever d’exception si le canal échoue', async () => {
      sender.send = jest.fn(async () => ({
        ok: false,
        error: 'Numéro manquant',
      })) as any;
      prisma.notification.findMany.mockResolvedValue([{ ...pendingNotif }]);

      const { sent, failed } = await service.processPendingNotifications();

      expect(sent).toBe(0);
      expect(failed).toBe(1);
      const updateData = (prisma.notification.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.status).toBe(NotificationStatus.FAILED);
      expect(updateData.error).toBe('Numéro manquant');
    });

    it('ne traite que les notifications dues (scheduledAt passé ou absent)', async () => {
      await service.processPendingNotifications();

      const where = (prisma.notification.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.status).toBe(NotificationStatus.PENDING);
      expect(where.OR).toBeDefined();
    });

    it('traite par lots de 100 maximum', async () => {
      await service.processPendingNotifications();
      expect((prisma.notification.findMany as jest.Mock).mock.calls[0][0].take).toBe(100);
    });
  });

  describe('boîte de réception', () => {
    it('findByUser ne renvoie que les notifications de l’utilisateur', async () => {
      await service.findByUser('user-1');

      expect((prisma.notification.count as jest.Mock).mock.calls[0][0].where).toEqual({
        userId: 'user-1',
      });
    });

    it('markDelivered refuse une notification étrangère (403)', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-autre',
      });

      await expect(service.markDelivered('notif-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('markDelivered passe une notification à DELIVERED avec horodatage', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'notif-1', userId: 'user-1' });

      await service.markDelivered('notif-1', 'user-1');

      const data = (prisma.notification.update as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe(NotificationStatus.DELIVERED);
      expect(data.deliveredAt).toBeInstanceOf(Date);
    });

    it('markDelivered renvoie 404 si la notification n’existe pas', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markDelivered('ghost')).rejects.toThrow(NotFoundException);
    });

    it('requeueFailed remet les FAILED en PENDING (retry opérateur)', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.requeueFailed();

      expect(result.count).toBe(3);
      const args = (prisma.notification.updateMany as jest.Mock).mock.calls[0][0];
      expect(args.where.status).toBe(NotificationStatus.FAILED);
      expect(args.data.status).toBe(NotificationStatus.PENDING);
    });
  });

  describe('create', () => {
    it('crée une notification PENDING avec les champs fournis', async () => {
      await service.create({
        type: NotificationType.EMAIL,
        title: 'Test',
        message: 'Contenu',
        userId: 'user-1',
        recipientEmail: 'a@b.com',
        scheduledAt: '2026-09-25T09:00:00.000Z',
        metadata: { appointmentId: 'apt-1' },
      } as any);

      const data = (prisma.notification.create as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe(NotificationStatus.PENDING);
      expect(data.recipientEmail).toBe('a@b.com');
      expect(data.scheduledAt).toBeInstanceOf(Date);
    });
  });
});
