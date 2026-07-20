import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import {
  CheckType,
  DeviceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, StatusChangeAlert } from './notification.service';

function notificationScope(organizationId: string) {
  return {
    organizationId,
    AND: [
      {
        OR: [{ customerId: null }, { customer: { is: { organizationId } } }],
      },
      { OR: [{ siteId: null }, { site: { is: { organizationId } } }] },
      { OR: [{ deviceId: null }, { device: { is: { organizationId } } }] },
      {
        OR: [{ incidentId: null }, { incident: { is: { organizationId } } }],
      },
    ],
  };
}

const ALLOWED_TRANSITIONS: Array<[DeviceStatus, DeviceStatus]> = [
  [DeviceStatus.ONLINE, DeviceStatus.OFFLINE],
  [DeviceStatus.OFFLINE, DeviceStatus.ONLINE],
  [DeviceStatus.WARNING, DeviceStatus.OFFLINE],
  [DeviceStatus.OFFLINE, DeviceStatus.WARNING],
  [DeviceStatus.ONLINE, DeviceStatus.WARNING],
  [DeviceStatus.WARNING, DeviceStatus.ONLINE],
];

const ALL_STATUSES = Object.values(DeviceStatus);
const DISALLOWED_TRANSITIONS = ALL_STATUSES.flatMap((previousStatus) =>
  ALL_STATUSES.map((newStatus): [DeviceStatus, DeviceStatus] => [
    previousStatus,
    newStatus,
  ]),
).filter(
  ([previousStatus, newStatus]) =>
    previousStatus !== newStatus &&
    !ALLOWED_TRANSITIONS.some(
      ([allowedPrevious, allowedNew]) =>
        previousStatus === allowedPrevious && newStatus === allowedNew,
    ),
);

const makeAlert = (
  overrides: Partial<StatusChangeAlert> = {},
): StatusChangeAlert => ({
  organizationId: 'organization-1',
  customerId: 'customer-1',
  siteId: 'site-1',
  deviceId: 'device-1',
  incidentId: 'incident-1',
  name: 'Portaria Jardins',
  host: 'gateway.example.com',
  port: 8443,
  checkType: CheckType.HTTPS,
  previousStatus: DeviceStatus.ONLINE,
  newStatus: DeviceStatus.OFFLINE,
  checkedAt: new Date('2026-07-14T12:34:56.000Z'),
  responseTimeMs: 247,
  errorMessage: 'Conexão recusada',
  ...overrides,
});

describe('NotificationService', () => {
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;
  let loggerLog: jest.SpiedFunction<Logger['log']>;
  let loggerWarn: jest.SpiedFunction<Logger['warn']>;
  let loggerError: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    loggerLog = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalBotToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
    }

    if (originalChatId === undefined) {
      delete process.env.TELEGRAM_CHAT_ID;
    } else {
      process.env.TELEGRAM_CHAT_ID = originalChatId;
    }

    jest.restoreAllMocks();
  });

  it.each(ALLOWED_TRANSITIONS)(
    'envia somente para a transição permitida %s -> %s',
    async (previousStatus, newStatus) => {
      const service = new NotificationService();

      await expect(
        service.notifyStatusChange(makeAlert({ previousStatus, newStatus })),
      ).resolves.toEqual({ email: 'skipped', telegram: 'skipped' });
    },
  );

  it.each(ALL_STATUSES)(
    'não envia quando o status permanece %s',
    async (status) => {
      const service = new NotificationService();

      await expect(
        service.notifyStatusChange(
          makeAlert({ previousStatus: status, newStatus: status }),
        ),
      ).resolves.toBeNull();
      expect(loggerLog).not.toHaveBeenCalled();
      expect(loggerWarn).not.toHaveBeenCalled();
    },
  );

  it.each(DISALLOWED_TRANSITIONS)(
    'não envia para a transição não permitida %s -> %s',
    async (previousStatus, newStatus) => {
      const service = new NotificationService();

      await expect(
        service.notifyStatusChange(makeAlert({ previousStatus, newStatus })),
      ).resolves.toBeNull();
      expect(loggerLog).not.toHaveBeenCalled();
      expect(loggerWarn).not.toHaveBeenCalled();
    },
  );

  it.each([
    [DeviceStatus.OFFLINE, '🚨 iGuard Alerta: equipamento OFFLINE'],
    [DeviceStatus.ONLINE, '✅ iGuard: equipamento voltou ONLINE'],
    [DeviceStatus.WARNING, '⚠️ iGuard Atenção: equipamento em WARNING'],
  ] as const)(
    'usa o título esperado quando o novo status é %s',
    async (newStatus, title) => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
      process.env.TELEGRAM_CHAT_ID = 'chat-id';
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      const service = new NotificationService();
      const previousStatus =
        newStatus === DeviceStatus.OFFLINE
          ? DeviceStatus.ONLINE
          : DeviceStatus.OFFLINE;

      await service.notifyStatusChange(
        makeAlert({ previousStatus, newStatus }),
      );

      expect(fetchMock.mock.calls[0][1]?.body).toEqual(
        expect.stringContaining(title),
      );
    },
  );

  it('inclui todos os dados existentes do equipamento e da verificação na mensagem', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await service.notifyStatusChange(makeAlert());

    const request = fetchMock.mock.calls[0][1];
    expect(request?.body).toEqual(expect.stringContaining('Portaria Jardins'));
    expect(request?.body).toEqual(
      expect.stringContaining('Host: gateway.example.com'),
    );
    expect(request?.body).toEqual(expect.stringContaining('Porta: 8443'));
    expect(request?.body).toEqual(
      expect.stringContaining('Tipo de verificação: HTTPS'),
    );
    expect(request?.body).toEqual(expect.stringContaining('ONLINE'));
    expect(request?.body).toEqual(expect.stringContaining('OFFLINE'));
    expect(request?.body).toEqual(
      expect.stringContaining('2026-07-14T12:34:56.000Z'),
    );
    expect(request?.body).toEqual(expect.stringContaining('247 ms'));
    expect(request?.body).toEqual(
      expect.stringContaining('Erro: Conexão recusada'),
    );
  });

  it('omite tempo de resposta e mensagem de erro quando não existem', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await service.notifyStatusChange(
      makeAlert({ responseTimeMs: null, errorMessage: null }),
    );

    const requestBody = fetchMock.mock.calls[0][1]?.body;
    expect(requestBody).not.toEqual(
      expect.stringContaining('Tempo de resposta:'),
    );
    expect(requestBody).not.toEqual(expect.stringContaining('Erro:'));
  });

  it('ignora Telegram sem configuração e não chama fetch', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'skipped',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('processa o teste sem token do Telegram sem quebrar a API', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await expect(service.sendTest('organization-1')).resolves.toEqual({
      success: true,
      message: 'Teste registrado; Telegram não configurado ou desabilitado.',
      channels: {
        email: 'skipped',
        telegram: 'skipped',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marca o envio ao Telegram como concluído em uma resposta HTTP de sucesso', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'sent',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.telegram.org/botbot-token/sendMessage',
    );
    const request = fetchMock.mock.calls[0][1];
    expect(request?.method).toBe('POST');
    expect(request?.body).toEqual(
      expect.stringContaining('"chat_id":"chat-id"'),
    );
  });

  it('retorna falha sem lançar quando o Telegram responde com erro HTTP', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 401 } as Response);
    const service = new NotificationService();

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'failed',
    });
    expect(loggerError).toHaveBeenCalledWith('Telegram respondeu HTTP 401.');
  });

  it('retorna falha sem lançar quando fetch rejeita', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('conexão indisponível'));
    const service = new NotificationService();

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'failed',
    });
    expect(loggerError).toHaveBeenCalledWith(
      'Falha ao comunicar com Telegram.',
    );
  });
});

describe('NotificationService — organizationId obrigatório nos métodos de usuário', () => {
  const invalidValues = ['', '   '];

  it('sendTest rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const organizationFindFirst = jest.fn();
      const service = new NotificationService({
        organization: { findFirst: organizationFindFirst },
      } as unknown as PrismaService);

      await expect(service.sendTest(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(organizationFindFirst).not.toHaveBeenCalled();
    }
  });

  it('findAll rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const notificationFindMany = jest.fn();
      const service = new NotificationService({
        notification: { findMany: notificationFindMany },
      } as unknown as PrismaService);

      await expect(service.findAll(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(notificationFindMany).not.toHaveBeenCalled();
    }
  });

  it('getStats rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const notificationCount = jest.fn();
      const service = new NotificationService({
        notification: { count: notificationCount },
      } as unknown as PrismaService);

      await expect(service.getStats(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(notificationCount).not.toHaveBeenCalled();
    }
  });

  it('findOne rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const notificationFindFirst = jest.fn();
      const service = new NotificationService({
        notification: { findFirst: notificationFindFirst },
      } as unknown as PrismaService);

      await expect(
        service.findOne(value, 'notification-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(notificationFindFirst).not.toHaveBeenCalled();
    }
  });

  it('retry rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const notificationFindFirst = jest.fn();
      const service = new NotificationService({
        notification: { findFirst: notificationFindFirst },
      } as unknown as PrismaService);

      await expect(
        service.retry(value, 'notification-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(notificationFindFirst).not.toHaveBeenCalled();
    }
  });

  it('getPreferences rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const preferenceFindFirst = jest.fn();
      const service = new NotificationService({
        notificationPreference: { findFirst: preferenceFindFirst },
      } as unknown as PrismaService);

      await expect(service.getPreferences(value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(preferenceFindFirst).not.toHaveBeenCalled();
    }
  });

  it('updatePreferences rejeita organizationId vazio ou somente espaços, sem tocar o Prisma', async () => {
    for (const value of invalidValues) {
      const preferenceFindFirst = jest.fn();
      const service = new NotificationService({
        notificationPreference: { findFirst: preferenceFindFirst },
      } as unknown as PrismaService);

      await expect(service.updatePreferences(value, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(preferenceFindFirst).not.toHaveBeenCalled();
    }
  });
});

describe('NotificationService — findAll', () => {
  it('escopa findMany e count por organizationId com defesa de relações', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = new NotificationService({
      notification: { findMany, count },
    } as unknown as PrismaService);

    await service.findAll('organization-1');

    const expectedWhere = notificationScope('organization-1');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('valida que customerId informado pertence à organização antes de consultar', async () => {
    const customerFindFirst = jest.fn().mockResolvedValue(null);
    const findMany = jest.fn();
    const count = jest.fn();
    const service = new NotificationService({
      customer: { findFirst: customerFindFirst },
      notification: { findMany, count },
    } as unknown as PrismaService);

    await expect(
      service.findAll('organization-1', {
        customerId: 'customer-de-outra-org',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(customerFindFirst).toHaveBeenCalledWith({
      where: { id: 'customer-de-outra-org', organizationId: 'organization-1' },
      select: { id: true },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('valida que deviceId informado pertence à organização (id + organizationId + defesa de Customer/Site)', async () => {
    const deviceFindFirst = jest.fn().mockResolvedValue(null);
    const findMany = jest.fn();
    const count = jest.fn();
    const service = new NotificationService({
      device: { findFirst: deviceFindFirst },
      notification: { findMany, count },
    } as unknown as PrismaService);

    await expect(
      service.findAll('organization-1', { deviceId: 'device-de-outra-org' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deviceFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'device-de-outra-org',
        organizationId: 'organization-1',
        customer: { is: { organizationId: 'organization-1' } },
        site: { is: { organizationId: 'organization-1' } },
      },
      select: { id: true },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('preserva paginação, ordenação e filtros de status/channel/type', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = new NotificationService({
      notification: { findMany, count },
    } as unknown as PrismaService);

    await service.findAll('organization-1', {
      status: NotificationStatus.FAILED,
      channel: NotificationChannel.TELEGRAM,
      type: NotificationType.DEVICE_OFFLINE,
      page: 2,
      pageSize: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
      }),
    );
    const typedFindMany = findMany as jest.Mock<
      unknown,
      [{ where: { status: unknown; channel: unknown; type: unknown } }]
    >;
    const { where } = typedFindMany.mock.calls[0][0];
    expect(where.status).toBe(NotificationStatus.FAILED);
    expect(where.channel).toBe(NotificationChannel.TELEGRAM);
    expect(where.type).toBe(NotificationType.DEVICE_OFFLINE);
  });
});

describe('NotificationService — getStats', () => {
  it('todas as cinco contagens são escopadas por organizationId com defesa de relações', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const service = new NotificationService({
      notification: { count },
    } as unknown as PrismaService);

    await service.getStats('organization-1');

    const expectedScope = notificationScope('organization-1');
    expect(count).toHaveBeenCalledTimes(5);
    for (const call of count.mock.calls as Array<[{ where: unknown }]>) {
      const [{ where }] = call;
      expect(where).toEqual(expect.objectContaining(expectedScope));
    }
  });

  it('valida customerId contra a organização quando informado', async () => {
    const customerFindFirst = jest.fn().mockResolvedValue(null);
    const count = jest.fn();
    const service = new NotificationService({
      customer: { findFirst: customerFindFirst },
      notification: { count },
    } as unknown as PrismaService);

    await expect(
      service.getStats('organization-1', 'customer-de-outra-org'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(count).not.toHaveBeenCalled();
  });
});

describe('NotificationService — findOne', () => {
  it('usa findFirst com id + escopo completo da organização', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new NotificationService({
      notification: { findFirst },
    } as unknown as PrismaService);

    await expect(
      service.findOne('organization-1', 'notification-de-outra-org'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ...notificationScope('organization-1'),
          id: 'notification-de-outra-org',
        },
      }),
    );
  });
});

describe('NotificationService — getPreferences', () => {
  it('retorna default com organizationId da sessão quando não há preferência armazenada', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new NotificationService({
      notificationPreference: { findFirst },
    } as unknown as PrismaService);

    const result = await service.getPreferences('organization-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: null,
        organizationId: 'organization-1',
        customerId: null,
        createdAt: null,
        updatedAt: null,
      }),
    );
  });

  it('lê a preferência global escopada por organizationId e customerId null', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new NotificationService({
      notificationPreference: { findFirst },
    } as unknown as PrismaService);

    await service.getPreferences('organization-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'organization-1', customerId: null },
    });
  });

  it('valida que customerId informado pertence à organização', async () => {
    const customerFindFirst = jest.fn().mockResolvedValue(null);
    const preferenceFindFirst = jest.fn();
    const service = new NotificationService({
      customer: { findFirst: customerFindFirst },
      notificationPreference: { findFirst: preferenceFindFirst },
    } as unknown as PrismaService);

    await expect(
      service.getPreferences('organization-1', 'customer-de-outra-org'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(preferenceFindFirst).not.toHaveBeenCalled();
  });
});

describe('NotificationService — updatePreferences', () => {
  const validInput = {
    telegramEnabled: true,
    emailEnabled: false,
    alertOnOffline: true,
    alertOnRecovery: true,
    alertOnWarning: true,
    confirmationDelaySeconds: 0,
    cooldownMinutes: 0,
    quietHoursEnabled: false,
    timezone: 'America/Sao_Paulo',
  };

  it('cria a preferência global com organizationId da sessão quando não existe registro', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'pref-1', ...validInput });
    const service = new NotificationService({
      notificationPreference: { findFirst, create },
    } as unknown as PrismaService);

    await service.updatePreferences('organization-1', validInput);

    const typedCreate = create as jest.Mock<
      unknown,
      [{ data: { organizationId: unknown; customerId: unknown } }]
    >;
    const { data } = typedCreate.mock.calls[0][0];
    expect(data.organizationId).toBe('organization-1');
    expect(data.customerId).toBeNull();
  });

  it('atualiza preferência existente via updateMany com id + organizationId, nunca update por id isolado', async () => {
    const current = { id: 'pref-1', ...validInput };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, telegramEnabled: false });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notificationPreference: { findFirst, updateMany },
    } as unknown as PrismaService);

    const result = await service.updatePreferences('organization-1', {
      ...validInput,
      telegramEnabled: false,
    });

    const typedUpdateMany = updateMany as jest.Mock<
      unknown,
      [{ where: unknown; data: { telegramEnabled: unknown } }]
    >;
    const updateManyArgs = typedUpdateMany.mock.calls[0][0];
    expect(updateManyArgs.where).toEqual({
      id: 'pref-1',
      organizationId: 'organization-1',
    });
    expect(updateManyArgs.data.telegramEnabled).toBe(false);
    expect(result).toEqual({ ...current, telegramEnabled: false });
  });

  it('valida customerId contra a organização antes de ler ou escrever a preferência', async () => {
    const customerFindFirst = jest.fn().mockResolvedValue(null);
    const preferenceFindFirst = jest.fn();
    const service = new NotificationService({
      customer: { findFirst: customerFindFirst },
      notificationPreference: { findFirst: preferenceFindFirst },
    } as unknown as PrismaService);

    await expect(
      service.updatePreferences('organization-1', {
        ...validInput,
        customerId: 'customer-de-outra-org',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(preferenceFindFirst).not.toHaveBeenCalled();
  });

  it('concorrência na criação da preferência global: relê e atualiza via updateMany escopado, nunca atualiza outra organização', async () => {
    const concurrent = { id: 'pref-concurrent', ...validInput };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrent)
      .mockResolvedValueOnce({ ...concurrent, telegramEnabled: false });
    const create = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
      );
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      notificationPreference: { findFirst, create, updateMany },
    } as unknown as PrismaService);

    await service.updatePreferences('organization-1', {
      ...validInput,
      telegramEnabled: false,
    });

    const typedUpdateMany = updateMany as jest.Mock<
      unknown,
      [{ where: unknown; data: { telegramEnabled: unknown } }]
    >;
    const updateManyArgs = typedUpdateMany.mock.calls[0][0];
    expect(updateManyArgs.where).toEqual({
      id: 'pref-concurrent',
      organizationId: 'organization-1',
    });
    expect(updateManyArgs.data.telegramEnabled).toBe(false);
  });

  it('concorrência na criação da preferência de cliente: updateMany inclui defesa da relação Customer', async () => {
    const concurrent = {
      id: 'pref-customer-1',
      customerId: 'customer-1',
      ...validInput,
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrent)
      .mockResolvedValueOnce({ ...concurrent, telegramEnabled: false });
    const create = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
      );
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const customerFindFirst = jest.fn().mockResolvedValue({ id: 'customer-1' });
    const service = new NotificationService({
      customer: { findFirst: customerFindFirst },
      notificationPreference: { findFirst, create, updateMany },
    } as unknown as PrismaService);

    await service.updatePreferences('organization-1', {
      ...validInput,
      customerId: 'customer-1',
      telegramEnabled: false,
    });

    const typedUpdateMany = updateMany as jest.Mock<
      unknown,
      [{ where: unknown; data: { telegramEnabled: unknown } }]
    >;
    const updateManyArgs = typedUpdateMany.mock.calls[0][0];
    expect(updateManyArgs.where).toEqual({
      id: 'pref-customer-1',
      organizationId: 'organization-1',
      customer: { is: { organizationId: 'organization-1' } },
    });
    expect(updateManyArgs.data.telegramEnabled).toBe(false);
  });
});
