import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';

@Module({
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
