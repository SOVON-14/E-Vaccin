import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationStatus, UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { CreateNotificationDto, ListNotificationsDto } from './dto/notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly scheduler: NotificationsScheduler,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les notifications',
    description:
      'PARENT/HEALTH_WORKER/CENTER_MANAGER : leurs propres notifications. ADMIN : toute la file avec le statut de livraison.',
  })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@CurrentUser() user: any, @Query() query: ListNotificationsDto) {
    if (user.role === UserRole.ADMIN) {
      return this.notifications.findAll(query.status, query.page, query.limit);
    }
    return this.notifications.findByUser(user.id, query.status, query.page, query.limit);
  }

  @Post()
  @Roles(UserRole.HEALTH_WORKER, UserRole.CENTER_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Créer et envoyer une notification manuelle',
    description: 'Réservé aux agents, gestionnaires de centre et administrateurs.',
  })
  async create(@Body() dto: CreateNotificationDto) {
    const created = await this.notifications.create(dto);
    // Expédition immédiate de cette notification (les rappels planifiés
    // passent par le cycle automatique).
    await this.notifications.processPendingNotifications();
    return created;
  }

  @Post(':id/delivered')
  @ApiOperation({ summary: 'Accuser la livraison d’une notification (webhook canal)' })
  async markDelivered(@Param('id') id: string, @CurrentUser() user: any) {
    // Un utilisateur ne confirme que ses propres notifications ; l'ADMIN confirme tout.
    return this.notifications.markDelivered(
      id,
      user.role === UserRole.ADMIN ? undefined : user.id,
    );
  }

  @Post('admin/retry-failed')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remettre les notifications en échec dans la file d’envoi' })
  async retryFailed() {
    return this.notifications.requeueFailed();
  }

  @Post('admin/run-cycle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Déclencher manuellement un cycle rappels + envoi',
    description: 'Utile pour les tests et l’exploitation ; le cycle tourne aussi automatiquement.',
  })
  async runCycle() {
    const reminders = await this.notifications.generateAppointmentReminders();
    const delivery = await this.notifications.processPendingNotifications();
    return { reminders, delivery };
  }
}
