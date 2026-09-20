import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

/**
 * Planificateur de rappels automatiques.
 *
 * Utilise setInterval natif (aucune dépendance ajoutée) :
 * - REMINDER_INTERVAL_MINUTES (défaut 60) : fréquence du cycle génération + envoi.
 * - REMINDER_ENABLED (défaut true) : interrupteur global.
 * - REMINDER_RUN_ON_STARTUP (défaut true) : cycle immédiat au démarrage.
 *
 * Un verrou interne empêche deux cycles de se chevaucher si un traitement
 * dépasse l'intervalle.
 */
@Injectable()
export class NotificationsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled = this.config.get<string>('REMINDER_ENABLED') !== 'false';
    if (!enabled) {
      this.logger.log('Rappels automatiques désactivés (REMINDER_ENABLED=false)');
      return;
    }

    const intervalMinutes = Number(
      this.config.get<string>('REMINDER_INTERVAL_MINUTES') ?? 60,
    );
    const intervalMs = Math.max(intervalMinutes, 1) * 60_000;

    if (this.config.get<string>('REMINDER_RUN_ON_STARTUP') !== 'false') {
      // Hors du cycle de boot : on ne bloque pas le démarrage de l'app.
      setTimeout(() => void this.runCycle(), 5_000);
    }

    this.timer = setInterval(() => void this.runCycle(), intervalMs);
    this.logger.log(
      `Planificateur de rappels démarré (intervalle : ${intervalMinutes} min)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Un cycle complet : génération des rappels, puis envoi de la file. */
  async runCycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('Cycle précédent encore en cours : passage ignoré');
      return;
    }
    this.running = true;
    try {
      const { generated } = await this.notifications.generateAppointmentReminders();
      const { sent, failed } = await this.notifications.processPendingNotifications();
      if (generated > 0 || sent > 0 || failed > 0) {
        this.logger.log(`Cycle : ${generated} rappel(s) généré(s), ${sent} envoyé(s), ${failed} échec(s)`);
      }
    } catch (error) {
      this.logger.error(`Cycle de rappels en échec : ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
