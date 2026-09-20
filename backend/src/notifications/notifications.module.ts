import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationSenderService } from './channels/notification-sender.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSenderService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
