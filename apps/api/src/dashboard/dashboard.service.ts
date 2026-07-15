import { Injectable } from '@nestjs/common';
import { DeviceStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DASHBOARD_TIME_ZONE = 'America/Sao_Paulo';

type DatePart = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: DatePart) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getDateParts(date, timeZone);

  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) -
    Math.floor(date.getTime() / 1000) * 1000
  );
}

function getStartOfTodayInSaoPaulo(now = new Date()) {
  const today = getDateParts(now, DASHBOARD_TIME_ZONE);
  const localMidnightAsUtc = Date.UTC(today.year, today.month - 1, today.day);
  let startOfDay = localMidnightAsUtc;

  // Duas iterações acomodam eventuais transições de horário na timezone.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    startOfDay =
      localMidnightAsUtc -
      getTimeZoneOffsetMs(new Date(startOfDay), DASHBOARD_TIME_ZONE);
  }

  return new Date(startOfDay);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const startOfToday = getStartOfTodayInSaoPaulo();

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
      resolvedIncidentsToday,
      resolvedIncidents,
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
      this.prisma.incident.count({
        where: {
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
          },
        },
      }),
      this.prisma.incident.count({
        where: {
          severity: IncidentSeverity.CRITICAL,
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
          },
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
      this.prisma.incident.count({
        where: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: { gte: startOfToday },
        },
      }),
      this.prisma.incident.findMany({
        where: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: { startedAt: true, resolvedAt: true },
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

    const totalResolutionTimeMs = resolvedIncidents.reduce(
      (total, incident) =>
        total +
        ((incident.resolvedAt?.getTime() ?? incident.startedAt.getTime()) -
          incident.startedAt.getTime()),
      0,
    );
    const meanResolutionTimeMs =
      resolvedIncidents.length === 0
        ? 0
        : Math.round(totalResolutionTimeMs / resolvedIncidents.length);

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
      resolvedIncidentsToday,
      meanResolutionTimeMs,
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
