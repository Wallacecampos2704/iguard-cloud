import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DevicesService } from './devices.service';

type CreateDeviceBody = {
  name: string;
  deviceType: string;
  host: string;
  port?: number | null;
  currentStatus?: string;
  checkType?: string;
};

type UpdateDeviceBody = Partial<CreateDeviceBody>;

@Controller('devices')
@UseGuards(SessionGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId || !user.organizationId.trim()) {
      throw new ForbiddenException(
        'Esta ação requer uma organização associada.',
      );
    }
    return user.organizationId;
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.findAll(this.requireOrganizationId(user));
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDeviceBody,
  ) {
    return this.devicesService.create(this.requireOrganizationId(user), body);
  }

  @Post('check-all')
  checkAll(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.checkAllForOrganization(
      this.requireOrganizationId(user),
    );
  }

  @Post('monitoring/run')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER)
  runMonitoring() {
    return this.devicesService.checkAllOrganizationsInternal('AUTOMATIC');
  }

  @Post(':id/check')
  check(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devicesService.check(this.requireOrganizationId(user), id);
  }

  @Get(':id/checks')
  getChecks(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devicesService.getChecks(this.requireOrganizationId(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateDeviceBody,
  ) {
    return this.devicesService.update(
      this.requireOrganizationId(user),
      id,
      body,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devicesService.remove(this.requireOrganizationId(user), id);
  }
}
