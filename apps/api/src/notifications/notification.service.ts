import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  CheckType,
  DeviceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type StatusChangeAlert = {
  organizationId: string;
  customerId: string | null;
  siteId: string | null;
  deviceId: string;
  incidentId: string | null;
  name: string;
  host: string;
  port: number | null;
  checkType: CheckType;
  previousStatus: DeviceStatus;
  newStatus: DeviceStatus;
  checkedAt: Date;
  responseTimeMs: number | null;
  errorMessage: string | null;
};

type ChannelStatus = 'logged' | 'sent' | 'skipped' | 'failed';

export type NotificationDispatchResult = {
  email: ChannelStatus;
  telegram: ChannelStatus;
};

export type NotificationListQuery = {
  status?: string;
  channel?: string;
  type?: string;
  customerId?: string;
  deviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string | number;
  pageSize?: string | number;
};

export type NotificationPreferenceInput = {
  customerId?: string | null;
  telegramEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  smsEnabled?: boolean;
  alertOnOffline?: boolean;
  alertOnRecovery?: boolean;
  alertOnWarning?: boolean;
  confirmationDelaySeconds?: number;
  cooldownMinutes?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
};

type EffectivePreference = {
  telegramEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  alertOnOffline: boolean;
  alertOnRecovery: boolean;
  alertOnWarning: boolean;
  confirmationDelaySeconds: number;
  cooldownMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

type DispatchContext = {
  organizationId: string;
  customerId: string | null;
  siteId: string | null;
  deviceId: string | null;
  incidentId: string | null;
  type: NotificationType;
  subject: string;
  message: string;
  occurredAt: Date;
};

type TelegramResult = {
  status: Extract<NotificationStatus, 'SENT' | 'FAILED' | 'SKIPPED'>;
  providerMessageId: string | null;
  errorMessage: string | null;
};

const ALERT_TRANSITIONS = new Set([
  `${DeviceStatus.ONLINE}:${DeviceStatus.OFFLINE}`,
  `${DeviceStatus.OFFLINE}:${DeviceStatus.ONLINE}`,
  `${DeviceStatus.WARNING}:${DeviceStatus.OFFLINE}`,
  `${DeviceStatus.OFFLINE}:${DeviceStatus.WARNING}`,
  `${DeviceStatus.ONLINE}:${DeviceStatus.WARNING}`,
  `${DeviceStatus.WARNING}:${DeviceStatus.ONLINE}`,
]);

const ALERT_TITLES: Partial<Record<DeviceStatus, string>> = {
  [DeviceStatus.OFFLINE]: '🚨 iGuard Alerta: equipamento OFFLINE',
  [DeviceStatus.ONLINE]: '✅ iGuard: equipamento voltou ONLINE',
  [DeviceStatus.WARNING]: '⚠️ iGuard Atenção: equipamento em WARNING',
};

const PUBLIC_NOTIFICATION_SELECT = {
  id: true,
  organizationId: true,
  customerId: true,
  siteId: true,
  deviceId: true,
  incidentId: true,
  channel: true,
  type: true,
  status: true,
  recipient: true,
  subject: true,
  message: true,
  providerMessageId: true,
  errorMessage: true,
  attemptCount: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { name: true } },
  site: { select: { name: true } },
  device: { select: { name: true } },
  incident: { select: { title: true, status: true } },
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegramTimeoutMs = 5_000;

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async notifyStatusChange(
    alert: StatusChangeAlert,
  ): Promise<NotificationDispatchResult | null> {
    const transition = `${alert.previousStatus}:${alert.newStatus}`;
    if (!ALERT_TRANSITIONS.has(transition)) return null;

    const type = this.mapNotificationType(alert.newStatus);
    const subject =
      ALERT_TITLES[alert.newStatus] ?? 'iGuard: mudança de status';
    const context: DispatchContext = {
      organizationId: alert.organizationId,
      customerId: alert.customerId,
      siteId: alert.siteId,
      deviceId: alert.deviceId,
      incidentId: alert.incidentId,
      type,
      subject,
      message: this.formatStatusChangeMessage(alert),
      occurredAt: alert.checkedAt,
    };

    return this.dispatch(context);
  }

  async sendTest(organizationId?: string) {
    if (!this.prisma) {
      const result = await this.dispatchWithoutPersistence(
        `Teste de alerta iGuard em ${new Date().toISOString()}`,
      );
      return this.testResponse(result);
    }

    const resolvedOrganizationId =
      await this.resolveOrganizationId(organizationId);
    const now = new Date();
    const result = await this.dispatch({
      organizationId: resolvedOrganizationId,
      customerId: null,
      siteId: null,
      deviceId: null,
      incidentId: null,
      type: NotificationType.TEST,
      subject: 'Teste de notificação iGuard',
      message: `Teste de alerta iGuard em ${now.toISOString()}`,
      occurredAt: now,
    });

    return this.testResponse(result);
  }

  async findAll(query: NotificationListQuery = {}) {
    const prisma = this.requirePrisma();
    const organizationId = await this.resolveOrganizationId();
    const customerId = this.validateOptionalIdentifier(
      query.customerId,
      'customerId',
    );
    const deviceId = this.validateOptionalIdentifier(
      query.deviceId,
      'deviceId',
    );
    const page = this.parseInteger(query.page, 1, 1, 1_000_000, 'page');
    const pageSize = this.parseInteger(query.pageSize, 20, 1, 100, 'pageSize');
    const dateFrom = this.parseDate(query.dateFrom, 'dateFrom');
    const dateTo = this.parseDate(query.dateTo, 'dateTo', true);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        'dateFrom não pode ser posterior a dateTo.',
      );
    }

    const where: Prisma.NotificationWhereInput = {
      organizationId,
      ...(customerId ? { customerId } : {}),
      ...(deviceId ? { deviceId } : {}),
      ...(query.status
        ? {
            status: this.parseEnum(query.status, NotificationStatus, 'status'),
          }
        : {}),
      ...(query.channel
        ? {
            channel: this.parseEnum(
              query.channel,
              NotificationChannel,
              'channel',
            ),
          }
        : {}),
      ...(query.type
        ? { type: this.parseEnum(query.type, NotificationType, 'type') }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: PUBLIC_NOTIFICATION_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toPublicNotification(record)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getStats(customerId?: string) {
    const prisma = this.requirePrisma();
    const organizationId = await this.resolveOrganizationId();
    const scope = {
      ...(organizationId ? { organizationId } : {}),
      ...(customerId ? { customerId } : {}),
    } satisfies Prisma.NotificationWhereInput;
    const today = this.startOfTodayInSaoPaulo();

    const [total, sent, failed, skipped, sentToday] = await Promise.all([
      prisma.notification.count({ where: scope }),
      prisma.notification.count({
        where: { ...scope, status: NotificationStatus.SENT },
      }),
      prisma.notification.count({
        where: { ...scope, status: NotificationStatus.FAILED },
      }),
      prisma.notification.count({
        where: { ...scope, status: NotificationStatus.SKIPPED },
      }),
      prisma.notification.count({
        where: {
          ...scope,
          status: NotificationStatus.SENT,
          sentAt: { gte: today },
        },
      }),
    ]);

    return { total, sent, failed, skipped, sentToday };
  }

  async findOne(id: string) {
    const organizationId = await this.resolveOrganizationId();
    const notification = await this.requirePrisma().notification.findFirst({
      where: { id, organizationId },
      select: PUBLIC_NOTIFICATION_SELECT,
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    return this.toPublicNotification(notification);
  }

  async retry(id: string) {
    const prisma = this.requirePrisma();
    const organizationId = await this.resolveOrganizationId();
    const notification = await prisma.notification.findFirst({
      where: { id, organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    if (notification.status !== NotificationStatus.FAILED) {
      throw new BadRequestException(
        'Somente notificações com status FAILED podem ser reenviadas.',
      );
    }

    const reserved = await prisma.notification.updateMany({
      where: { id, status: NotificationStatus.FAILED },
      data: {
        status: NotificationStatus.PENDING,
        attemptCount: { increment: 1 },
        errorMessage: null,
      },
    });
    if (reserved.count !== 1) {
      throw new ConflictException('A notificação já está sendo reenviada.');
    }

    const result = await this.retryChannel(
      notification.channel,
      notification.message,
    );
    await prisma.notification.update({
      where: { id },
      data: {
        status: result.status,
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage,
        sentAt: result.status === NotificationStatus.SENT ? new Date() : null,
      },
    });

    return this.findOne(id);
  }

  async getPreferences(organizationId?: string, customerId?: string) {
    const validatedCustomerId = this.validateOptionalIdentifier(
      customerId,
      'customerId',
    );
    const resolvedOrganizationId =
      await this.resolveOrganizationId(organizationId);
    const preference = await this.findStoredPreference(
      resolvedOrganizationId,
      validatedCustomerId,
    );

    return (
      preference ?? {
        id: null,
        organizationId: resolvedOrganizationId,
        customerId: validatedCustomerId,
        ...this.defaultPreference(),
        createdAt: null,
        updatedAt: null,
      }
    );
  }

  async updatePreferences(input: NotificationPreferenceInput) {
    const prisma = this.requirePrisma();
    this.validatePreferenceInputTypes(input);
    const organizationId = await this.resolveOrganizationId(undefined);
    const customerId = this.validateOptionalIdentifier(
      input.customerId,
      'customerId',
    );
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, organizationId },
        select: { id: true },
      });
      if (!customer) {
        throw new BadRequestException(
          'Cliente não encontrado para a organização informada.',
        );
      }
    }

    const current = await this.findStoredPreference(organizationId, customerId);
    const data = this.validatePreference({
      ...this.defaultPreference(),
      ...current,
      ...input,
    });

    if (customerId) {
      return prisma.notificationPreference.upsert({
        where: { customerId },
        create: { organizationId, customerId, ...data },
        update: data,
      });
    }

    if (current) {
      return prisma.notificationPreference.update({
        where: { id: current.id },
        data,
      });
    }

    if (typeof input.timezone !== 'string' || !input.timezone.trim()) {
      throw new BadRequestException('timezone inválido.');
    }
    try {
      return await prisma.notificationPreference.create({
        data: { organizationId, customerId: null, ...data },
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
      const concurrent = await this.findStoredPreference(organizationId, null);
      if (!concurrent) throw error;
      return prisma.notificationPreference.update({
        where: { id: concurrent.id },
        data,
      });
    }
  }

  private async dispatch(
    context: DispatchContext,
  ): Promise<NotificationDispatchResult> {
    if (!this.prisma) {
      return this.dispatchWithoutPersistence(context.message);
    }

    const preference = await this.getEffectivePreference(
      context.organizationId,
      context.customerId,
    );
    const [email, telegram] = await Promise.all([
      this.dispatchChannel(NotificationChannel.EMAIL, context, preference),
      this.dispatchChannel(NotificationChannel.TELEGRAM, context, preference),
    ]);

    return { email, telegram };
  }

  private async dispatchChannel(
    channel: Extract<NotificationChannel, 'EMAIL' | 'TELEGRAM'>,
    context: DispatchContext,
    preference: EffectivePreference,
  ): Promise<ChannelStatus> {
    const prisma = this.requirePrisma();
    const deduplicationKey = context.incidentId
      ? `${context.incidentId}:${context.type}`
      : context.type === NotificationType.TEST
        ? null
        : `${context.deviceId ?? 'unknown'}:${context.type}:${context.occurredAt.toISOString()}`;

    if (deduplicationKey) {
      const existing = await prisma.notification.findUnique({
        where: {
          channel_deduplicationKey: { channel, deduplicationKey },
        },
        select: { status: true },
      });
      if (existing) return this.toChannelStatus(existing.status);
    }

    const skipReason = await this.getSkipReason(channel, context, preference);
    if (skipReason) {
      const skipped = await this.createNotificationSafely({
        ...context,
        channel,
        deduplicationKey,
        status: NotificationStatus.SKIPPED,
        recipient: this.recipientFor(channel),
        errorMessage: skipReason,
        attemptCount: 0,
      });
      return skipped.created ? 'skipped' : this.toChannelStatus(skipped.status);
    }

    if (channel === NotificationChannel.EMAIL) {
      this.logger.warn(
        '[EMAIL placeholder] Notificação registrada sem envio SMTP.',
      );
      const skipped = await this.createNotificationSafely({
        ...context,
        channel,
        deduplicationKey,
        status: NotificationStatus.SKIPPED,
        recipient: null,
        errorMessage:
          'Canal EMAIL ainda é um placeholder; SMTP não configurado.',
        attemptCount: 0,
      });
      return skipped.created ? 'skipped' : this.toChannelStatus(skipped.status);
    }

    const pending = await this.createNotificationSafely({
      ...context,
      channel,
      deduplicationKey,
      status: NotificationStatus.PENDING,
      recipient: this.recipientFor(channel),
      errorMessage: null,
      attemptCount: 1,
    });
    if (!pending.created) return this.toChannelStatus(pending.status);

    const result = await this.sendTelegram(context.message);
    await prisma.notification.update({
      where: { id: pending.id },
      data: {
        status: result.status,
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage,
        sentAt: result.status === NotificationStatus.SENT ? new Date() : null,
      },
    });
    return this.toChannelStatus(result.status);
  }

  private async createNotificationSafely(
    input: DispatchContext & {
      channel: NotificationChannel;
      deduplicationKey: string | null;
      status: NotificationStatus;
      recipient: string | null;
      errorMessage: string | null;
      attemptCount: number;
    },
  ) {
    const prisma = this.requirePrisma();
    try {
      const created = await prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          customerId: input.customerId,
          siteId: input.siteId,
          deviceId: input.deviceId,
          incidentId: input.incidentId,
          channel: input.channel,
          type: input.type,
          status: input.status,
          recipient: input.recipient,
          subject: input.subject,
          message: input.message,
          errorMessage: input.errorMessage,
          attemptCount: input.attemptCount,
          deduplicationKey: input.deduplicationKey,
        },
        select: { id: true, status: true },
      });
      return { ...created, created: true as const };
    } catch (error) {
      if (!input.deduplicationKey || !this.isUniqueViolation(error))
        throw error;
      const existing = await prisma.notification.findUnique({
        where: {
          channel_deduplicationKey: {
            channel: input.channel,
            deduplicationKey: input.deduplicationKey,
          },
        },
        select: { id: true, status: true },
      });
      if (!existing) throw error;
      return { ...existing, created: false as const };
    }
  }

  private async getSkipReason(
    channel: Extract<NotificationChannel, 'EMAIL' | 'TELEGRAM'>,
    context: DispatchContext,
    preference: EffectivePreference,
  ) {
    if (context.type === NotificationType.TEST) {
      if (
        channel === NotificationChannel.TELEGRAM &&
        (!this.telegramBotToken || !this.telegramChatId)
      ) {
        return 'Telegram não configurado.';
      }
      return null;
    }
    if (!this.isEventEnabled(context.type, preference)) {
      return 'Tipo de alerta desabilitado nas preferências.';
    }
    if (
      (channel === NotificationChannel.EMAIL && !preference.emailEnabled) ||
      (channel === NotificationChannel.TELEGRAM && !preference.telegramEnabled)
    ) {
      return `Canal ${channel} desabilitado nas preferências.`;
    }
    if (this.isQuietHours(context.occurredAt, preference)) {
      return 'Notificação suprimida pelo horário silencioso.';
    }
    if (
      channel === NotificationChannel.TELEGRAM &&
      (!this.telegramBotToken || !this.telegramChatId)
    ) {
      return 'Telegram não configurado.';
    }
    if (preference.cooldownMinutes > 0) {
      const cutoff = new Date(
        context.occurredAt.getTime() - preference.cooldownMinutes * 60_000,
      );
      const recent = await this.requirePrisma().notification.findFirst({
        where: {
          organizationId: context.organizationId,
          customerId: context.customerId,
          deviceId: context.deviceId,
          channel,
          type: context.type,
          status: NotificationStatus.SENT,
          sentAt: { gte: cutoff },
        },
        select: { id: true },
      });
      if (recent)
        return 'Notificação suprimida pelo intervalo mínimo entre alertas.';
    }
    return null;
  }

  private async retryChannel(
    channel: NotificationChannel,
    message: string,
  ): Promise<TelegramResult> {
    if (channel === NotificationChannel.TELEGRAM) {
      if (!this.telegramBotToken || !this.telegramChatId) {
        return {
          status: NotificationStatus.SKIPPED,
          providerMessageId: null,
          errorMessage: 'Telegram não configurado.',
        };
      }
      return this.sendTelegram(message);
    }

    return {
      status: NotificationStatus.SKIPPED,
      providerMessageId: null,
      errorMessage: `Reenvio do canal ${channel} ainda não implementado.`,
    };
  }

  private async sendTelegram(message: string): Promise<TelegramResult> {
    if (!this.telegramBotToken || !this.telegramChatId) {
      return {
        status: NotificationStatus.FAILED,
        providerMessageId: null,
        errorMessage: 'Telegram não configurado.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.telegramTimeoutMs,
    );
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.telegramChatId,
            text: message,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        this.logger.error(`Telegram respondeu HTTP ${response.status}.`);
        return {
          status: NotificationStatus.FAILED,
          providerMessageId: null,
          errorMessage: `Telegram respondeu HTTP ${response.status}.`,
        };
      }

      let providerMessageId: string | null = null;
      if (typeof response.json === 'function') {
        try {
          const payload = (await response.json()) as {
            result?: { message_id?: string | number };
          };
          if (payload.result?.message_id !== undefined) {
            providerMessageId = String(payload.result.message_id);
          }
        } catch {
          providerMessageId = null;
        }
      }
      return {
        status: NotificationStatus.SENT,
        providerMessageId,
        errorMessage: null,
      };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      this.logger.error(
        timedOut
          ? 'Tempo limite excedido ao enviar Telegram.'
          : 'Falha ao comunicar com Telegram.',
      );
      return {
        status: NotificationStatus.FAILED,
        providerMessageId: null,
        errorMessage: timedOut
          ? 'Tempo limite excedido ao enviar Telegram.'
          : 'Falha ao comunicar com Telegram.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async dispatchWithoutPersistence(
    message: string,
  ): Promise<NotificationDispatchResult> {
    this.logger.warn(
      '[EMAIL placeholder] Notificação registrada sem envio SMTP.',
    );
    if (!this.telegramBotToken || !this.telegramChatId) {
      this.logger.warn(
        'Telegram não configurado; defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.',
      );
      return { email: 'skipped', telegram: 'skipped' };
    }
    const telegram = await this.sendTelegram(message);
    return {
      email: 'skipped',
      telegram: this.toChannelStatus(telegram.status),
    };
  }

  private formatStatusChangeMessage(alert: StatusChangeAlert) {
    const checkType =
      alert.checkType === CheckType.TCP_PORT ? 'TCP' : alert.checkType;
    const lines = [
      ALERT_TITLES[alert.newStatus] ?? 'ℹ️ iGuard: mudança de status',
      `Equipamento: ${alert.name}`,
      `Host: ${alert.host}`,
      `Porta: ${alert.port ?? 'não informada'}`,
      `Tipo de verificação: ${checkType}`,
      `Status anterior: ${alert.previousStatus}`,
      `Novo status: ${alert.newStatus}`,
      `Data/hora: ${alert.checkedAt.toISOString()}`,
    ];
    if (alert.responseTimeMs !== null) {
      lines.push(`Tempo de resposta: ${alert.responseTimeMs} ms`);
    }
    if (alert.errorMessage) lines.push(`Erro: ${alert.errorMessage}`);
    return lines.join('\n');
  }

  private mapNotificationType(status: DeviceStatus) {
    if (status === DeviceStatus.OFFLINE) return NotificationType.DEVICE_OFFLINE;
    if (status === DeviceStatus.ONLINE) return NotificationType.DEVICE_ONLINE;
    return NotificationType.DEVICE_WARNING;
  }

  private async getEffectivePreference(
    organizationId: string,
    customerId: string | null,
  ): Promise<EffectivePreference> {
    const stored = await this.findStoredPreference(organizationId, customerId);
    return stored ?? this.defaultPreference();
  }

  private async findStoredPreference(
    organizationId: string,
    customerId: string | null,
  ) {
    const prisma = this.requirePrisma();
    if (customerId) {
      const customerPreference = await prisma.notificationPreference.findUnique(
        {
          where: { customerId },
        },
      );
      if (customerPreference?.organizationId === organizationId) {
        return customerPreference;
      }
    }
    return prisma.notificationPreference.findFirst({
      where: { organizationId, customerId: null },
    });
  }

  private defaultPreference(): EffectivePreference {
    return {
      telegramEnabled: Boolean(this.telegramBotToken && this.telegramChatId),
      emailEnabled: false,
      whatsappEnabled: false,
      smsEnabled: false,
      alertOnOffline: true,
      alertOnRecovery: true,
      alertOnWarning: true,
      confirmationDelaySeconds: 0,
      cooldownMinutes: 0,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: 'America/Sao_Paulo',
    };
  }

  private validatePreference(
    input: EffectivePreference & NotificationPreferenceInput,
  ): EffectivePreference {
    const confirmationDelaySeconds = this.validateBoundedInteger(
      input.confirmationDelaySeconds,
      0,
      86_400,
      'confirmationDelaySeconds',
    );
    const cooldownMinutes = this.validateBoundedInteger(
      input.cooldownMinutes,
      0,
      10_080,
      'cooldownMinutes',
    );
    const quietHoursStart = this.validateTime(
      input.quietHoursStart,
      'quietHoursStart',
    );
    const quietHoursEnd = this.validateTime(
      input.quietHoursEnd,
      'quietHoursEnd',
    );
    if (input.quietHoursEnabled && (!quietHoursStart || !quietHoursEnd)) {
      throw new BadRequestException(
        'Informe quietHoursStart e quietHoursEnd ao ativar o horário silencioso.',
      );
    }
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: input.timezone }).format();
    } catch {
      throw new BadRequestException('timezone inválido.');
    }

    return {
      telegramEnabled: this.validateBoolean(
        input.telegramEnabled,
        'telegramEnabled',
      ),
      emailEnabled: this.validateBoolean(input.emailEnabled, 'emailEnabled'),
      // Canais reservados para uma fase futura do MVP.
      whatsappEnabled: false,
      smsEnabled: false,
      alertOnOffline: this.validateBoolean(
        input.alertOnOffline,
        'alertOnOffline',
      ),
      alertOnRecovery: this.validateBoolean(
        input.alertOnRecovery,
        'alertOnRecovery',
      ),
      alertOnWarning: this.validateBoolean(
        input.alertOnWarning,
        'alertOnWarning',
      ),
      confirmationDelaySeconds,
      cooldownMinutes,
      quietHoursEnabled: this.validateBoolean(
        input.quietHoursEnabled,
        'quietHoursEnabled',
      ),
      quietHoursStart,
      quietHoursEnd,
      timezone: input.timezone,
    };
  }

  private validatePreferenceInputTypes(input: NotificationPreferenceInput) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Preferências inválidas.');
    }
    const booleanFields = [
      'telegramEnabled',
      'emailEnabled',
      'whatsappEnabled',
      'smsEnabled',
      'alertOnOffline',
      'alertOnRecovery',
      'alertOnWarning',
      'quietHoursEnabled',
    ] as const;

    for (const field of booleanFields) {
      if (input[field] !== undefined && typeof input[field] !== 'boolean') {
        throw new BadRequestException(`${field} deve ser booleano.`);
      }
    }

    if (input.timezone !== undefined && typeof input.timezone !== 'string') {
      throw new BadRequestException('timezone inválido.');
    }
  }

  private isEventEnabled(
    type: NotificationType,
    preference: EffectivePreference,
  ) {
    if (type === NotificationType.DEVICE_OFFLINE)
      return preference.alertOnOffline;
    if (type === NotificationType.DEVICE_ONLINE)
      return preference.alertOnRecovery;
    if (type === NotificationType.DEVICE_WARNING)
      return preference.alertOnWarning;
    return true;
  }

  private isQuietHours(date: Date, preference: EffectivePreference) {
    if (
      !preference.quietHoursEnabled ||
      !preference.quietHoursStart ||
      !preference.quietHoursEnd
    ) {
      return false;
    }
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: preference.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(
      parts.find((part) => part.type === 'minute')?.value ?? 0,
    );
    const current = hour * 60 + minute;
    const start = this.timeToMinutes(preference.quietHoursStart);
    const end = this.timeToMinutes(preference.quietHoursEnd);
    return start === end
      ? true
      : start < end
        ? current >= start && current < end
        : current >= start || current < end;
  }

  private recipientFor(channel: NotificationChannel) {
    if (channel === NotificationChannel.TELEGRAM) {
      return this.maskRecipient(this.telegramChatId ?? null);
    }
    return null;
  }

  private maskRecipient(recipient: string | null) {
    if (!recipient) return null;
    if (recipient.includes('@')) {
      const [name, domain] = recipient.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    if (recipient.length <= 4) return '*'.repeat(recipient.length);
    return `${'*'.repeat(Math.min(8, recipient.length - 4))}${recipient.slice(-4)}`;
  }

  private toPublicNotification(
    notification: Prisma.NotificationGetPayload<{
      select: typeof PUBLIC_NOTIFICATION_SELECT;
    }>,
  ) {
    return {
      ...notification,
      recipient: this.maskRecipient(notification.recipient),
      customerName: notification.customer?.name ?? null,
      siteName: notification.site?.name ?? null,
      deviceName: notification.device?.name ?? null,
      incidentTitle: notification.incident?.title ?? null,
      incidentStatus: notification.incident?.status ?? null,
    };
  }

  private testResponse(result: NotificationDispatchResult) {
    return {
      success: result.telegram !== 'failed',
      message:
        result.telegram === 'skipped'
          ? 'Teste registrado; Telegram não configurado ou desabilitado.'
          : 'Teste de notificação processado.',
      channels: result,
    };
  }

  private toChannelStatus(status: NotificationStatus): ChannelStatus {
    if (status === NotificationStatus.SENT) return 'sent';
    if (status === NotificationStatus.FAILED) return 'failed';
    return 'skipped';
  }

  private parseEnum<T extends string>(
    value: string,
    values: Record<string, T>,
    field: string,
  ): T {
    if (!Object.values(values).includes(value as T)) {
      throw new BadRequestException(`${field} inválido.`);
    }
    return value as T;
  }

  private parseDate(
    value: string | undefined,
    field: string,
    endOfDay = false,
  ) {
    if (!value) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} inválido.`);
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} inválido.`);
    }
    return date;
  }

  private parseInteger(
    value: string | number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    field: string,
  ) {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new BadRequestException(
        `${field} deve ser um inteiro entre ${minimum} e ${maximum}.`,
      );
    }
    return parsed;
  }

  private validateBoundedInteger(
    value: number,
    minimum: number,
    maximum: number,
    field: string,
  ) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new BadRequestException(
        `${field} deve ser um inteiro entre ${minimum} e ${maximum}.`,
      );
    }
    return value;
  }

  private validateBoolean(value: unknown, field: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${field} deve ser booleano.`);
    }
    return value;
  }

  private validateTime(value: string | null | undefined, field: string) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} deve usar o formato HH:mm.`);
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new BadRequestException(`${field} deve usar o formato HH:mm.`);
    }
    return value;
  }

  private validateOptionalIdentifier(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !value.trim() || value.length > 128) {
      throw new BadRequestException(`${field} inválido.`);
    }
    return value.trim();
  }

  private timeToMinutes(value: string) {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  private startOfTodayInSaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return new Date(
      `${values.year}-${values.month}-${values.day}T00:00:00-03:00`,
    );
  }

  private get telegramBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN?.trim();
  }

  private get telegramChatId() {
    return process.env.TELEGRAM_CHAT_ID?.trim();
  }

  private isUniqueViolation(error: unknown) {
    return (
      (error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : (error as { code?: string } | null)?.code) === 'P2002'
    );
  }

  private async resolveOrganizationId(organizationId?: string) {
    const prisma = this.requirePrisma();
    const organization = organizationId
      ? await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { id: true },
        })
      : await prisma.organization.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
    if (!organization) {
      throw new BadRequestException('Nenhuma organização disponível.');
    }
    return organization.id;
  }

  private requirePrisma() {
    if (!this.prisma) {
      throw new Error('PrismaService não disponível no contexto atual.');
    }
    return this.prisma;
  }
}
