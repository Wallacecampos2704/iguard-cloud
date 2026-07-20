import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceStatus,
  DeviceType,
  IncidentCategory,
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type DeviceStatusChangeInput = {
  organizationId: string;
  deviceId: string;
  previousStatus: DeviceStatus;
  currentStatus: DeviceStatus;
  checkedAt: Date;
  source: string;
};

export type IncidentLifecycleResult = {
  incidentId: string;
  action: 'OPENED' | 'UPDATED' | 'RESOLVED';
};

const ACTIVE_INCIDENT_STATUSES = [
  IncidentStatus.OPEN,
  IncidentStatus.ACKNOWLEDGED,
];

const INCIDENT_INCLUDE = {
  device: { include: { customer: true, site: true } },
  customer: true,
  site: true,
} satisfies Prisma.IncidentInclude;

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Única validação de organizationId para os métodos de usuário e para o
   * ciclo interno — não há caso legítimo de um Device persistido sem
   * organização, então o ciclo automático também passa por aqui.
   */
  private requireOrganizationId(organizationId: string): string {
    if (!organizationId || !organizationId.trim()) {
      throw new BadRequestException('Organização inválida.');
    }
    return organizationId;
  }

  /**
   * Escopo multi-tenant reutilizável. Além do organizationId direto do
   * Incident, aplica defesa em profundidade nas relações opcionais
   * (device/customer/site): se a relação existir, o registro relacionado
   * precisa pertencer à mesma organização, evitando que uma inconsistência
   * de dados exponha um Incident através de uma relação de outra empresa.
   */
  private buildOrganizationScope(
    organizationId: string,
  ): Prisma.IncidentWhereInput {
    return {
      organizationId,
      AND: [
        {
          OR: [{ deviceId: null }, { device: { is: { organizationId } } }],
        },
        {
          OR: [{ customerId: null }, { customer: { is: { organizationId } } }],
        },
        {
          OR: [{ siteId: null }, { site: { is: { organizationId } } }],
        },
      ],
    };
  }

  async findAll(organizationId: string) {
    this.requireOrganizationId(organizationId);

    return this.prisma.incident.findMany({
      where: this.buildOrganizationScope(organizationId),
      include: INCIDENT_INCLUDE,
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const incident = await this.prisma.incident.findFirst({
      where: { id, ...this.buildOrganizationScope(organizationId) },
      include: INCIDENT_INCLUDE,
    });

    if (!incident) {
      throw new NotFoundException('Incidente não encontrado.');
    }

    return incident;
  }

  async acknowledge(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const incident = await this.findOne(organizationId, id);

    if (incident.status !== IncidentStatus.OPEN) {
      return incident;
    }

    await this.prisma.incident.updateMany({
      where: {
        id,
        ...this.buildOrganizationScope(organizationId),
        status: IncidentStatus.OPEN,
      },
      data: { status: IncidentStatus.ACKNOWLEDGED },
    });

    return this.findOne(organizationId, id);
  }

  async resolve(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const incident = await this.findOne(organizationId, id);

    if (incident.status === IncidentStatus.RESOLVED) {
      return incident;
    }

    const resolvedAt = new Date();
    await this.prisma.incident.updateMany({
      where: {
        id,
        ...this.buildOrganizationScope(organizationId),
        status: { in: ACTIVE_INCIDENT_STATUSES },
      },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt,
        lastSeenAt: resolvedAt,
      },
    });

    return this.findOne(organizationId, id);
  }

  async handleDeviceStatusChange(
    transaction: Prisma.TransactionClient,
    input: DeviceStatusChangeInput,
  ): Promise<IncidentLifecycleResult | null> {
    const organizationId = this.requireOrganizationId(input.organizationId);

    const isUnhealthy =
      input.currentStatus === DeviceStatus.OFFLINE ||
      input.currentStatus === DeviceStatus.WARNING;

    if (!isUnhealthy && input.currentStatus !== DeviceStatus.ONLINE) {
      return null;
    }

    const activeIncident = await transaction.incident.findFirst({
      where: {
        organizationId,
        deviceId: input.deviceId,
        status: { in: ACTIVE_INCIDENT_STATUSES },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (isUnhealthy) {
      if (activeIncident) {
        const touchedIncident = await transaction.incident.updateMany({
          where: {
            id: activeIncident.id,
            organizationId,
            status: { in: ACTIVE_INCIDENT_STATUSES },
          },
          data: {
            lastSeenAt: input.checkedAt,
            currentStatus: input.currentStatus,
            ...(input.currentStatus === DeviceStatus.OFFLINE
              ? { severity: IncidentSeverity.CRITICAL }
              : {}),
          },
        });
        if (touchedIncident.count === 1) {
          return { incidentId: activeIncident.id, action: 'UPDATED' };
        }
      }

      if (input.previousStatus === input.currentStatus) {
        return null;
      }

      const device = await transaction.device.findFirst({
        where: { id: input.deviceId, organizationId },
        select: {
          organizationId: true,
          customerId: true,
          siteId: true,
          name: true,
          deviceType: true,
        },
      });
      if (!device) {
        throw new NotFoundException('Equipamento não encontrado.');
      }

      const isOffline = input.currentStatus === DeviceStatus.OFFLINE;
      const incident = await transaction.incident.create({
        data: {
          organizationId: device.organizationId,
          customerId: device.customerId,
          siteId: device.siteId,
          deviceId: input.deviceId,
          title: isOffline
            ? `Equipamento ${device.name} offline`
            : `Equipamento ${device.name} em atenção`,
          description: `Status alterado de ${input.previousStatus} para ${input.currentStatus}.`,
          severity: isOffline
            ? IncidentSeverity.CRITICAL
            : IncidentSeverity.MEDIUM,
          status: IncidentStatus.OPEN,
          previousStatus: input.previousStatus,
          currentStatus: input.currentStatus,
          startedAt: input.checkedAt,
          lastSeenAt: input.checkedAt,
          source: this.mapSource(input.source),
          category: this.mapCategory(device.deviceType),
        },
        select: { id: true },
      });

      return { incidentId: incident.id, action: 'OPENED' };
    }

    if (!activeIncident) {
      return null;
    }

    const resolved = await transaction.incident.updateMany({
      where: {
        id: activeIncident.id,
        organizationId,
        status: { in: ACTIVE_INCIDENT_STATUSES },
      },
      data: {
        status: IncidentStatus.RESOLVED,
        currentStatus: DeviceStatus.ONLINE,
        resolvedAt: input.checkedAt,
        lastSeenAt: input.checkedAt,
      },
    });

    return resolved.count === 1
      ? { incidentId: activeIncident.id, action: 'RESOLVED' }
      : null;
  }

  private mapSource(source: string) {
    if (source.startsWith('AUTOMATIC')) {
      return IncidentSource.MONITORING_CRON;
    }
    if (source.startsWith('BATCH')) {
      return IncidentSource.BATCH_CHECK;
    }
    return IncidentSource.MANUAL_CHECK;
  }

  private mapCategory(deviceType: DeviceType) {
    const categories: Partial<Record<DeviceType, IncidentCategory>> = {
      [DeviceType.INTERNET_LINK]: IncidentCategory.INTERNET,
      [DeviceType.CAMERA_IP]: IncidentCategory.CAMERA,
      [DeviceType.DVR_NVR]: IncidentCategory.DVR,
      [DeviceType.FACIAL]: IncidentCategory.FACIAL,
      [DeviceType.ROUTER]: IncidentCategory.ROUTER,
      [DeviceType.MIKROTIK]: IncidentCategory.ROUTER,
      [DeviceType.SERVER]: IncidentCategory.SERVER,
    };

    return categories[deviceType] ?? IncidentCategory.DEVICE;
  }
}
