import "server-only";

export type NotificationPreferences = {
  id?: string;
  organizationId?: string;
  customerId?: string | null;
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

export type NotificationPreferencesResult = {
  data: NotificationPreferences;
  hasError: boolean;
};

export const NOTIFICATION_PREFERENCES_URL = `${process.env.API_URL ?? "http://localhost:4000"}/notification-preferences`;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  telegramEnabled: false,
  emailEnabled: false,
  whatsappEnabled: false,
  smsEnabled: false,
  alertOnOffline: true,
  alertOnRecovery: true,
  alertOnWarning: true,
  confirmationDelaySeconds: 0,
  cooldownMinutes: 0,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  timezone: "America/Sao_Paulo",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

function toNullableString(value: unknown, fallback: string | null) {
  return typeof value === "string" ? value : value === null ? null : fallback;
}

function normalizePreferences(value: unknown): NotificationPreferences | null {
  if (!isRecord(value)) return null;

  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    organizationId:
      typeof value.organizationId === "string"
        ? value.organizationId
        : undefined,
    customerId:
      typeof value.customerId === "string" || value.customerId === null
        ? value.customerId
        : undefined,
    telegramEnabled: toBoolean(
      value.telegramEnabled,
      defaults.telegramEnabled,
    ),
    emailEnabled: toBoolean(value.emailEnabled, defaults.emailEnabled),
    whatsappEnabled: toBoolean(
      value.whatsappEnabled,
      defaults.whatsappEnabled,
    ),
    smsEnabled: toBoolean(value.smsEnabled, defaults.smsEnabled),
    alertOnOffline: toBoolean(value.alertOnOffline, defaults.alertOnOffline),
    alertOnRecovery: toBoolean(
      value.alertOnRecovery,
      defaults.alertOnRecovery,
    ),
    alertOnWarning: toBoolean(value.alertOnWarning, defaults.alertOnWarning),
    confirmationDelaySeconds: toNonNegativeInteger(
      value.confirmationDelaySeconds,
      defaults.confirmationDelaySeconds,
    ),
    cooldownMinutes: toNonNegativeInteger(
      value.cooldownMinutes,
      defaults.cooldownMinutes,
    ),
    quietHoursEnabled: toBoolean(
      value.quietHoursEnabled,
      defaults.quietHoursEnabled,
    ),
    quietHoursStart: toNullableString(
      value.quietHoursStart,
      defaults.quietHoursStart,
    ),
    quietHoursEnd: toNullableString(
      value.quietHoursEnd,
      defaults.quietHoursEnd,
    ),
    timezone:
      typeof value.timezone === "string" ? value.timezone : defaults.timezone,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResult> {
  try {
    const response = await fetch(NOTIFICATION_PREFERENCES_URL, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { data: DEFAULT_NOTIFICATION_PREFERENCES, hasError: true };
    }

    const payload = (await response.json()) as unknown;
    const data = normalizePreferences(payload);
    if (!data) {
      return { data: DEFAULT_NOTIFICATION_PREFERENCES, hasError: true };
    }

    return { data, hasError: false };
  } catch {
    return { data: DEFAULT_NOTIFICATION_PREFERENCES, hasError: true };
  }
}
