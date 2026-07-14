import { Injectable } from '@nestjs/common';
import { DeviceStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalOrganizations,
      totalCustomers,
      totalSites,
      totalDevices,
      devicesOnline,
      devicesWarning,
      devicesOffline,
      devicesUnknown,
      openIncidents,
      criticalIncidents,
      notificationContacts,
      latestDeviceCheck,
      latestMonitoringRun,
    ] = await this.prisma.$transaction([
      this.prisma.organization.count(),
      this.prisma.customer.count(),
      this.prisma.site.count(),
      this.prisma.device.count(),
      this.prisma.device.count({
        where: { currentStatus: DeviceStatus.ONLINE },
      }),
      this.prisma.device.count({
        where: { currentStatus: DeviceStatus.WARNING },
      }),
      this.prisma.device.count({
        where: { currentStatus: DeviceStatus.OFFLINE },
      }),
      this.prisma.device.count({
        where: { currentStatus: DeviceStatus.UNKNOWN },
      }),
      this.prisma.incident.count({ where: { status: IncidentStatus.OPEN } }),
      this.prisma.incident.count({
        where: {
          severity: IncidentSeverity.CRITICAL,
          status: IncidentStatus.OPEN,
        },
      }),
      this.prisma.notificationContact.count(),
      this.prisma.device.aggregate({
        _max: { lastCheckedAt: true },
      }),
      this.prisma.checkResult.findFirst({
        where: {
          OR: [
            { source: { startsWith: 'BATCH:' } },
            { source: { startsWith: 'AUTOMATIC:' } },
          ],
        },
        orderBy: { checkedAt: 'desc' },
        select: { source: true, checkedAt: true },
      }),
    ]);

    const lastRunChecked = latestMonitoringRun
      ? await this.prisma.checkResult.count({
          where: { source: latestMonitoringRun.source },
        })
      : 0;

    const platformHealthScore =
      totalDevices === 0
        ? 0
        : Math.round(
            (devicesOnline * 100 + devicesWarning * 60 + devicesUnknown * 30) /
              totalDevices,
          );

    return {
      totalOrganizations,
      totalCustomers,
      totalSites,
      totalDevices,
      devicesOnline,
      devicesWarning,
      devicesOffline,
      devicesUnknown,
      openIncidents,
      criticalIncidents,
      notificationContacts,
      activeSubscriptions: 0,
      trialSubscriptions: 0,
      pendingPayments: 0,
      approvedPayments: 0,
      totalApprovedAmount: 0,
      platformHealthScore,
      lastCheckedAt: latestDeviceCheck._max.lastCheckedAt,
      lastMonitoringRunAt: latestMonitoringRun?.checkedAt ?? null,
      lastRunChecked,
    };
  }
}
