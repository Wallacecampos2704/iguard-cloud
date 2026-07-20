import { BadRequestException } from '@nestjs/common';
import { DeviceStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const ORGANIZATION_ID = 'organization-1';

const EXPECTED_DEVICE_SCOPE = {
  organizationId: ORGANIZATION_ID,
  customer: { is: { organizationId: ORGANIZATION_ID } },
  site: { is: { organizationId: ORGANIZATION_ID } },
};

const EXPECTED_INCIDENT_SCOPE = {
  organizationId: ORGANIZATION_ID,
  AND: [
    {
      OR: [
        { deviceId: null },
        { device: { is: { organizationId: ORGANIZATION_ID } } },
      ],
    },
    {
      OR: [
        { customerId: null },
        { customer: { is: { organizationId: ORGANIZATION_ID } } },
      ],
    },
    {
      OR: [
        { siteId: null },
        { site: { is: { organizationId: ORGANIZATION_ID } } },
      ],
    },
  ],
};

describe('DashboardService', () => {
  describe('validação de organização', () => {
    it('rejeita organizationId vazio sem executar nenhuma consulta', async () => {
      const transaction = jest.fn();
      const service = new DashboardService({
        $transaction: transaction,
      } as unknown as PrismaService);

      await expect(service.getSummary('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('rejeita organizationId somente com espaços sem executar nenhuma consulta', async () => {
      const transaction = jest.fn();
      const service = new DashboardService({
        $transaction: transaction,
      } as unknown as PrismaService);

      await expect(service.getSummary('   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('getSummary("organization-1")', () => {
    const checkedAt = new Date('2026-07-14T20:00:00.000Z');
    const startedAt = new Date('2026-07-14T10:00:00.000Z');
    const resolvedAt = new Date('2026-07-14T11:00:00.000Z');

    function buildPrisma() {
      const organizationCount = jest.fn();
      const customerCount = jest.fn();
      const siteCount = jest.fn();
      const deviceCount = jest.fn();
      const deviceAggregate = jest.fn();
      const incidentCount = jest.fn();
      const incidentFindMany = jest.fn();
      const notificationContactCount = jest.fn();
      const checkResultFindFirst = jest.fn();
      const checkResultCount = jest.fn().mockResolvedValue(4);
      const transaction = jest.fn().mockResolvedValue([
        1, // totalOrganizations
        2, // totalCustomers
        3, // totalSites
        4, // totalDevices
        1, // devicesOnline
        1, // devicesWarning
        1, // devicesOffline
        1, // devicesUnknown
        2, // openIncidents
        1, // criticalIncidents
        5, // notificationContacts
        { _max: { lastCheckedAt: checkedAt } }, // latestDeviceCheck
        { source: 'AUTOMATIC:run-1', checkedAt }, // latestMonitoringRun
        1, // resolvedIncidentsToday
        [{ startedAt, resolvedAt }], // resolvedIncidents
      ]);

      const prisma = {
        organization: { count: organizationCount },
        customer: { count: customerCount },
        site: { count: siteCount },
        device: { count: deviceCount, aggregate: deviceAggregate },
        incident: { count: incidentCount, findMany: incidentFindMany },
        notificationContact: { count: notificationContactCount },
        checkResult: {
          findFirst: checkResultFindFirst,
          count: checkResultCount,
        },
        $transaction: transaction,
      } as unknown as PrismaService;

      return {
        prisma,
        organizationCount,
        customerCount,
        siteCount,
        deviceCount,
        deviceAggregate,
        incidentCount,
        incidentFindMany,
        notificationContactCount,
        checkResultFindFirst,
        checkResultCount,
        transaction,
      };
    }

    it('retorna o contrato completo e calcula os indicadores somente com dados da organização', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      const result = await service.getSummary(ORGANIZATION_ID);

      expect(result).toEqual({
        totalOrganizations: 1,
        totalCustomers: 2,
        totalSites: 3,
        totalDevices: 4,
        devicesOnline: 1,
        devicesWarning: 1,
        devicesOffline: 1,
        devicesUnknown: 1,
        openIncidents: 2,
        criticalIncidents: 1,
        resolvedIncidentsToday: 1,
        meanResolutionTimeMs: 3_600_000,
        notificationContacts: 5,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        pendingPayments: 0,
        approvedPayments: 0,
        totalApprovedAmount: 0,
        platformHealthScore: 48,
        lastCheckedAt: checkedAt,
        lastMonitoringRunAt: checkedAt,
        lastRunChecked: 4,
      });
    });

    it('organization.count usa somente id da organização, nunca contagem global', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.organizationCount).toHaveBeenCalledWith({
        where: { id: ORGANIZATION_ID },
      });
    });

    it('customer.count é escopado por organizationId', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.customerCount).toHaveBeenCalledWith({
        where: { organizationId: ORGANIZATION_ID },
      });
    });

    it('site.count é escopado por organizationId e defesa do Customer relacionado', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.siteCount).toHaveBeenCalledWith({
        where: {
          organizationId: ORGANIZATION_ID,
          customer: { is: { organizationId: ORGANIZATION_ID } },
        },
      });
    });

    it('todas as operações de Device contêm organizationId e defesa de Customer/Site', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.deviceCount).toHaveBeenNthCalledWith(1, {
        where: EXPECTED_DEVICE_SCOPE,
      });
      expect(mocks.deviceCount).toHaveBeenNthCalledWith(2, {
        where: { ...EXPECTED_DEVICE_SCOPE, currentStatus: DeviceStatus.ONLINE },
      });
      expect(mocks.deviceCount).toHaveBeenNthCalledWith(3, {
        where: {
          ...EXPECTED_DEVICE_SCOPE,
          currentStatus: DeviceStatus.WARNING,
        },
      });
      expect(mocks.deviceCount).toHaveBeenNthCalledWith(4, {
        where: {
          ...EXPECTED_DEVICE_SCOPE,
          currentStatus: DeviceStatus.OFFLINE,
        },
      });
      expect(mocks.deviceCount).toHaveBeenNthCalledWith(5, {
        where: {
          ...EXPECTED_DEVICE_SCOPE,
          currentStatus: DeviceStatus.UNKNOWN,
        },
      });
      expect(mocks.deviceAggregate).toHaveBeenCalledWith({
        where: EXPECTED_DEVICE_SCOPE,
        _max: { lastCheckedAt: true },
      });
    });

    it('incidentes abertos e críticos usam o escopo da organização com defesa de relações', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.incidentCount).toHaveBeenNthCalledWith(1, {
        where: {
          ...EXPECTED_INCIDENT_SCOPE,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        },
      });
      expect(mocks.incidentCount).toHaveBeenNthCalledWith(2, {
        where: {
          ...EXPECTED_INCIDENT_SCOPE,
          severity: IncidentSeverity.CRITICAL,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        },
      });
    });

    it('incidentes resolvidos hoje são escopados pela organização e pelo início do dia em São Paulo', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      const typedIncidentCount = mocks.incidentCount as jest.Mock<
        unknown,
        [
          {
            where: {
              organizationId: string;
              AND: unknown[];
              status: IncidentStatus;
              resolvedAt: { gte: Date };
            };
          },
        ]
      >;
      const resolvedTodayArgs = typedIncidentCount.mock.calls[2][0];

      expect(resolvedTodayArgs.where.organizationId).toBe(ORGANIZATION_ID);
      expect(resolvedTodayArgs.where.AND).toEqual(EXPECTED_INCIDENT_SCOPE.AND);
      expect(resolvedTodayArgs.where.status).toBe(IncidentStatus.RESOLVED);
      expect(resolvedTodayArgs.where.resolvedAt.gte).toBeInstanceOf(Date);
      expect(resolvedTodayArgs.where.resolvedAt.gte.getUTCHours()).toBe(3);
    });

    it('incident.findMany do tempo médio de resolução é escopado pela organização', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.incidentFindMany).toHaveBeenCalledWith({
        where: {
          ...EXPECTED_INCIDENT_SCOPE,
          status: IncidentStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: { startedAt: true, resolvedAt: true },
      });
    });

    it('notificationContact.count é escopado por organizationId', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.notificationContactCount).toHaveBeenCalledWith({
        where: { organizationId: ORGANIZATION_ID },
      });
    });

    it('a última execução de monitoramento é buscada somente na organização, com defesa do Device', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.checkResultFindFirst).toHaveBeenCalledWith({
        where: {
          organizationId: ORGANIZATION_ID,
          device: { is: { organizationId: ORGANIZATION_ID } },
          OR: [
            { source: { startsWith: 'BATCH:' } },
            { source: { startsWith: 'AUTOMATIC:' } },
          ],
        },
        orderBy: { checkedAt: 'desc' },
        select: { source: true, checkedAt: true },
      });
    });

    it('lastRunChecked conta somente resultados da organização para o source da última execução', async () => {
      const mocks = buildPrisma();
      const service = new DashboardService(mocks.prisma);

      await service.getSummary(ORGANIZATION_ID);

      expect(mocks.checkResultCount).toHaveBeenCalledWith({
        where: {
          organizationId: ORGANIZATION_ID,
          device: { is: { organizationId: ORGANIZATION_ID } },
          source: 'AUTOMATIC:run-1',
        },
      });
    });

    it('quando não há execução de monitoramento, lastRunChecked é 0 e checkResult.count não é chamado', async () => {
      const mocks = buildPrisma();
      mocks.transaction.mockResolvedValue([
        1,
        2,
        3,
        4,
        1,
        1,
        1,
        1,
        2,
        1,
        5,
        { _max: { lastCheckedAt: null } },
        null,
        1,
        [],
      ]);
      const service = new DashboardService(mocks.prisma);

      const result = await service.getSummary(ORGANIZATION_ID);

      expect(result.lastRunChecked).toBe(0);
      expect(result.lastMonitoringRunAt).toBeNull();
      expect(result.lastCheckedAt).toBeNull();
      expect(result.meanResolutionTimeMs).toBe(0);
      expect(mocks.checkResultCount).not.toHaveBeenCalled();
    });
  });
});
