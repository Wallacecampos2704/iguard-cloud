import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('test')
  test(@Headers('x-notification-test-token') providedToken?: string) {
    const configuredToken = process.env.NOTIFICATION_TEST_TOKEN?.trim();
    if (configuredToken && providedToken !== configuredToken) {
      throw new UnauthorizedException('Token administrativo inválido.');
    }

    return this.notificationService.sendTest();
  }
}
