import { CheckType, DeviceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from './devices.service';

type TestableDevicesService = {
  checkTimeoutMs: number;
  checkConcurrency: number;
  normalizeAddress: (
    host: string,
    port?: number | null,
  ) => { host: string; port: number | null; protocol?: CheckType };
  performHttpCheck: (
    host: string,
    port: number | null,
    checkType: CheckType,
  ) => Promise<{ status: DeviceStatus; responseTimeMs: number }>;
};

describe('DevicesService', () => {
  const service = new DevicesService({} as PrismaService);
  const testable = service as unknown as TestableDevicesService;

  afterEach(() => jest.restoreAllMocks());

  it('normaliza URL HTTP extraindo host, porta e protocolo', () => {
    expect(
      testable.normalizeAddress(
        'http://clientevpn.sentinelaconect.com.br:8081',
      ),
    ).toEqual({
      host: 'clientevpn.sentinelaconect.com.br',
      port: 8081,
      protocol: CheckType.HTTP,
    });
  });

  it('mantém domínio limpo sem inventar protocolo ou porta', () => {
    expect(
      testable.normalizeAddress('clientevpn.sentinelaconect.com.br'),
    ).toEqual({
      host: 'clientevpn.sentinelaconect.com.br',
      port: null,
      protocol: undefined,
    });
  });

  it('considera HTTP 401 online e monta protocolo, host e porta', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ status: 401 } as Response);

    const result = await testable.performHttpCheck(
      'condominio.exemplo.com.br',
      8443,
      CheckType.HTTPS,
    );

    expect(result.status).toBe(DeviceStatus.ONLINE);
    const requestedUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestedUrl.href).toBe('https://condominio.exemplo.com.br:8443/');
    expect(testable.checkTimeoutMs).toBe(3_000);
    expect(testable.checkConcurrency).toBe(5);
  });

  it('considera HTTP 500 warning', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ status: 500 } as Response);

    const result = await testable.performHttpCheck(
      'condominio.exemplo.com.br',
      80,
      CheckType.HTTP,
    );

    expect(result.status).toBe(DeviceStatus.WARNING);
  });

  it('retorna as últimas 20 verificações em ordem decrescente', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'device-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const historyService = new DevicesService({
      device: { findUnique },
      checkResult: { findMany },
    } as unknown as PrismaService);

    await historyService.getChecks('device-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: 'device-1' },
        orderBy: { checkedAt: 'desc' },
        take: 20,
      }),
    );
  });

  it('retorna o contrato completo do check em lote', async () => {
    const batchService = new DevicesService({
      device: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService);

    await expect(batchService.checkAll()).resolves.toEqual({
      success: true,
      total: 0,
      checked: 0,
      online: 0,
      offline: 0,
      warning: 0,
      message:
        '0 de 0 equipamentos verificados: 0 online, 0 offline e 0 em atenção.',
    });
  });

  it('executa o lote em paralelo respeitando o limite de concorrência', async () => {
    const previousConcurrency = process.env.CHECK_CONCURRENCY;
    process.env.CHECK_CONCURRENCY = '3';

    try {
      const devices = Array.from({ length: 4 }, (_, index) => ({
        id: `device-${index}`,
        organizationId: 'organization-1',
        host: 'localhost',
        port: 80,
        checkType: CheckType.HTTP,
      }));
      const batchService = new DevicesService({
        device: { findMany: jest.fn().mockResolvedValue(devices) },
      } as unknown as PrismaService);

      let releaseChecks: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        releaseChecks = resolve;
      });
      let activeChecks = 0;
      let maxActiveChecks = 0;
      let confirmFirstWave: () => void = () => undefined;
      const firstWaveStarted = new Promise<void>((resolve) => {
        confirmFirstWave = resolve;
      });
      const runDeviceCheck = jest.fn(async () => {
        activeChecks += 1;
        maxActiveChecks = Math.max(maxActiveChecks, activeChecks);
        if (activeChecks === 3) confirmFirstWave();
        await gate;
        activeChecks -= 1;
        return { currentStatus: DeviceStatus.ONLINE };
      });
      (
        batchService as unknown as {
          runDeviceCheck: typeof runDeviceCheck;
        }
      ).runDeviceCheck = runDeviceCheck;

      const batchPromise = batchService.checkAll();
      await firstWaveStarted;

      expect(runDeviceCheck).toHaveBeenCalledTimes(3);
      expect(maxActiveChecks).toBe(3);

      releaseChecks();
      const summary = await batchPromise;

      expect(runDeviceCheck).toHaveBeenCalledTimes(4);
      expect(summary).toEqual(
        expect.objectContaining({
          total: 4,
          checked: 4,
          online: 4,
          offline: 0,
          warning: 0,
        }),
      );
    } finally {
      if (previousConcurrency === undefined) {
        delete process.env.CHECK_CONCURRENCY;
      } else {
        process.env.CHECK_CONCURRENCY = previousConcurrency;
      }
    }
  });

  it('continua o lote quando um equipamento falha', async () => {
    const devices = [
      {
        id: 'device-failure',
        organizationId: 'organization-1',
        host: 'offline.local',
        port: 80,
        checkType: CheckType.HTTP,
      },
      {
        id: 'device-online',
        organizationId: 'organization-1',
        host: 'online.local',
        port: 80,
        checkType: CheckType.HTTP,
      },
    ];
    const transaction = jest.fn().mockResolvedValue([]);
    const batchService = new DevicesService({
      device: {
        findMany: jest.fn().mockResolvedValue(devices),
        update: jest.fn(),
      },
      checkResult: { create: jest.fn() },
      $transaction: transaction,
    } as unknown as PrismaService);
    const runDeviceCheck = jest
      .fn()
      .mockRejectedValueOnce(new Error('Falha simulada'))
      .mockResolvedValueOnce({ currentStatus: DeviceStatus.ONLINE });
    (
      batchService as unknown as {
        runDeviceCheck: typeof runDeviceCheck;
      }
    ).runDeviceCheck = runDeviceCheck;

    await expect(batchService.checkAll()).resolves.toEqual(
      expect.objectContaining({
        total: 2,
        checked: 2,
        online: 1,
        offline: 1,
        warning: 0,
      }),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
