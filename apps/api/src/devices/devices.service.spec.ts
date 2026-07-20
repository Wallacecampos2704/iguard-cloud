import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CheckType, DeviceStatus, DeviceType } from '@prisma/client';
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
  runDeviceCheck: (
    device: unknown,
    source: string,
  ) => Promise<{ currentStatus: DeviceStatus }>;
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

  describe('findAll', () => {
    it('filtra device.findMany por organizationId', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const scopedService = new DevicesService(
        { device: { findMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await scopedService.findAll('organization-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-1' },
        }),
      );
    });

    it('não lista equipamentos de outras organizações', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          id: 'device-1',
          name: 'Câmera portaria',
          deviceType: DeviceType.CAMERA_IP,
          host: 'camera.example.com',
          port: null,
          checkType: CheckType.HTTP,
          currentStatus: DeviceStatus.ONLINE,
          responseTimeMs: 120,
          lastCheckedAt: null,
          customer: { name: 'Cliente 1' },
          site: { name: 'Site 1' },
        },
      ]);
      const scopedService = new DevicesService(
        { device: { findMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      const result = await scopedService.findAll('organization-1');

      expect(result).toEqual([
        expect.objectContaining({
          id: 'device-1',
          customerName: 'Cliente 1',
          siteName: 'Site 1',
        }),
      ]);
      const typedFindMany = findMany as jest.Mock<
        unknown,
        [{ where: unknown }]
      >;
      expect(typedFindMany.mock.calls[0][0].where).toEqual({
        organizationId: 'organization-1',
      });
    });
  });

  describe('create', () => {
    const validInput = {
      name: 'Câmera portaria',
      deviceType: 'CAMERA_IP',
      host: 'camera.example.com',
    };

    it('busca o primeiro Site somente da organização informada', async () => {
      const findFirst = jest.fn().mockResolvedValue({
        id: 'site-1',
        organizationId: 'organization-1',
        customerId: 'customer-1',
      });
      const create = jest.fn().mockResolvedValue({ id: 'device-1' });
      const scopedService = new DevicesService(
        {
          site: { findFirst },
          device: { create },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await scopedService.create('organization-1', validInput);

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-1' },
        }),
      );
    });

    it('usa o organizationId recebido pelo método no device.create, mesmo com Site mockado de forma inconsistente', async () => {
      const findFirst = jest.fn().mockResolvedValue({
        id: 'site-1',
        organizationId: 'organization-INCONSISTENTE',
        customerId: 'customer-1',
      });
      const create = jest.fn().mockResolvedValue({ id: 'device-1' });
      const scopedService = new DevicesService(
        {
          site: { findFirst },
          device: { create },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await scopedService.create('organization-1', validInput);

      expect(create).toHaveBeenCalledWith({
        data: {
          organizationId: 'organization-1',
          customerId: 'customer-1',
          siteId: 'site-1',
          name: 'Câmera portaria',
          deviceType: DeviceType.CAMERA_IP,
          host: 'camera.example.com',
          port: null,
          checkType: CheckType.HTTP,
          currentStatus: DeviceStatus.UNKNOWN,
        },
      });
    });

    it('falha com BadRequestException quando a organização não possui Site', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { site: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.create('organization-1', validInput),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('não seleciona Site de outra organização', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { site: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.create('organization-2', validInput),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-2' },
        }),
      );
    });
  });

  describe('update', () => {
    const existingDevice = {
      id: 'device-1',
      host: 'host.example.com',
      port: null,
      checkType: CheckType.HTTP,
      name: 'Device',
      deviceType: DeviceType.SERVER,
      currentStatus: DeviceStatus.ONLINE,
    };

    it('busca inicial contém id + organizationId', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { device: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.update('organization-1', 'device-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', organizationId: 'organization-1' },
      });
    });

    it('equipamento de outra organização resulta na mesma NotFoundException de equipamento inexistente', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { device: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.update('organization-1', 'device-de-outra-org', {}),
      ).rejects.toThrow('Equipamento não encontrado.');
    });

    it('updateMany contém id + organizationId, e count 0 gera NotFoundException', async () => {
      const findFirst = jest.fn().mockResolvedValueOnce(existingDevice);
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const scopedService = new DevicesService(
        { device: { findFirst, updateMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.update('organization-1', 'device-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1', organizationId: 'organization-1' },
        }),
      );
    });

    it('consulta final com id + organizationId devolve o registro atualizado', async () => {
      const updatedDevice = { ...existingDevice, name: 'Device renomeado' };
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce(existingDevice)
        .mockResolvedValueOnce(updatedDevice);
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const scopedService = new DevicesService(
        { device: { findFirst, updateMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      const result = await scopedService.update('organization-1', 'device-1', {
        name: 'Device renomeado',
      });

      expect(result).toEqual(updatedDevice);
      expect(findFirst).toHaveBeenLastCalledWith({
        where: { id: 'device-1', organizationId: 'organization-1' },
      });
    });

    it('lança NotFoundException se a consulta final não encontrar o equipamento', async () => {
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce(existingDevice)
        .mockResolvedValueOnce(null);
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const scopedService = new DevicesService(
        { device: { findFirst, updateMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.update('organization-1', 'device-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('usa deleteMany com id + organizationId', async () => {
      const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
      const scopedService = new DevicesService(
        { device: { deleteMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      const result = await scopedService.remove('organization-1', 'device-1');

      expect(deleteMany).toHaveBeenCalledWith({
        where: { id: 'device-1', organizationId: 'organization-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('count 0 resulta em NotFoundException, sem busca global anterior', async () => {
      const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const scopedService = new DevicesService(
        { device: { deleteMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.remove('organization-1', 'device-de-outra-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('check', () => {
    it('device.findFirst contém id + organizationId', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { device: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.check('organization-1', 'device-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1', organizationId: 'organization-1' },
        }),
      );
    });

    it('não verifica dispositivo de outra organização; runDeviceCheck não é chamado', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        { device: { findFirst } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );
      const runDeviceCheck = jest.fn();
      (
        scopedService as unknown as {
          runDeviceCheck: typeof runDeviceCheck;
        }
      ).runDeviceCheck = runDeviceCheck;

      await expect(
        scopedService.check('organization-1', 'device-de-outra-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runDeviceCheck).not.toHaveBeenCalled();
    });
  });

  describe('getChecks', () => {
    it('valida o Device com id + organizationId antes de consultar o histórico', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const findMany = jest.fn();
      const scopedService = new DevicesService(
        {
          device: { findFirst },
          checkResult: { findMany },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.getChecks('organization-1', 'device-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1', organizationId: 'organization-1' },
        }),
      );
      expect(findMany).not.toHaveBeenCalled();
    });

    it('filtra CheckResult por deviceId + organizationId, mantendo ordem decrescente e take 20', async () => {
      const findFirst = jest.fn().mockResolvedValue({ id: 'device-1' });
      const findMany = jest.fn().mockResolvedValue([]);
      const scopedService = new DevicesService(
        {
          device: { findFirst },
          checkResult: { findMany },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await scopedService.getChecks('organization-1', 'device-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-1', deviceId: 'device-1' },
          orderBy: { checkedAt: 'desc' },
          take: 20,
        }),
      );
    });

    it('dispositivo de outra organização retorna NotFoundException', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const scopedService = new DevicesService(
        {
          device: { findFirst },
          checkResult: { findMany: jest.fn() },
        } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await expect(
        scopedService.getChecks('organization-1', 'device-de-outra-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('retorna o contrato completo do check em lote da organização', async () => {
    const batchService = new DevicesService(
      {
        device: { findMany: jest.fn().mockResolvedValue([]) },
      } as unknown as PrismaService,
      notificationService,
      incidentsService,
    );

    await expect(
      batchService.checkAllForOrganization('organization-1'),
    ).resolves.toEqual({
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
      const findMany = jest.fn().mockResolvedValue(devices);
      const batchService = new DevicesService(
        { device: { findMany } } as unknown as PrismaService,
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

      const batchPromise =
        batchService.checkAllForOrganization('organization-1');
      await firstWaveStarted;

      expect(runDeviceCheck).toHaveBeenCalledTimes(3);
      expect(maxActiveChecks).toBe(3);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-1' },
        }),
      );

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

    await expect(
      batchService.checkAllForOrganization('organization-1'),
    ).resolves.toEqual(
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
      organizationId: string;
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

    await expect(
      automaticService.checkAllOrganizationsInternal('AUTOMATIC'),
    ).resolves.toEqual(
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
    expect(incidentCall[1].organizationId).toBe(device.organizationId);
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

  describe('checkAllForOrganization vs. checkAllOrganizationsInternal', () => {
    it('lote da organização filtra device.findMany por organizationId', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const scopedService = new DevicesService(
        { device: { findMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );

      await scopedService.checkAllForOrganization('organization-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'organization-1' },
        }),
      );
    });

    it('lote interno não filtra device.findMany por organizationId e continua verificando organizações diferentes', async () => {
      const devices = [
        {
          id: 'device-org-1',
          organizationId: 'organization-1',
          customerId: 'customer-1',
          siteId: 'site-1',
          name: 'Device org 1',
          host: 'host-1.example.com',
          port: 80,
          checkType: CheckType.HTTP,
        },
        {
          id: 'device-org-2',
          organizationId: 'organization-2',
          customerId: 'customer-2',
          siteId: 'site-2',
          name: 'Device org 2',
          host: 'host-2.example.com',
          port: 80,
          checkType: CheckType.HTTP,
        },
      ];
      const findMany = jest.fn().mockResolvedValue(devices);
      const internalService = new DevicesService(
        { device: { findMany } } as unknown as PrismaService,
        notificationService,
        incidentsService,
      );
      const runDeviceCheck = jest
        .fn()
        .mockResolvedValue({ currentStatus: DeviceStatus.ONLINE });
      (
        internalService as unknown as {
          runDeviceCheck: typeof runDeviceCheck;
        }
      ).runDeviceCheck = runDeviceCheck;

      await internalService.checkAllOrganizationsInternal('AUTOMATIC');

      const typedFindMany = findMany as jest.Mock<
        unknown,
        [{ where?: unknown }]
      >;
      expect(typedFindMany.mock.calls[0][0].where).toBeUndefined();
      expect(runDeviceCheck).toHaveBeenCalledTimes(2);
      const typedRunDeviceCheck = runDeviceCheck as jest.Mock<
        unknown,
        [unknown, string]
      >;
      const sources = typedRunDeviceCheck.mock.calls.map((call) => call[1]);
      const allAutomatic = sources.every((source) =>
        source.startsWith('AUTOMATIC:'),
      );
      expect(allAutomatic).toBe(true);
    });
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
        customerId: 'customer-1',
        siteId: 'site-1',
        name: 'DVR garagem',
        host: 'dvr.example.com',
        port: 9000,
        checkType: CheckType.HTTP,
      };
      let persistedStatus: DeviceStatus = DeviceStatus.ONLINE;
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
          device: { findFirst: jest.fn().mockResolvedValue(device) },
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
        concurrentService.check('organization-1', device.id),
        concurrentService.check('organization-1', device.id),
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

  describe('ponte com IncidentsService', () => {
    it('encaminha organizationId do device já validado para handleDeviceStatusChange', async () => {
      const device = {
        id: 'device-1',
        organizationId: 'organization-1',
        customerId: 'customer-1',
        siteId: 'site-1',
        name: 'Câmera',
        host: 'camera.example.com',
        port: null,
        checkType: CheckType.HTTP,
      };
      const transactionClient = {
        device: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ currentStatus: DeviceStatus.ONLINE }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        checkResult: {
          create: jest.fn().mockResolvedValue({ id: 'check-1' }),
        },
      };
      const transaction = jest.fn(
        async (
          callback: (client: typeof transactionClient) => Promise<unknown>,
        ) => callback(transactionClient),
      );
      const handleDeviceStatusChange = jest.fn().mockResolvedValue(null);
      const bridgeIncidentsService = {
        handleDeviceStatusChange,
      } as unknown as IncidentsService;
      const scopedService = new DevicesService(
        {
          device: { findFirst: jest.fn().mockResolvedValue(device) },
          $transaction: transaction,
        } as unknown as PrismaService,
        notificationService,
        bridgeIncidentsService,
      );
      const performHttpCheck = jest.fn().mockResolvedValue({
        status: DeviceStatus.ONLINE,
        responseTimeMs: 10,
        errorMessage: null,
        rawPayload: {},
      });
      (
        scopedService as unknown as {
          performHttpCheck: typeof performHttpCheck;
        }
      ).performHttpCheck = performHttpCheck;

      await scopedService.check('organization-1', device.id);

      type BridgeInput = {
        organizationId: string;
        deviceId: string;
        previousStatus: DeviceStatus;
        currentStatus: DeviceStatus;
        checkedAt: Date;
        source: string;
      };
      const typedHandleDeviceStatusChange =
        handleDeviceStatusChange as jest.Mock<
          unknown,
          [typeof transactionClient, BridgeInput]
        >;
      const [transactionArg, inputArg] =
        typedHandleDeviceStatusChange.mock.calls[0];
      expect(transactionArg).toBe(transactionClient);
      expect(inputArg.organizationId).toBe(device.organizationId);
      expect(inputArg.deviceId).toBe(device.id);
      expect(inputArg.previousStatus).toBe(DeviceStatus.ONLINE);
      expect(inputArg.currentStatus).toBe(DeviceStatus.ONLINE);
      expect(inputArg.checkedAt).toBeInstanceOf(Date);
      expect(inputArg.source).toBe('MANUAL');
    });
  });
});
