import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationService } from './notification.service';
import type { NotificationListQuery } from './notification.service';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId || !user.organizationId.trim()) {
      throw new ForbiddenException(
        'Esta ação requer uma organização associada.',
      );
    }
    return user.organizationId;
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationListQuery,
  ) {
    return this.notificationService.findAll(
      this.requireOrganizationId(user),
      query,
    );
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getStats(this.requireOrganizationId(user));
  }

  @Post('test')
  test(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-notification-test-token') providedToken?: string,
  ) {
    const configuredToken = process.env.NOTIFICATION_TEST_TOKEN?.trim();
    if (configuredToken && providedToken !== configuredToken) {
      throw new UnauthorizedException('Token administrativo inválido.');
    }

    return this.notificationService.sendTest(this.requireOrganizationId(user));
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationService.findOne(
      this.requireOrganizationId(user),
      id,
    );
  }

  @Post(':id/retry')
  retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationService.retry(this.requireOrganizationId(user), id);
  }
}
