import { Injectable, Logger } from '@nestjs/common';
import { CheckType, DeviceStatus } from '@prisma/client';

export type StatusChangeAlert = {
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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  private readonly telegramChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  private readonly telegramTimeoutMs = 5_000;

  async notifyStatusChange(
    alert: StatusChangeAlert,
  ): Promise<NotificationDispatchResult | null> {
    const transition = `${alert.previousStatus}:${alert.newStatus}`;
    if (!ALERT_TRANSITIONS.has(transition)) return null;

    return this.dispatch(this.formatStatusChangeMessage(alert));
  }

  async sendTest() {
    const result = await this.dispatch(
      `Teste de alerta iGuard em ${new Date().toISOString()}`,
    );

    return {
      success: result.telegram !== 'failed',
      message:
        result.telegram === 'skipped'
          ? 'Teste registrado no canal EMAIL; Telegram não configurado.'
          : 'Teste de notificação processado.',
      channels: result,
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
    if (alert.errorMessage) {
      lines.push(`Erro: ${alert.errorMessage}`);
    }

    return lines.join('\n');
  }

  private async dispatch(message: string): Promise<NotificationDispatchResult> {
    const email = this.sendEmailPlaceholder(message);
    const telegram = await this.sendTelegram(message);
    return { email, telegram };
  }

  private sendEmailPlaceholder(message: string): ChannelStatus {
    // O monitor:once mantém logs de aviso habilitados, tornando o placeholder
    // visível também nas execuções automáticas.
    this.logger.warn(`[EMAIL placeholder]\n${message}`);
    return 'logged';
  }

  private async sendTelegram(message: string): Promise<ChannelStatus> {
    if (!this.telegramBotToken || !this.telegramChatId) {
      this.logger.warn(
        'Telegram não configurado; defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.',
      );
      return 'skipped';
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
        return 'failed';
      }

      return 'sent';
    } catch (error) {
      this.logger.error(
        error instanceof Error
          ? `Falha ao enviar Telegram: ${error.message}`
          : 'Falha desconhecida ao enviar Telegram.',
      );
      return 'failed';
    } finally {
      clearTimeout(timeout);
    }
  }
}
