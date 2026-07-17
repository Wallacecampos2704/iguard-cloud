import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { NotificationPreferenceInput } from './notification.service';

@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findOne(@Query('customerId') customerId?: string) {
    return this.notificationService.getPreferences(undefined, customerId);
  }

  @Put()
  update(@Body() input: NotificationPreferenceInput) {
    return this.notificationService.updatePreferences(input);
  }
}
