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
import { IncidentsService } from './incidents.service';

describe('IncidentsService', () => {
  const checkedAt = new Date('2026-07-14T21:00:00.000Z');

  const statusChange = (
    previousStatus: DeviceStatus,
    currentStatus: DeviceStatus,
    source = 'MANUAL',
  ) => ({
    deviceId: 'device-1',
    previousStatus,
    currentStatus,
    checkedAt,
    source,
  });

  const createTransaction = () => ({
    device: {
      findUnique: jest.fn().mockResolvedValue({
        organizationId: 'organization-1',
        customerId: 'customer-1',
        siteId: 'site-1',
        name: 'Portaria',
        deviceType: DeviceType.FACIAL,
      }),
    },
    incident: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'created-incident' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  });

  it('abre incidente crítico quando o equipamento fica offline', async () => {
    const transaction = createTransaction();
    transaction.incident.findFirst.mockResolvedValue(null);
    const service = new IncidentsService({} as PrismaService);

    await service.handleDeviceStatusChange(
      transaction as unknown as Prisma.TransactionClient,
      statusChange(DeviceStatus.ONLINE, DeviceStatus.OFFLINE, 'BATCH:run-1'),
    );

    expect(transaction.incident.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'organization-1',
        customerId: 'customer-1',
        siteId: 'site-1',
        deviceId: 'device-1',
        title: 'Equipamento Portaria offline',
        description: 'Status alterado de ONLINE para OFFLINE.',
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        previousStatus: DeviceStatus.ONLINE,
        currentStatus: DeviceStatus.OFFLINE,
        source: IncidentSource.BATCH_CHECK,
        category: IncidentCategory.FACIAL,
        startedAt: checkedAt,
        lastSeenAt: checkedAt,
      },
    });
  });

  it('abre incidente médio quando o equipamento entra em warning', async () => {
    const transaction = createTransaction();
    transaction.incident.findFirst.mockResolvedValue(null);
    const service = new IncidentsService({} as PrismaService);

    await service.handleDeviceStatusChange(
      transaction as unknown as Prisma.TransactionClient,
      statusChange(
        DeviceStatus.ONLINE,
        DeviceStatus.WARNING,
        'AUTOMATIC:run-1',
      ),
    );

    expect(transaction.incident.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'organization-1',
        customerId: 'customer-1',
        siteId: 'site-1',
        deviceId: 'device-1',
        title: 'Equipamento Portaria em atenção',
        description: 'Status alterado de ONLINE para WARNING.',
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.OPEN,
        previousStatus: DeviceStatus.ONLINE,
        currentStatus: DeviceStatus.WARNING,
        source: IncidentSource.MONITORING_CRON,
        category: IncidentCategory.FACIAL,
        startedAt: checkedAt,
        lastSeenAt: checkedAt,
      },
    });
  });

  it('atualiza apenas lastSeenAt quando já existe incidente ativo', async () => {
    const transaction = createTransaction();
    transaction.incident.findFirst.mockResolvedValue({ id: 'incident-1' });
    const service = new IncidentsService({} as PrismaService);

    await service.handleDeviceStatusChange(
      transaction as unknown as Prisma.TransactionClient,
      statusChange(DeviceStatus.OFFLINE, DeviceStatus.OFFLINE),
    );

    expect(transaction.incident.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'incident-1',
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
        },
      },
      data: { lastSeenAt: checkedAt },
    });
    expect(transaction.incident.create).not.toHaveBeenCalled();
    expect(transaction.device.findUnique).not.toHaveBeenCalled();
  });

  it('não cria incidente sem mudança real de status', async () => {
    const transaction = createTransaction();
    transaction.incident.findFirst.mockResolvedValue(null);
    const service = new IncidentsService({} as PrismaService);

    await expect(
      service.handleDeviceStatusChange(
        transaction as unknown as Prisma.TransactionClient,
        statusChange(DeviceStatus.WARNING, DeviceStatus.WARNING),
      ),
    ).resolves.toBeNull();
    expect(transaction.incident.create).not.toHaveBeenCalled();
  });

  it('resolve o incidente ativo quando o equipamento volta online', async () => {
    const transaction = createTransaction();
    transaction.incident.findFirst.mockResolvedValue({ id: 'incident-1' });
    const service = new IncidentsService({} as PrismaService);

    await service.handleDeviceStatusChange(
      transaction as unknown as Prisma.TransactionClient,
      statusChange(
        DeviceStatus.OFFLINE,
        DeviceStatus.ONLINE,
        'AUTOMATIC:run-1',
      ),
    );

    expect(transaction.incident.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'incident-1',
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
        },
      },
      data: {
        status: IncidentStatus.RESOLVED,
        currentStatus: DeviceStatus.ONLINE,
        resolvedAt: checkedAt,
        lastSeenAt: checkedAt,
      },
    });
  });

  it('reconhece somente um incidente que ainda está aberto', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'incident-1', status: IncidentStatus.OPEN })
      .mockResolvedValueOnce({
        id: 'incident-1',
        status: IncidentStatus.ACKNOWLEDGED,
      });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new IncidentsService({
      incident: { findUnique, updateMany },
    } as unknown as PrismaService);

    await expect(service.acknowledge('incident-1')).resolves.toEqual({
      id: 'incident-1',
      status: IncidentStatus.ACKNOWLEDGED,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'incident-1', status: IncidentStatus.OPEN },
      data: { status: IncidentStatus.ACKNOWLEDGED },
    });
  });

  it('resolve manualmente somente se o incidente ainda estiver ativo', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'incident-1', status: IncidentStatus.OPEN })
      .mockResolvedValueOnce({
        id: 'incident-1',
        status: IncidentStatus.RESOLVED,
      });
    type ResolveUpdateArgs = {
      where: {
        id: string;
        status: { in: IncidentStatus[] };
      };
      data: {
        status: IncidentStatus;
        resolvedAt: Date;
        lastSeenAt: Date;
      };
    };
    const updateMany = jest
      .fn((args: ResolveUpdateArgs) => args)
      .mockResolvedValue({ count: 1 });
    const service = new IncidentsService({
      incident: { findUnique, updateMany },
    } as unknown as PrismaService);

    await expect(service.resolve('incident-1')).resolves.toEqual({
      id: 'incident-1',
      status: IncidentStatus.RESOLVED,
    });
    const updateArgs = updateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({
      id: 'incident-1',
      status: {
        in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
      },
    });
    expect(updateArgs.data.status).toBe(IncidentStatus.RESOLVED);
    expect(updateArgs.data.resolvedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.lastSeenAt).toEqual(updateArgs.data.resolvedAt);
  });
});
