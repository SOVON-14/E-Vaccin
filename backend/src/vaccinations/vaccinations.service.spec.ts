import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, VaccinationStatus, AuditAction } from '@prisma/client';
import { VaccinationsService } from './vaccinations.service';
import { ChildAccessService } from '../children/child-access.service';
import { PrismaService } from '../common/prisma/prisma.service';

const CENTER_A = 'center-a';

function workerUser() {
  return {
    id: 'user-agent',
    role: UserRole.HEALTH_WORKER,
    healthWorker: { id: 'hw-1', healthCenterId: CENTER_A },
    firstName: 'Afi',
    lastName: 'Mensah',
  };
}

function createFakePrisma() {
  const tx = {
    vaccination: { create: jest.fn(({ data }: any) => ({ id: 'vac-1', ...data })) },
    vaccineBatch: { update: jest.fn(({ data }: any) => ({ id: 'batch-1', ...data })) },
    stockMovement: { create: jest.fn(({ data }: any) => ({ id: 'mov-1', ...data })) },
    appointment: { create: jest.fn(({ data }: any) => ({ id: 'apt-1', ...data })) },
    auditLog: { create: jest.fn(({ data }: any) => ({ id: 'audit-1', ...data })) },
  };
  return {
    child: { findUnique: jest.fn() },
    vaccine: { findUnique: jest.fn() },
    healthWorker: { findFirst: jest.fn(async () => null) },
    vaccineBatch: { findFirst: jest.fn(async () => null) },
    vaccineSchedule: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: (txStub: any) => Promise<any>) => fn(tx)),
    vaccination: { findMany: jest.fn(async () => []) },
    _tx: tx,
  };
}

const baseDto = {
  childId: 'child-1',
  vaccineId: 'v-bcg',
  doseNumber: 1,
  batchNumber: 'BCG-2026-LOT1',
};

describe('VaccinationsService', () => {
  let service: VaccinationsService;
  let prisma: ReturnType<typeof createFakePrisma>;

  beforeEach(async () => {
    prisma = createFakePrisma();

    const moduleRef = await Test.createTestingModule({
      providers: [
        VaccinationsService,
        ChildAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(VaccinationsService);
  });

  describe('record (par un agent)', () => {
    beforeEach(() => {
      prisma.child.findUnique.mockResolvedValue({
        id: 'child-1',
        uniqueId: 'EV-2026-000001',
        healthCenterId: CENTER_A,
      });
      prisma.vaccine.findUnique.mockResolvedValue({ id: 'v-bcg', code: 'BCG', name: 'BCG' });
    });

    it('enregistre la vaccination avec l’agent connecté et son centre', async () => {
      const vaccination = await service.record(baseDto, workerUser());

      const data = (prisma._tx.vaccination.create as jest.Mock).mock.calls[0][0].data;
      expect(data.healthWorkerId).toBe('hw-1');
      expect(data.healthCenterId).toBe(CENTER_A);
      expect(data.status).toBe(VaccinationStatus.COMPLETED);
      expect(vaccination.id).toBe('vac-1');
    });

    it("refuse un enfant inexistant (404)", async () => {
      prisma.child.findUnique.mockResolvedValue(null);
      await expect(service.record(baseDto, workerUser())).rejects.toThrow(NotFoundException);
    });

    it("refuse un vaccin inexistant (404)", async () => {
      prisma.vaccine.findUnique.mockResolvedValue(null);
      await expect(service.record(baseDto, workerUser())).rejects.toThrow(NotFoundException);
    });

    it('épuise le lot : refuse la vaccination si stock à 0', async () => {
      prisma.vaccineBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        currentQuantity: 0,
        expirationDate: new Date('2027-01-01'),
      });
      await expect(service.record(baseDto, workerUser())).rejects.toThrow('épuisé');
    });

    it('refuse un lot périmé', async () => {
      prisma.vaccineBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        currentQuantity: 10,
        expirationDate: new Date('2020-01-01'),
      });
      await expect(service.record(baseDto, workerUser())).rejects.toThrow('périmé');
    });

    it('décrémente le stock et journalise le mouvement OUT dans la même transaction', async () => {
      prisma.vaccineBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        currentQuantity: 10,
        expirationDate: new Date('2027-01-01'),
      });

      await service.record(baseDto, workerUser());

      expect(prisma._tx.vaccineBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentQuantity: { decrement: 1 } } }),
      );
      expect(prisma._tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ movementType: 'OUT', quantity: 1 }),
        }),
      );
    });

    it('crée le rendez-vous de la dose suivante basé sur le calendrier', async () => {
      prisma.vaccineSchedule.findUnique.mockResolvedValue({
        doseNumber: 2,
        intervalFromPreviousDose: 30,
      });

      await service.record(baseDto, workerUser());

      const aptData = (prisma._tx.appointment.create as jest.Mock).mock.calls[0][0].data;
      expect(aptData.doseNumber).toBe(2);
      expect(aptData.status).toBe(VaccinationStatus.SCHEDULED);
      const vacData = (prisma._tx.vaccination.create as jest.Mock).mock.calls[0][0].data;
      const expected = new Date(vacData.vaccinationDate.getTime() + 30 * 86400_000);
      expect(new Date(aptData.scheduledDate).getTime()).toBe(expected.getTime());
    });

    it('ne crée pas de rendez-vous si c’était la dernière dose', async () => {
      await service.record(baseDto, workerUser());
      expect(prisma._tx.appointment.create).not.toHaveBeenCalled();
    });

    it("force le centre de l'agent même si le DTO tente un autre centre", async () => {
      await service.record({ ...baseDto, healthCenterId: 'center-B' }, workerUser());

      const data = (prisma._tx.vaccination.create as jest.Mock).mock.calls[0][0].data;
      expect(data.healthCenterId).toBe(CENTER_A);
    });

    it('journalise VACCINATION_CREATED avec le contexte', async () => {
      await service.record(baseDto, workerUser());

      expect(prisma._tx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.VACCINATION_CREATED }),
        }),
      );
    });

    it("refuse un enregistrement par un PARENT (aucun agent associé)", async () => {
      const parent = { id: 'user-parent', role: UserRole.PARENT, parent: { id: 'parent-1' } };
      // Enfant d'un autre centre : le contrôle d'accès devrait déjà bloquer en
      // production via le guard; ici le service ne trouve aucun agent à associer.
      await expect(service.record(baseDto, parent as any)).rejects.toThrow(
        'Aucun agent de santé',
      );
    });
  });

  describe('findByChild', () => {
    it('applique le contrôle d\'accès avant de lire l\'historique', async () => {
      const parent = { id: 'user-parent', role: UserRole.PARENT, parent: { id: 'parent-1' } };

      jest
        .spyOn((service as any).childAccess, 'findAccessibleChildOrThrow')
        .mockRejectedValue(new ForbiddenException('Accès non autorisé à ce dossier médical'));

      await expect(service.findByChild('child-autre', parent)).rejects.toThrow(ForbiddenException);
      expect(prisma.vaccination.findMany).not.toHaveBeenCalled();
    });

    it('renvoie l’historique trié du plus récent au plus ancien', async () => {
      const parent = { id: 'user-parent', role: UserRole.PARENT, parent: { id: 'parent-1' } };
      jest
        .spyOn((service as any).childAccess, 'findAccessibleChildOrThrow')
        .mockResolvedValue({ id: 'child-1' });

      await service.findByChild('child-1', parent);

      expect(prisma.vaccination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { vaccinationDate: 'desc' } }),
      );
    });
  });
});
