import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';

export type SendResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
};

/**
 * Expédition des notifications vers les canaux externes.
 *
 * ⚠️ Transports SIMULÉS : aucun message réel n'est envoyé. Les implémentations
 * providers sont des no-op horodatés, interfacés pour être remplacés sans
 * toucher au reste du module (SMS → provider local type Africa's Talking /
 * Twilio ; EMAIL → nodemailer/SES ; PUSH → Firebase Cloud Messaging).
 */
@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Envoie une notification sur son canal. Ne lève pas d'exception : le résultat
   * est porté par SendResult afin que la file d'envoi puisse marquer SENT/FAILED.
   */
  async send(input: {
    type: NotificationType;
    title: string;
    message: string;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    metadata?: any;
  }): Promise<SendResult> {
    switch (input.type) {
      case NotificationType.SMS:
      case NotificationType.WHATSAPP:
        return this.sendSms(input);
      case NotificationType.EMAIL:
        return this.sendEmail(input);
      case NotificationType.PUSH:
        return this.sendPush(input);
      default:
        return { ok: false, error: `Canal non supporté : ${input.type}` };
    }
  }

  private async sendSms(input: {
    title: string;
    message: string;
    recipientPhone?: string | null;
  }): Promise<SendResult> {
    if (!input.recipientPhone) {
      return { ok: false, error: 'Numéro de téléphone du destinataire manquant' };
    }
    const apiKey = this.config.get<string>('SMS_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `SMS_API_KEY absente : SMS simulé vers ${maskPhone(input.recipientPhone)}`,
      );
    }
    this.logger.log(`[SIMULÉ SMS] → ${maskPhone(input.recipientPhone)} : ${input.message}`);
    return { ok: true, providerId: `sim-sms-${Date.now()}` };
  }

  private async sendEmail(input: {
    title: string;
    message: string;
    recipientEmail?: string | null;
  }): Promise<SendResult> {
    if (!input.recipientEmail) {
      return { ok: false, error: 'Adresse email du destinataire manquante' };
    }
    this.logger.log(`[SIMULÉ EMAIL] → ${maskEmail(input.recipientEmail)} : ${input.title}`);
    return { ok: true, providerId: `sim-email-${Date.now()}` };
  }

  private async sendPush(input: {
    title: string;
    message: string;
    metadata?: any;
  }): Promise<SendResult> {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    if (!projectId) {
      this.logger.warn('FIREBASE_PROJECT_ID absent : notification PUSH simulée');
    }
    this.logger.log(`[SIMULÉ PUSH] : ${input.title}`);
    return { ok: true, providerId: `sim-push-${Date.now()}` };
  }
}

/** Masque un numéro pour les logs : +228 90 11 22 33 → +228 *** ** 22 33 */
function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : '***';
}

/** Masque un email pour les logs : parent@example.com → p*****@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}
