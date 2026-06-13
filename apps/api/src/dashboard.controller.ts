import { Controller, Get } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  @Get('summary')
  getSummary() {
    return {
      monitoredDevices: 128,
      online: 104,
      attention: 12,
      offline: 12,
      openIncidents: 8,
      uptime: '99.82%',
      lastUpdated: new Date().toISOString(),
    };
  }
}
