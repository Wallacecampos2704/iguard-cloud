import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId || !user.organizationId.trim()) {
      throw new ForbiddenException(
        'Esta ação requer uma organização associada.',
      );
    }
    return user.organizationId;
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(this.requireOrganizationId(user));
  }
}
