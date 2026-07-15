import { Logger } from '@nestjs/common';
import { CheckType, DeviceStatus } from '@prisma/client';
import { IncidentsService } from '../incidents/incidents.service';
import { NotificationService } from '../notifications/notification.service';
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
  const notificationService = {
    notifyStatusChange: jest.fn().mockResolvedValue(null),
  } as unknown as NotificationService;
  const incidentsService = {
    handleDeviceStatusChange: jest.fn().mockResolvedValue(null),
  } as unknown as IncidentsService;
  const service = new DevicesService(
    {} as PrismaService,
    notificationService,
    incidentsService,
  );
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
    const historyService = new DevicesService(
      {
        device: { findUnique },
        checkResult: { findMany },
      } as unknown as PrismaService,
      notificationService,
      incidentsService,
    );

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
    const batchService = new DevicesService(
      {
        device: { findMany: jest.fn().mockResolvedValue([]) },
      } as unknown as PrismaService,
      notificationService,
      incidentsService,
    );

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
        name: `Equipamento ${index}`,
        host: 'localhost',
        port: 80,
        checkType: CheckType.HTTP,
      }));
      const batchService = new DevicesService(
        {
          device: { findMany: jest.fn().mockResolvedValue(devices) },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

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
        name: 'Equipamento offline',
        host: 'offline.local',
        port: 80,
        checkType: CheckType.HTTP,
      },
      {
        id: 'device-online',
        organizationId: 'organization-1',
        name: 'Equipamento online',
        host: 'online.local',
        port: 80,
        checkType: CheckType.HTTP,
      },
    ];
    const transaction = jest.fn().mockResolvedValue([]);
    const batchService = new DevicesService(
      {
        device: {
          findMany: jest.fn().mockResolvedValue(devices),
          update: jest.fn(),
        },
        checkResult: { create: jest.fn() },
        $transaction: transaction,
      } as unknown as PrismaService,
      notificationService,
      incidentsService,
    );
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

  it('dispara alerta no monitoramento automático sem duplicar o CheckResult quando o canal falha', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const device = {
      id: 'device-automatic',
      organizationId: 'organization-1',
      name: 'Câmera da portaria',
      host: 'camera.example.com',
      port: 8080,
      checkType: CheckType.HTTP,
    };
    type CreateCheckResultArgs = {
      data: { source: string; status: DeviceStatus };
    };
    const createCheckResult = jest.fn((args: CreateCheckResultArgs) => {
      void args;
      return Promise.resolve({ id: 'check-1' });
    });
    const transactionClient = {
      device: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ currentStatus: DeviceStatus.ONLINE }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      checkResult: { create: createCheckResult },
    };
    const transaction = jest.fn(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );
    const notifyStatusChange = jest
      .fn()
      .mockRejectedValue(new Error('Telegram indisponível'));
    const failingNotificationService = {
      notifyStatusChange,
    } as unknown as NotificationService;
    type IncidentStatusChangeInput = {
      deviceId: string;
      previousStatus: DeviceStatus;
      currentStatus: DeviceStatus;
      checkedAt: Date;
      source: string;
    };
    const handleDeviceStatusChange = jest.fn(
      (client: typeof transactionClient, input: IncidentStatusChangeInput) => {
        void client;
        void input;
        return Promise.resolve(null);
      },
    );
    const automaticIncidentsService = {
      handleDeviceStatusChange,
    } as unknown as IncidentsService;
    const automaticService = new DevicesService(
      {
        device: { findMany: jest.fn().mockResolvedValue([device]) },
        $transaction: transaction,
      } as unknown as PrismaService,
      failingNotificationService,
      automaticIncidentsService,
    );
    const performHttpCheck = jest.fn().mockResolvedValue({
      status: DeviceStatus.OFFLINE,
      responseTimeMs: 25,
      errorMessage: 'Conexão recusada',
      rawPayload: { timeout: false },
    });
    (
      automaticService as unknown as {
        performHttpCheck: typeof performHttpCheck;
      }
    ).performHttpCheck = performHttpCheck;

    await expect(automaticService.checkAll('AUTOMATIC')).resolves.toEqual(
      expect.objectContaining({
        checked: 1,
        online: 0,
        offline: 1,
        warning: 0,
      }),
    );

    expect(createCheckResult).toHaveBeenCalledTimes(1);
    const incidentCall = handleDeviceStatusChange.mock.calls[0];
    expect(incidentCall[0]).toBe(transactionClient);
    expect(incidentCall[1].deviceId).toBe(device.id);
    expect(incidentCall[1].previousStatus).toBe(DeviceStatus.ONLINE);
    expect(incidentCall[1].currentStatus).toBe(DeviceStatus.OFFLINE);
    expect(incidentCall[1].source).toMatch(/^AUTOMATIC:/);
    const persistedCheck = createCheckResult.mock.calls[0][0];
    expect(persistedCheck.data.source).toMatch(/^AUTOMATIC:/);
    expect(persistedCheck.data.status).toBe(DeviceStatus.OFFLINE);
    expect(notifyStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: device.name,
        host: device.host,
        port: device.port,
        checkType: device.checkType,
        previousStatus: DeviceStatus.ONLINE,
        newStatus: DeviceStatus.OFFLINE,
        responseTimeMs: 25,
        errorMessage: 'Conexão recusada',
      }),
    );
  });

  it('envia um único alerta para checks concorrentes da mesma transição', async () => {
    const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const previousChatId = process.env.TELEGRAM_CHAT_ID;
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);

    try {
      const device = {
        id: 'device-concurrent',
        organizationId: 'organization-1',
        name: 'DVR garagem',
        host: 'dvr.example.com',
        port: 9000,
        checkType: CheckType.HTTP,
      };
      let persistedStatus = DeviceStatus.ONLINE;
      let initialReadCount = 0;
      let releaseInitialReads: () => void = () => undefined;
      const bothInitialReads = new Promise<void>((resolve) => {
        releaseInitialReads = resolve;
      });
      const transactionFindUnique = jest.fn(async () => {
        const statusSnapshot = persistedStatus;
        if (initialReadCount < 2) {
          initialReadCount += 1;
          if (initialReadCount === 2) releaseInitialReads();
          await bothInitialReads;
        }
        return { currentStatus: statusSnapshot };
      });
      type UpdateStatusArgs = {
        where: { currentStatus: DeviceStatus };
        data: { currentStatus: DeviceStatus };
      };
      const updateMany = jest.fn((args: UpdateStatusArgs) => {
        if (args.where.currentStatus !== persistedStatus) return { count: 0 };
        persistedStatus = args.data.currentStatus;
        return { count: 1 };
      });
      let checkResultSequence = 0;
      const createCheckResult = jest.fn(() => ({
        id: `check-${++checkResultSequence}`,
      }));
      const transactionClient = {
        device: { findUnique: transactionFindUnique, updateMany },
        checkResult: { create: createCheckResult },
      };
      const transaction = jest.fn(
        async (
          callback: (client: typeof transactionClient) => Promise<unknown>,
        ) => callback(transactionClient),
      );
      const concurrentService = new DevicesService(
        {
          device: { findUnique: jest.fn().mockResolvedValue(device) },
          $transaction: transaction,
        } as unknown as PrismaService,
        new NotificationService(),
        incidentsService,
      );
      const performHttpCheck = jest.fn().mockResolvedValue({
        status: DeviceStatus.OFFLINE,
        responseTimeMs: 40,
        errorMessage: 'Timeout',
        rawPayload: { timeout: true },
      });
      (
        concurrentService as unknown as {
          performHttpCheck: typeof performHttpCheck;
        }
      ).performHttpCheck = performHttpCheck;

      await Promise.all([
        concurrentService.check(device.id),
        concurrentService.check(device.id),
      ]);

      expect(createCheckResult).toHaveBeenCalledTimes(2);
      expect(updateMany).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      if (previousBotToken === undefined) {
        delete process.env.TELEGRAM_BOT_TOKEN;
      } else {
        process.env.TELEGRAM_BOT_TOKEN = previousBotToken;
      }
      if (previousChatId === undefined) {
        delete process.env.TELEGRAM_CHAT_ID;
      } else {
        process.env.TELEGRAM_CHAT_ID = previousChatId;
      }
    }
  });
});
