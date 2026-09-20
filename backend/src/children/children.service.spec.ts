import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, Gender } from '@prisma/client';
import { ChildrenService } from './children.service';
import { ChildAccessService } from './child-access.service';
import { PrismaService } from '../common/prisma/prisma.service';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async () => 'data:image/png;base64,FAKE_QR'),
}));

const CENTER_A = 'center-a';

function userOf(overrides: {
  role: UserRole;
  parent?: { id: string } | null;
  healthWorker?: { id: string; healthCenterId: string } | null;
}) {
  return { id: 'user-1', ...overrides };
}

function createFakePrisma() {
  // Stub du tx passé au callback $transaction, gardé référencé pour les assertions.
  const tx = {
    child: { create: jest.fn(({ data }: any) => ({ id: 'child-new', ...data })) },
    auditLog: { create: jest.fn(({ data }: any) => ({ id: 'audit-1', ...data })) },
  };
  return {
    parent: {
      findUnique: jest.fn(({ where }: any) =>
        where.id === 'parent-1' ? { id: 'parent-1' } : null,
      ),
    },
    healthCenter: {
      findUnique: jest.fn(({ where }: any) =>
        where.id === CENTER_A ? { id: CENTER_A } : null,
      ),
    },
    child: {
      count: jest.fn(async () => 5),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(async () => []),
      create: jest.fn(({ data }: any) => ({ id: 'child-new', ...data })),
    },
    $transaction: jest.fn(async (fn: (txStub: any) => Promise<any>) => fn(tx)),
    auditLog: { create: jest.fn(({ data }: any) => ({ id: 'audit-1', ...data })) },
    vaccination: { findMany: jest.fn(async () => []) },
    vaccineSchedule: { findMany: jest.fn(async () => []) },
    _tx: tx,
  };
}

describe('ChildrenService', () => {
  let service: ChildrenService;
  let prisma: ReturnType<typeof createFakePrisma>;

  const validDto = {
    firstName: 'Kévin',
    lastName: 'Dosseh',
    dateOfBirth: '2025-06-15',
    gender: Gender.MALE,
    healthCenterId: CENTER_A,
  };

  beforeEach(async () => {
    prisma = createFakePrisma();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChildrenService,
        ChildAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ChildrenService);
  });

  describe('create', () => {
    it("un parent crée son propre enfant (parentId forcé, pas celui du DTO)", async () => {
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });

      await service.create({ ...validDto, parentId: 'parent-usurpé' } as any, user);

      const created = (prisma._tx.child.create as jest.Mock).mock.calls[0][0].data;
      expect(created.parentId).toBe('parent-1');
    });

    it('refuse un parent sans profil Parent', async () => {
      const user = userOf({ role: UserRole.PARENT, parent: null });
      await expect(service.create(validDto as any, user)).rejects.toThrow(BadRequestException);
    });

    it('exige parentId pour un agent', async () => {
      const user = userOf({ role: UserRole.HEALTH_WORKER, healthWorker: { id: 'hw-1', healthCenterId: CENTER_A } });
      await expect(service.create(validDto as any, user)).rejects.toThrow('parent');
    });

    it("refuse un agent qui crée un enfant dans un autre centre (403)", async () => {
      const user = userOf({ role: UserRole.HEALTH_WORKER, healthWorker: { id: 'hw-1', healthCenterId: 'center-B' } });
      await expect(
        service.create({ ...validDto, parentId: 'parent-1' } as any, user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('génère un identifiant unique EV-AAAA-NNNNNN et un QR code', async () => {
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });
      const child = await service.create(validDto as any, user);

      expect(child.uniqueId).toMatch(/^EV-\d{4}-\d{6}$/);
      expect(child.qrCode).toBe('data:image/png;base64,FAKE_QR');
    });

    it('journalise CHILD_CREATED dans le même transaction', async () => {
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });
      await service.create(validDto as any, user);

      expect((prisma._tx.auditLog.create as jest.Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CHILD_CREATED' }),
        }),
      );
    });
  });

  describe('findAll (périmètre par rôle)', () => {
    it('filtre sur le parent connecté', async () => {
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });
      await service.findAll(user);

      const where = (prisma.child.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.parentId).toBe('parent-1');
    });

    it('filtre un agent sur son centre', async () => {
      const user = userOf({ role: UserRole.HEALTH_WORKER, healthWorker: { id: 'hw-1', healthCenterId: CENTER_A } });
      await service.findAll(user);

      const where = (prisma.child.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.healthCenterId).toBe(CENTER_A);
    });

    it("refuse un agent sans profil (pas de bypass global)", async () => {
      const user = userOf({ role: UserRole.CENTER_MANAGER, healthWorker: null });
      await expect(service.findAll(user)).rejects.toThrow(ForbiddenException);
    });

    it("l'ADMIN voit tous les enfants (aucun filtre de périmètre)", async () => {
      const user = userOf({ role: UserRole.ADMIN });
      await service.findAll(user);

      const where = (prisma.child.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.parentId).toBeUndefined();
      expect(where.healthCenterId).toBeUndefined();
    });
  });

  describe('findOne / findByUniqueId', () => {
    it('délègue le contrôle d\'accès à ChildAccessService (findOne)', async () => {
      // findFirst = contrôle d'accès ; findUnique = chargement détaillé.
      prisma.child.findFirst.mockResolvedValue({
        id: 'child-1',
        parentId: 'parent-1',
        healthCenterId: CENTER_A,
      });
      prisma.child.findUnique.mockResolvedValue({ id: 'child-1', parentId: 'parent-1' });
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });

      const result = await service.findOne('child-1', user);
      expect(result.id).toBe('child-1');
    });

    it('propage le 403 du contrôle d\'accès (findByUniqueId)', async () => {
      prisma.child.findUnique.mockResolvedValue({
        id: 'child-1',
        parentId: 'parent-autre',
        healthCenterId: CENTER_A,
      });
      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });

      await expect(service.findByUniqueId('EV-2026-000001', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUpcomingVaccinations', () => {
    it('exclut les doses déjà complétées et marque les retards', async () => {
      // Accès autorisé : enfant du parent
      jest
        .spyOn((service as any).childAccess, 'findAccessibleChildOrThrow')
        .mockResolvedValue({ id: 'child-1', dateOfBirth: '2025-06-15' });

      prisma.vaccination.findMany.mockResolvedValue([
        { vaccineId: 'v-bcg', doseNumber: 1 },
      ]);
      prisma.vaccineSchedule.findMany.mockResolvedValue([
        { vaccineId: 'v-bcg', doseNumber: 1, minAgeDays: 0, maxAgeDays: 30, vaccine: { name: 'BCG' } },
        { vaccineId: 'v-vpo', doseNumber: 1, minAgeDays: 0, maxAgeDays: 30, vaccine: { name: 'VPO' } },
        { vaccineId: 'v-rr', doseNumber: 1, minAgeDays: 270, maxAgeDays: 365, vaccine: { name: 'RR' } },
      ]);

      const user = userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } });
      const upcoming = await service.getUpcomingVaccinations('child-1', user);

      // BCG complété → exclu. VPO échu (naissance + 30j < maintenant) → OVERDUE.
      expect(upcoming).toHaveLength(2);
      const vpo = upcoming.find((u: any) => u.vaccine.name === 'VPO');
      expect(vpo.status).toBe('OVERDUE');
    });
  });
});
