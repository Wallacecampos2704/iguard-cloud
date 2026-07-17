import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { NotificationListQuery } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@Query() query: NotificationListQuery) {
    return this.notificationService.findAll(query);
  }

  @Get('stats')
  stats() {
    return this.notificationService.getStats();
  }

  @Post('test')
  test(@Headers('x-notification-test-token') providedToken?: string) {
    const configuredToken = process.env.NOTIFICATION_TEST_TOKEN?.trim();
    if (configuredToken && providedToken !== configuredToken) {
      throw new UnauthorizedException('Token administrativo inválido.');
    }

    return this.notificationService.sendTest();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    return this.notificationService.retry(id);
  }
}
