import { Logger } from '@nestjs/common';
import { CheckType, DeviceStatus } from '@prisma/client';
import { NotificationService, StatusChangeAlert } from './notification.service';

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
      ).resolves.toEqual({ email: 'logged', telegram: 'skipped' });
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
      email: 'logged',
      telegram: 'skipped',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('processa o teste sem token do Telegram sem quebrar a API', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = new NotificationService();

    await expect(service.sendTest()).resolves.toEqual({
      success: true,
      message: 'Teste registrado no canal EMAIL; Telegram não configurado.',
      channels: {
        email: 'logged',
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
      email: 'logged',
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
      email: 'logged',
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
      email: 'logged',
      telegram: 'failed',
    });
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('conexão indisponível'),
    );
  });
});
