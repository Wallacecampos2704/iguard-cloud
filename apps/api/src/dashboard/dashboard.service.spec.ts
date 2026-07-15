import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('retorna os indicadores de incidentes e calcula a média de resolução', async () => {
    const checkedAt = new Date('2026-07-14T20:00:00.000Z');
    const startedAt = new Date('2026-07-14T10:00:00.000Z');
    const resolvedAt = new Date('2026-07-14T11:00:00.000Z');
    const incidentCount = jest.fn((args: unknown) => args);
    const transaction = jest
      .fn()
      .mockResolvedValue([
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
        0,
        { _max: { lastCheckedAt: checkedAt } },
        { source: 'AUTOMATIC:run-1', checkedAt },
        1,
        [{ startedAt, resolvedAt }],
      ]);
    const service = new DashboardService({
      organization: { count: jest.fn() },
      customer: { count: jest.fn() },
      site: { count: jest.fn() },
      device: { count: jest.fn(), aggregate: jest.fn() },
      incident: {
        count: incidentCount,
        findMany: jest.fn(),
      },
      notificationContact: { count: jest.fn() },
      checkResult: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(4),
      },
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(service.getSummary()).resolves.toEqual(
      expect.objectContaining({
        openIncidents: 2,
        criticalIncidents: 1,
        resolvedIncidentsToday: 1,
        meanResolutionTimeMs: 3_600_000,
        lastRunChecked: 4,
      }),
    );
    expect(incidentCount).toHaveBeenNthCalledWith(1, {
      where: {
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
        },
      },
    });
    expect(incidentCount).toHaveBeenNthCalledWith(2, {
      where: {
        severity: IncidentSeverity.CRITICAL,
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED],
        },
      },
    });
    const resolvedTodayArgs = incidentCount.mock.calls[2][0] as {
      where: {
        status: IncidentStatus;
        resolvedAt: { gte: Date };
      };
    };
    expect(resolvedTodayArgs.where.status).toBe(IncidentStatus.RESOLVED);
    expect(resolvedTodayArgs.where.resolvedAt.gte).toBeInstanceOf(Date);
    expect(resolvedTodayArgs.where.resolvedAt.gte.getUTCHours()).toBe(3);
  });
});
