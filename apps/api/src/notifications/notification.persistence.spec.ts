import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import {
  CheckType,
  DeviceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, StatusChangeAlert } from './notification.service';

type StoredNotification = {
  id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  deduplicationKey: string | null;
  attemptCount: number;
  errorMessage: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
};

type NotificationCreateArgs = {
  data: {
    channel: NotificationChannel;
    status: NotificationStatus;
    deduplicationKey?: string | null;
    attemptCount: number;
    recipient?: string | null;
    message: string;
  };
};

type NotificationUpdateArgs = {
  where: { id: string };
  data: {
    status?: NotificationStatus;
    errorMessage?: string | null;
    providerMessageId?: string | null;
    sentAt?: Date | null;
  };
};

const makeAlert = (
  overrides: Partial<StatusChangeAlert> = {},
): StatusChangeAlert => ({
  organizationId: 'organization-1',
  customerId: 'customer-1',
  siteId: 'site-1',
  deviceId: 'device-1',
  incidentId: 'incident-1',
  name: 'Portaria',
  host: 'gateway.example.com',
  port: 443,
  checkType: CheckType.HTTPS,
  previousStatus: DeviceStatus.ONLINE,
  newStatus: DeviceStatus.OFFLINE,
  checkedAt: new Date('2026-07-17T12:00:00.000Z'),
  responseTimeMs: 100,
  errorMessage: 'Timeout',
  ...overrides,
});

function createPersistenceMock() {
  const records = new Map<string, StoredNotification>();
  let sequence = 0;
  const keyFor = (channel: NotificationChannel, deduplicationKey: string) =>
    `${channel}:${deduplicationKey}`;

  const notificationFindUnique = jest.fn(
    (args: {
      where: {
        channel_deduplicationKey?: {
          channel: NotificationChannel;
          deduplicationKey: string;
        };
      };
    }) => {
      const key = args.where.channel_deduplicationKey;
      if (!key) return Promise.resolve(null);
      return Promise.resolve(
        records.get(keyFor(key.channel, key.deduplicationKey)) ?? null,
      );
    },
  );
  const notificationCreate = jest.fn((args: NotificationCreateArgs) => {
    const record: StoredNotification = {
      id: `notification-${++sequence}`,
      channel: args.data.channel,
      status: args.data.status,
      deduplicationKey: args.data.deduplicationKey ?? null,
      attemptCount: args.data.attemptCount,
      errorMessage: null,
      providerMessageId: null,
      sentAt: null,
    };
    if (record.deduplicationKey) {
      records.set(keyFor(record.channel, record.deduplicationKey), record);
    }
    return Promise.resolve({ id: record.id, status: record.status });
  });
  const notificationUpdate = jest.fn((args: NotificationUpdateArgs) => {
    const record = [...records.values()].find(
      (candidate) => candidate.id === args.where.id,
    );
    if (record) Object.assign(record, args.data);
    return Promise.resolve(record);
  });
  const prisma = {
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    notification: {
      findUnique: notificationFindUnique,
      findFirst: jest.fn().mockResolvedValue(null),
      create: notificationCreate,
      update: notificationUpdate,
    },
  } as unknown as PrismaService;

  return {
    prisma,
    records,
    notificationCreate,
    notificationUpdate,
  };
}

describe('NotificationService persistence and deduplication', () => {
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
    if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChatId;
    jest.restoreAllMocks();
  });

  it('registra PENDING antes do Telegram e conclui como SENT', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'secret-bot-token';
    process.env.TELEGRAM_CHAT_ID = '123456789';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { message_id: 42 } }),
    } as Response);
    const mock = createPersistenceMock();
    const service = new NotificationService(mock.prisma);

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'sent',
    });

    const telegramCreate = mock.notificationCreate.mock.calls.find(
      ([args]) => args.data.channel === NotificationChannel.TELEGRAM,
    )?.[0];
    expect(telegramCreate?.data.status).toBe(NotificationStatus.PENDING);
    expect(telegramCreate?.data.attemptCount).toBe(1);
    expect(telegramCreate?.data.recipient).toBe('*****6789');
    expect(JSON.stringify(telegramCreate)).not.toContain('secret-bot-token');
    expect(mock.notificationUpdate).toHaveBeenCalledWith({
      where: { id: 'notification-2' },
      data: {
        status: NotificationStatus.SENT,
        providerMessageId: '42',
        errorMessage: null,
        sentAt: expect.any(Date) as Date,
      },
    });
  });

  it('registra FAILED com mensagem sanitizada quando o Telegram falha', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'secret-bot-token';
    process.env.TELEGRAM_CHAT_ID = '123456789';
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(
        new Error('https://api.telegram.org/botsecret-bot-token/sendMessage'),
      );
    const mock = createPersistenceMock();
    const service = new NotificationService(mock.prisma);

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'failed',
    });
    const update = mock.notificationUpdate.mock.calls.find(
      ([args]) => args.data.status === NotificationStatus.FAILED,
    )?.[0];
    expect(update?.data.errorMessage).toBe('Falha ao comunicar com Telegram.');
    expect(JSON.stringify(update)).not.toContain('secret-bot-token');
  });

  it('registra SKIPPED e não quebra quando Telegram não está configurado', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const mock = createPersistenceMock();
    const service = new NotificationService(mock.prisma);

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'skipped',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const telegramCreate = mock.notificationCreate.mock.calls.find(
      ([args]) => args.data.channel === NotificationChannel.TELEGRAM,
    )?.[0];
    expect(telegramCreate?.data.status).toBe(NotificationStatus.SKIPPED);
    expect(telegramCreate?.data.attemptCount).toBe(0);
  });

  it('envia uma queda e uma recuperação por incidente sem duplicá-las', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const mock = createPersistenceMock();
    const service = new NotificationService(mock.prisma);
    const fall = makeAlert();
    const recovery = makeAlert({
      previousStatus: DeviceStatus.OFFLINE,
      newStatus: DeviceStatus.ONLINE,
      errorMessage: null,
    });

    await service.notifyStatusChange(fall);
    await service.notifyStatusChange(fall);
    await service.notifyStatusChange(recovery);
    await service.notifyStatusChange(recovery);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const telegramKeys = [...mock.records.values()]
      .filter((record) => record.channel === NotificationChannel.TELEGRAM)
      .map((record) => record.deduplicationKey);
    expect(telegramKeys).toEqual(
      expect.arrayContaining([
        `incident-1:${NotificationType.DEVICE_OFFLINE}`,
        `incident-1:${NotificationType.DEVICE_ONLINE}`,
      ]),
    );
  });

  it('trata corrida P2002 como notificação já deduplicada sem novo envio', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    const fetchMock = jest.spyOn(global, 'fetch');
    let telegramLookup = 0;
    const notificationFindUnique = jest.fn(
      (args: {
        where: {
          channel_deduplicationKey: { channel: NotificationChannel };
        };
      }) => {
        if (
          args.where.channel_deduplicationKey.channel ===
          NotificationChannel.TELEGRAM
        ) {
          telegramLookup += 1;
          return Promise.resolve(
            telegramLookup > 1 ? { status: NotificationStatus.SENT } : null,
          );
        }
        return Promise.resolve(null);
      },
    );
    const notificationCreate = jest.fn((args: NotificationCreateArgs) => {
      if (args.data.channel === NotificationChannel.TELEGRAM) {
        return Promise.reject(
          Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
        );
      }
      return Promise.resolve({
        id: 'email-1',
        status: NotificationStatus.SKIPPED,
      });
    });
    const service = new NotificationService({
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      notification: {
        findUnique: notificationFindUnique,
        findFirst: jest.fn().mockResolvedValue(null),
        create: notificationCreate,
      },
    } as unknown as PrismaService);

    await expect(service.notifyStatusChange(makeAlert())).resolves.toEqual({
      email: 'skipped',
      telegram: 'sent',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reserva retry de FAILED atomicamente e rejeita outros status', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const raw = {
      id: 'notification-1',
      organizationId: 'organization-1',
      customerId: null,
      siteId: null,
      deviceId: null,
      incidentId: null,
      channel: NotificationChannel.TELEGRAM,
      type: NotificationType.TEST,
      status: NotificationStatus.FAILED as NotificationStatus,
      recipient: '*****6789',
      subject: 'Teste',
      message: 'Mensagem',
      providerMessageId: null,
      errorMessage: 'Falha',
      attemptCount: 1,
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deduplicationKey: null,
    };
    const findFirst = jest.fn((args: { select?: unknown }) =>
      Promise.resolve(
        args.select
          ? {
              ...raw,
              customer: null,
              site: null,
              device: null,
              incident: null,
            }
          : raw,
      ),
    );
    const update = jest.fn((args: { data: { status: NotificationStatus } }) => {
      raw.status = args.data.status;
      return Promise.resolve(raw);
    });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new NotificationService({
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      notification: { findFirst, updateMany, update },
    } as unknown as PrismaService);

    await expect(service.retry('notification-1')).resolves.toEqual(
      expect.objectContaining({ status: NotificationStatus.SENT }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'notification-1', status: NotificationStatus.FAILED },
      data: {
        status: NotificationStatus.PENDING,
        attemptCount: { increment: 1 },
        errorMessage: null,
      },
    });

    raw.status = NotificationStatus.SENT;
    await expect(service.retry('notification-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retorna conflito quando outro retry já reservou a notificação', async () => {
    const service = new NotificationService({
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'notification-1',
          status: NotificationStatus.FAILED,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaService);

    await expect(service.retry('notification-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejeita tipos inválidos nas preferências antes de consultar o cliente', async () => {
    const customerFindFirst = jest.fn();
    const service = new NotificationService({
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      customer: { findFirst: customerFindFirst },
    } as unknown as PrismaService);

    await expect(
      service.updatePreferences({
        customerId: 123 as unknown as string,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updatePreferences({
        telegramEnabled: 'false' as unknown as boolean,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(customerFindFirst).not.toHaveBeenCalled();
  });
});
