import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const INCIDENT_INCLUDE = {
  device: { include: { customer: true, site: true } },
  customer: true,
  site: true,
};

function organizationScope(organizationId: string) {
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

describe('IncidentsService', () => {
  describe('ciclo interno — handleDeviceStatusChange', () => {
    const checkedAt = new Date('2026-07-14T21:00:00.000Z');

    const statusChange = (
      previousStatus: DeviceStatus,
      currentStatus: DeviceStatus,
      source = 'MANUAL',
    ) => ({
      organizationId: 'organization-1',
      deviceId: 'device-1',
      previousStatus,
      currentStatus,
      checkedAt,
      source,
    });

    const createTransaction = () => ({
      device: {
        findFirst: jest.fn().mockResolvedValue({
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

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(
            DeviceStatus.ONLINE,
            DeviceStatus.OFFLINE,
            'BATCH:run-1',
          ),
        ),
      ).resolves.toEqual({ incidentId: 'created-incident', action: 'OPENED' });

      expect(transaction.incident.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'organization-1',
            deviceId: 'device-1',
            status: {
              in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
            },
          },
        }),
      );
      expect(transaction.device.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1', organizationId: 'organization-1' },
        }),
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
        select: { id: true },
      });
    });

    it('abre incidente médio quando o equipamento entra em warning', async () => {
      const transaction = createTransaction();
      transaction.incident.findFirst.mockResolvedValue(null);
      const service = new IncidentsService({} as PrismaService);

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(
            DeviceStatus.ONLINE,
            DeviceStatus.WARNING,
            'AUTOMATIC:run-1',
          ),
        ),
      ).resolves.toEqual({ incidentId: 'created-incident', action: 'OPENED' });

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
        select: { id: true },
      });
    });

    it('atualiza apenas lastSeenAt quando já existe incidente ativo', async () => {
      const transaction = createTransaction();
      transaction.incident.findFirst.mockResolvedValue({ id: 'incident-1' });
      const service = new IncidentsService({} as PrismaService);

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(DeviceStatus.OFFLINE, DeviceStatus.OFFLINE),
        ),
      ).resolves.toEqual({ incidentId: 'incident-1', action: 'UPDATED' });

      expect(transaction.incident.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'incident-1',
          organizationId: 'organization-1',
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
          },
        },
        data: {
          lastSeenAt: checkedAt,
          currentStatus: DeviceStatus.OFFLINE,
          severity: IncidentSeverity.CRITICAL,
        },
      });
      expect(transaction.incident.create).not.toHaveBeenCalled();
      expect(transaction.device.findFirst).not.toHaveBeenCalled();
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

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(
            DeviceStatus.OFFLINE,
            DeviceStatus.ONLINE,
            'AUTOMATIC:run-1',
          ),
        ),
      ).resolves.toEqual({ incidentId: 'incident-1', action: 'RESOLVED' });

      expect(transaction.incident.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'incident-1',
          organizationId: 'organization-1',
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

    it('organizationId incompatível com o Device não encontra o equipamento (findFirst id + organizationId)', async () => {
      const transaction = createTransaction();
      transaction.incident.findFirst.mockResolvedValue(null);
      transaction.device.findFirst.mockResolvedValue(null);
      const service = new IncidentsService({} as PrismaService);

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(DeviceStatus.ONLINE, DeviceStatus.OFFLINE),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ausência de Device produz NotFoundException', async () => {
      const transaction = createTransaction();
      transaction.incident.findFirst.mockResolvedValue(null);
      transaction.device.findFirst.mockResolvedValue(null);
      const service = new IncidentsService({} as PrismaService);

      await expect(
        service.handleDeviceStatusChange(
          transaction as unknown as Prisma.TransactionClient,
          statusChange(DeviceStatus.ONLINE, DeviceStatus.WARNING),
        ),
      ).rejects.toThrow('Equipamento não encontrado.');
    });

    it('rejeita organizationId vazio ou somente espaços', async () => {
      const service = new IncidentsService({} as PrismaService);

      for (const invalid of ['', '   ']) {
        const transaction = createTransaction();
        await expect(
          service.handleDeviceStatusChange(
            transaction as unknown as Prisma.TransactionClient,
            {
              ...statusChange(DeviceStatus.ONLINE, DeviceStatus.OFFLINE),
              organizationId: invalid,
            },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('findAll', () => {
    it('valida organizationId e aplica o escopo da organização no where', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = new IncidentsService({
        incident: { findMany },
      } as unknown as PrismaService);

      await service.findAll('organization-1');

      expect(findMany).toHaveBeenCalledWith({
        where: organizationScope('organization-1'),
        include: INCIDENT_INCLUDE,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('não lista incidentes globalmente: cada organização recebe um where distinto', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = new IncidentsService({
        incident: { findMany },
      } as unknown as PrismaService);

      await service.findAll('organization-1');
      await service.findAll('organization-2');

      const calls = (
        findMany as jest.Mock<unknown, [{ where: { organizationId: string } }]>
      ).mock.calls;
      expect(calls[0][0].where.organizationId).toBe('organization-1');
      expect(calls[1][0].where.organizationId).toBe('organization-2');
    });
  });

  describe('findOne', () => {
    it('usa findFirst com id + escopo da organização, não findUnique', async () => {
      const findFirst = jest.fn().mockResolvedValue({ id: 'incident-1' });
      const findUnique = jest.fn();
      const service = new IncidentsService({
        incident: { findFirst, findUnique },
      } as unknown as PrismaService);

      await service.findOne('organization-1', 'incident-1');

      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: 'incident-1',
          ...organizationScope('organization-1'),
        },
        include: INCIDENT_INCLUDE,
      });
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('incidente de outra organização resulta na mesma NotFoundException de um id inexistente', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const service = new IncidentsService({
        incident: { findFirst },
      } as unknown as PrismaService);

      await expect(
        service.findOne('organization-1', 'incident-de-outra-org'),
      ).rejects.toThrow('Incidente não encontrado.');
    });
  });

  describe('acknowledge', () => {
    it('chama findOne e depois atualiza com id + organizationId + status OPEN', async () => {
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.OPEN,
        })
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.ACKNOWLEDGED,
        });
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.acknowledge('organization-1', 'incident-1'),
      ).resolves.toEqual({
        id: 'incident-1',
        status: IncidentStatus.ACKNOWLEDGED,
      });

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: 'incident-1',
          ...organizationScope('organization-1'),
          status: IncidentStatus.OPEN,
        },
        data: { status: IncidentStatus.ACKNOWLEDGED },
      });
      expect(findFirst).toHaveBeenCalledTimes(2);
    });

    it('status diferente de OPEN não executa update e devolve o incidente atual', async () => {
      const findFirst = jest.fn().mockResolvedValue({
        id: 'incident-1',
        status: IncidentStatus.ACKNOWLEDGED,
      });
      const updateMany = jest.fn();
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.acknowledge('organization-1', 'incident-1'),
      ).resolves.toEqual({
        id: 'incident-1',
        status: IncidentStatus.ACKNOWLEDGED,
      });
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('incidente de outra organização não é alterado', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const updateMany = jest.fn();
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.acknowledge('organization-1', 'incident-de-outra-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('corrida: updateMany com count 0 ainda retorna o estado atual via findOne, sem quebrar o fluxo', async () => {
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.OPEN,
        })
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.ACKNOWLEDGED,
        });
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.acknowledge('organization-1', 'incident-1'),
      ).resolves.toEqual({
        id: 'incident-1',
        status: IncidentStatus.ACKNOWLEDGED,
      });
    });
  });

  describe('resolve', () => {
    it('chama findOne e depois atualiza com id + organizationId + status ativo', async () => {
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.OPEN,
        })
        .mockResolvedValueOnce({
          id: 'incident-1',
          status: IncidentStatus.RESOLVED,
        });
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.resolve('organization-1', 'incident-1'),
      ).resolves.toEqual({ id: 'incident-1', status: IncidentStatus.RESOLVED });

      const typedUpdateMany = updateMany as jest.Mock<
        unknown,
        [
          {
            where: unknown;
            data: {
              status: IncidentStatus;
              resolvedAt: Date;
              lastSeenAt: Date;
            };
          },
        ]
      >;
      const call = typedUpdateMany.mock.calls[0][0];
      expect(call.where).toEqual({
        id: 'incident-1',
        ...organizationScope('organization-1'),
        status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
      });
      expect(call.data.status).toBe(IncidentStatus.RESOLVED);
      expect(call.data.resolvedAt).toBeInstanceOf(Date);
      expect(call.data.lastSeenAt).toEqual(call.data.resolvedAt);
    });

    it('incidente já resolvido não executa update', async () => {
      const findFirst = jest.fn().mockResolvedValue({
        id: 'incident-1',
        status: IncidentStatus.RESOLVED,
      });
      const updateMany = jest.fn();
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.resolve('organization-1', 'incident-1'),
      ).resolves.toEqual({ id: 'incident-1', status: IncidentStatus.RESOLVED });
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('incidente de outra organização não é alterado', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const updateMany = jest.fn();
      const service = new IncidentsService({
        incident: { findFirst, updateMany },
      } as unknown as PrismaService);

      await expect(
        service.resolve('organization-1', 'incident-de-outra-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(updateMany).not.toHaveBeenCalled();
    });
  });

  describe('organizationId inválido nos métodos de usuário', () => {
    const invalidValues = ['', '   '];

    it.each(invalidValues)('findAll rejeita "%s"', async (value) => {
      const service = new IncidentsService({} as PrismaService);
      await expect(service.findAll(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each(invalidValues)('findOne rejeita "%s"', async (value) => {
      const service = new IncidentsService({} as PrismaService);
      await expect(service.findOne(value, 'incident-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each(invalidValues)('acknowledge rejeita "%s"', async (value) => {
      const service = new IncidentsService({} as PrismaService);
      await expect(
        service.acknowledge(value, 'incident-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each(invalidValues)('resolve rejeita "%s"', async (value) => {
      const service = new IncidentsService({} as PrismaService);
      await expect(service.resolve(value, 'incident-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
