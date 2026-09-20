import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

/** Contexte utilisateur minimal requis pour les vérifications d'accès. */
type AccessContext = {
  id: string;
  role: UserRole;
  parent?: { id: string } | null;
  healthWorker?: { id: string; healthCenterId: string } | null;
};

/**
 * Contrôle d'accès centralisé aux dossiers enfants.
 *
 * Règle métier :
 * - Un PARENT ne peut accéder qu'aux dossiers de ses propres enfants.
 * - Un agent (HEALTH_WORKER, CENTER_MANAGER) ne peut accéder qu'aux dossiers
 *   rattachés à son centre de santé.
 * - ADMIN : accès global (supervision, support).
 */
@Injectable()
export class ChildAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Charge un enfant et vérifie que l'utilisateur est autorisé à le consulter.
   * Lance une NotFoundException (enfant absent/inactif) ou ForbiddenException
   * (accès hors périmètre).
   */
  async findAccessibleChildOrThrow(childId: string, user: AccessContext) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, isActive: true },
    });

    if (!child) {
      throw new NotFoundException(`Enfant #${childId} introuvable`);
    }

    this.assertCanAccessChild(child, user);
    return child;
  }

  /**
   * Vérifie le droit d'accès sur un enfant déjà chargé (évite une requête
   * supplémentaire quand l'entité est déjà en main).
   */
  assertCanAccessChild(
    child: { parentId: string; healthCenterId: string },
    user: AccessContext,
  ): void {
    switch (user.role) {
      case UserRole.ADMIN:
        break;

      case UserRole.PARENT:
        if (!user.parent?.id || child.parentId !== user.parent.id) {
          throw new ForbiddenException('Accès non autorisé à ce dossier médical');
        }
        break;

      case UserRole.HEALTH_WORKER:
      case UserRole.CENTER_MANAGER: {
        const workerCenterId = user.healthWorker?.healthCenterId;
        if (!workerCenterId || child.healthCenterId !== workerCenterId) {
          throw new ForbiddenException(
            'Accès limité aux enfants rattachés à votre centre de santé',
          );
        }
        break;
      }

      default:
        throw new ForbiddenException('Rôle non autorisé à consulter un dossier médical');
    }
  }
}
