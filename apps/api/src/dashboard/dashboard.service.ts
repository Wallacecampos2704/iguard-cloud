import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DeviceStatus,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from '@prisma/client';
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

  private requireOrganizationId(organizationId: string): string {
    if (!organizationId || !organizationId.trim()) {
      throw new BadRequestException('Organização inválida.');
    }
    return organizationId;
  }

  private buildSiteScope(organizationId: string): Prisma.SiteWhereInput {
    return {
      organizationId,
      customer: { is: { organizationId } },
    };
  }

  private buildDeviceScope(organizationId: string): Prisma.DeviceWhereInput {
    return {
      organizationId,
      customer: { is: { organizationId } },
      site: { is: { organizationId } },
    };
  }

  private buildIncidentScope(
    organizationId: string,
  ): Prisma.IncidentWhereInput {
    return {
      organizationId,
      AND: [
        { OR: [{ deviceId: null }, { device: { is: { organizationId } } }] },
        {
          OR: [{ customerId: null }, { customer: { is: { organizationId } } }],
        },
        { OR: [{ siteId: null }, { site: { is: { organizationId } } }] },
      ],
    };
  }

  private buildCheckResultScope(
    organizationId: string,
  ): Prisma.CheckResultWhereInput {
    return {
      organizationId,
      device: { is: { organizationId } },
    };
  }

  async getSummary(organizationId: string) {
    this.requireOrganizationId(organizationId);

    const startOfToday = getStartOfTodayInSaoPaulo();
    const siteScope = this.buildSiteScope(organizationId);
    const deviceScope = this.buildDeviceScope(organizationId);
    const incidentScope = this.buildIncidentScope(organizationId);
    const checkResultScope = this.buildCheckResultScope(organizationId);

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
      this.prisma.organization.count({ where: { id: organizationId } }),
      this.prisma.customer.count({ where: { organizationId } }),
      this.prisma.site.count({ where: siteScope }),
      this.prisma.device.count({ where: deviceScope }),
      this.prisma.device.count({
        where: { ...deviceScope, currentStatus: DeviceStatus.ONLINE },
      }),
      this.prisma.device.count({
        where: { ...deviceScope, currentStatus: DeviceStatus.WARNING },
      }),
      this.prisma.device.count({
        where: { ...deviceScope, currentStatus: DeviceStatus.OFFLINE },
      }),
      this.prisma.device.count({
        where: { ...deviceScope, currentStatus: DeviceStatus.UNKNOWN },
      }),
      this.prisma.incident.count({
        where: {
          ...incidentScope,
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
          },
        },
      }),
      this.prisma.incident.count({
        where: {
          ...incidentScope,
          severity: IncidentSeverity.CRITICAL,
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
          },
        },
      }),
      this.prisma.notificationContact.count({ where: { organizationId } }),
      this.prisma.device.aggregate({
        where: deviceScope,
        _max: { lastCheckedAt: true },
      }),
      this.prisma.checkResult.findFirst({
        where: {
          ...checkResultScope,
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
          ...incidentScope,
          status: IncidentStatus.RESOLVED,
          resolvedAt: { gte: startOfToday },
        },
      }),
      this.prisma.incident.findMany({
        where: {
          ...incidentScope,
          status: IncidentStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: { startedAt: true, resolvedAt: true },
      }),
    ]);

    const lastRunChecked = latestMonitoringRun
      ? await this.prisma.checkResult.count({
          where: {
            ...checkResultScope,
            source: latestMonitoringRun.source,
          },
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
