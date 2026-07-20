import "server-only";
import { authenticatedApiFetch } from "@/lib/api-auth";

export type NotificationChannel =
  | "EMAIL"
  | "TELEGRAM"
  | "WHATSAPP"
  | "SMS"
  | "PUSH";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type NotificationType =
  | "DEVICE_OFFLINE"
  | "DEVICE_ONLINE"
  | "DEVICE_WARNING"
  | "INCIDENT_OPENED"
  | "INCIDENT_RESOLVED"
  | "TEST";

type NotificationRelation = {
  id?: string;
  name: string;
};

type NotificationIncident = {
  id?: string;
  title: string;
  status?: string;
};

export type Notification = {
  id: string;
  organizationId: string;
  customerId: string | null;
  siteId: string | null;
  deviceId: string | null;
  incidentId: string | null;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string | null;
  subject: string | null;
  message: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  deduplicationKey?: string | null;
  customer: NotificationRelation | null;
  site: NotificationRelation | null;
  device: NotificationRelation | null;
  incident: NotificationIncident | null;
};

export type NotificationFilters = {
  status?: NotificationStatus;
  channel?: NotificationChannel;
  type?: NotificationType;
  customerId?: string;
  deviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export type NotificationsPage = {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasError: boolean;
};

export type NotificationStats = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  sentToday: number;
};

export type NotificationStatsResult = NotificationStats & {
  hasError: boolean;
};

export type NotificationDetailResult = {
  data: Notification | null;
  hasError: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNonNegativeInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

function isNotification(value: unknown): value is Notification {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    typeof value.createdAt === "string" &&
    ["EMAIL", "TELEGRAM", "WHATSAPP", "SMS", "PUSH"].includes(
      String(value.channel),
    ) &&
    ["PENDING", "SENT", "FAILED", "SKIPPED"].includes(
      String(value.status),
    ) &&
    [
      "DEVICE_OFFLINE",
      "DEVICE_ONLINE",
      "DEVICE_WARNING",
      "INCIDENT_OPENED",
      "INCIDENT_RESOLVED",
      "TEST",
    ].includes(String(value.type))
  );
}

function buildNotificationsQuery(filters: NotificationFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });

  const optionalFilters: Array<
    [keyof Omit<NotificationFilters, "page" | "pageSize">, string | undefined]
  > = [
    ["status", filters.status],
    ["channel", filters.channel],
    ["type", filters.type],
    ["customerId", filters.customerId],
    ["deviceId", filters.deviceId],
    ["dateFrom", filters.dateFrom],
    ["dateTo", filters.dateTo],
  ];

  for (const [key, value] of optionalFilters) {
    if (value) query.set(key, value);
  }

  return query;
}

export async function getNotifications(
  filters: NotificationFilters,
): Promise<NotificationsPage> {
  const fallback: NotificationsPage = {
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    total: 0,
    totalPages: 0,
    hasError: true,
  };

  try {
    const query = buildNotificationsQuery(filters);
    const path: `/${string}` = `/notifications?${query.toString()}`;
    const result = await authenticatedApiFetch(path, {
      cache: "no-store",
    });

    if (!result.ok) return fallback;

    const { response } = result;
    if (!response.ok) return fallback;

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || !Array.isArray(payload.items)) return fallback;

    return {
      items: payload.items.filter(isNotification),
      page: Math.max(1, toNonNegativeInteger(payload.page, filters.page)),
      pageSize: Math.max(
        1,
        toNonNegativeInteger(payload.pageSize, filters.pageSize),
      ),
      total: toNonNegativeInteger(payload.total),
      totalPages: toNonNegativeInteger(payload.totalPages),
      hasError: false,
    };
  } catch {
    return fallback;
  }
}

export async function getNotificationStats(): Promise<NotificationStatsResult> {
  const fallback: NotificationStatsResult = {
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    sentToday: 0,
    hasError: true,
  };

  try {
    const result = await authenticatedApiFetch("/notifications/stats", {
      cache: "no-store",
    });
    if (!result.ok) return fallback;

    const { response } = result;
    if (!response.ok) return fallback;

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) return fallback;

    return {
      total: toNonNegativeInteger(payload.total),
      sent: toNonNegativeInteger(payload.sent),
      failed: toNonNegativeInteger(payload.failed),
      skipped: toNonNegativeInteger(payload.skipped),
      sentToday: toNonNegativeInteger(payload.sentToday),
      hasError: false,
    };
  } catch {
    return fallback;
  }
}

export async function getNotification(
  id: string,
): Promise<NotificationDetailResult> {
  try {
    const path: `/${string}` = `/notifications/${encodeURIComponent(id)}`;
    const result = await authenticatedApiFetch(path, { cache: "no-store" });
    if (!result.ok) return { data: null, hasError: true };

    const { response } = result;
    if (!response.ok) return { data: null, hasError: true };

    const payload = (await response.json()) as unknown;
    if (!isNotification(payload)) return { data: null, hasError: true };

    return { data: payload, hasError: false };
  } catch {
    return { data: null, hasError: true };
  }
}
