import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@UseGuards(SessionGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

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
    return this.incidentsService.findAll(this.requireOrganizationId(user));
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.incidentsService.findOne(this.requireOrganizationId(user), id);
  }

  @Post(':id/acknowledge')
  acknowledge(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.incidentsService.acknowledge(
      this.requireOrganizationId(user),
      id,
    );
  }

  @Post(':id/resolve')
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.incidentsService.resolve(this.requireOrganizationId(user), id);
  }
}
