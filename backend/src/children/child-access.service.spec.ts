import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ChildAccessService } from './child-access.service';
import { PrismaService } from '../common/prisma/prisma.service';

const CENTER_A = 'center-a';
const CENTER_B = 'center-b';

const childOf = (overrides: Partial<{ id: string; parentId: string; healthCenterId: string; isActive: boolean }>) => ({
  id: 'child-1',
  parentId: 'parent-1',
  healthCenterId: CENTER_A,
  isActive: true,
  ...overrides,
});

function createFakePrisma(children: any[] = []) {
  return {
    child: {
      findFirst: jest.fn(({ where }: any) =>
        children.find((c) => c.id === where.id && c.isActive === where.isActive) ?? null,
      ),
    },
  };
}

function userOf(overrides: {
  role: UserRole;
  parent?: { id: string } | null;
  healthWorker?: { id: string; healthCenterId: string } | null;
}) {
  return { id: 'user-1', ...overrides };
}

describe('ChildAccessService', () => {
  let service: ChildAccessService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createFakePrisma([childOf({ id: 'child-1' })]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChildAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ChildAccessService);
  });

  describe('PARENT', () => {
    it("autorise le parent propriétaire à consulter son enfant", async () => {
      const child = await service.findAccessibleChildOrThrow(
        'child-1',
        userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } }),
      );
      expect(child.id).toBe('child-1');
    });

    it("refuse (403) un parent qui consulte le dossier d'un autre parent", async () => {
      await expect(
        service.findAccessibleChildOrThrow(
          'child-1',
          userOf({ role: UserRole.PARENT, parent: { id: 'parent-autre' } }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuse (403) un parent sans profil Parent rattaché', async () => {
      await expect(
        service.findAccessibleChildOrThrow(
          'child-1',
          userOf({ role: UserRole.PARENT, parent: null }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('HEALTH_WORKER / CENTER_MANAGER', () => {
    it("autorise un agent du même centre", async () => {
      const child = await service.findAccessibleChildOrThrow(
        'child-1',
        userOf({ role: UserRole.HEALTH_WORKER, healthWorker: { id: 'hw-1', healthCenterId: CENTER_A } }),
      );
      expect(child.id).toBe('child-1');
    });

    it('autorise un CENTER_MANAGER du même centre', async () => {
      await expect(
        service.findAccessibleChildOrThrow(
          'child-1',
          userOf({ role: UserRole.CENTER_MANAGER, healthWorker: { id: 'hw-2', healthCenterId: CENTER_A } }),
        ),
      ).resolves.toBeTruthy();
    });

    it("refuse (403) un agent d'un autre centre", async () => {
      await expect(
        service.findAccessibleChildOrThrow(
          'child-1',
          userOf({ role: UserRole.HEALTH_WORKER, healthWorker: { id: 'hw-3', healthCenterId: CENTER_B } }),
        ),
      ).rejects.toThrow('Accès limité');
    });
  });

  describe('ADMIN', () => {
    it('accède à tout dossier (portée globale)', async () => {
      const child = await service.findAccessibleChildOrThrow(
        'child-1',
        userOf({ role: UserRole.ADMIN }),
      );
      expect(child.id).toBe('child-1');
    });
  });

  describe('Cas transverses', () => {
    it("renvoie 404 pour un enfant inexistant ou désactivé", async () => {
      await expect(
        service.findAccessibleChildOrThrow('inconnu', userOf({ role: UserRole.ADMIN })),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse tout rôle inconnu (default du switch)", async () => {
      await expect(
        service.findAccessibleChildOrThrow(
          'child-1',
          userOf({ role: 'HACKER' as any }),
        ),
      ).rejects.toThrow('Rôle non autorisé');
    });

    it('assertCanAccessChild ne recharge pas la base (enfant déjà chargé)', async () => {
      const child = childOf({});
      expect(() =>
        service.assertCanAccessChild(child, userOf({ role: UserRole.PARENT, parent: { id: 'parent-1' } })),
      ).not.toThrow();
      expect(prisma.child.findFirst).not.toHaveBeenCalled();
    });
  });
});
