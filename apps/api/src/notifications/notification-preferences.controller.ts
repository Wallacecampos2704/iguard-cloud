import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationService } from './notification.service';
import type { NotificationPreferenceInput } from './notification.service';

@Controller('notification-preferences')
@UseGuards(SessionGuard)
export class NotificationPreferencesController {
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
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') customerId?: string,
  ) {
    return this.notificationService.getPreferences(
      this.requireOrganizationId(user),
      customerId,
    );
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: NotificationPreferenceInput,
  ) {
    return this.notificationService.updatePreferences(
      this.requireOrganizationId(user),
      input,
    );
  }
}
