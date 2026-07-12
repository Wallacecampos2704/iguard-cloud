import { Injectable } from '@nestjs/common';
import {
  DeviceStatus,
  IncidentSeverity,
  IncidentStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
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
      activeSubscriptions,
      trialSubscriptions,
      pendingPayments,
      approvedPayments,
      approvedAmount,
    ] = await this.prisma.$transaction([
      this.prisma.organization.count(),
      this.prisma.customer.count(),
      this.prisma.site.count(),
      this.prisma.device.count(),
      this.prisma.device.count({ where: { currentStatus: DeviceStatus.ONLINE } }),
      this.prisma.device.count({ where: { currentStatus: DeviceStatus.WARNING } }),
      this.prisma.device.count({ where: { currentStatus: DeviceStatus.OFFLINE } }),
      this.prisma.device.count({ where: { currentStatus: DeviceStatus.UNKNOWN } }),
      this.prisma.incident.count({ where: { status: IncidentStatus.OPEN } }),
      this.prisma.incident.count({
        where: {
          severity: IncidentSeverity.CRITICAL,
          status: IncidentStatus.OPEN,
        },
      }),
      this.prisma.notificationContact.count(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.APPROVED } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.APPROVED },
        _sum: { amount: true },
      }),
    ]);

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
      activeSubscriptions,
      trialSubscriptions,
      pendingPayments,
      approvedPayments,
      totalApprovedAmount: Number(approvedAmount._sum.amount ?? 0),
      platformHealthScore,
    };
  }
}
