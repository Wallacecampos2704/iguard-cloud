import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RetryNotificationButton } from "@/components/notifications/RetryNotificationButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getNotification,
  getNotifications,
  getNotificationStats,
  type Notification,
  type NotificationChannel,
  type NotificationFilters,
  type NotificationStatus,
  type NotificationType,
} from "@/lib/notifications";

type SearchParams = Record<string, string | string[] | undefined>;

const channelLabels: Record<NotificationChannel, string> = {
  EMAIL: "E-mail",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  PUSH: "Push",
};

const typeLabels: Record<NotificationType, string> = {
  DEVICE_OFFLINE: "Equipamento offline",
  DEVICE_ONLINE: "Equipamento recuperado",
  DEVICE_WARNING: "Equipamento em atenção",
  INCIDENT_OPENED: "Incidente aberto",
  INCIDENT_RESOLVED: "Incidente resolvido",
  TEST: "Teste",
};

const statusLabels: Record<NotificationStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviada",
  FAILED: "Falhou",
  SKIPPED: "Ignorada",
};

const statusStyles: Record<NotificationStatus, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/20",
  SENT: "bg-success/10 text-success border-success/20",
  FAILED: "bg-danger/10 text-danger border-danger/20",
  SKIPPED: "bg-surface-elevated text-muted border-border",
};

const notificationStatuses = [
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED",
] as const;
const notificationChannels = [
  "EMAIL",
  "TELEGRAM",
  "WHATSAPP",
  "SMS",
  "PUSH",
] as const;
const notificationTypes = [
  "DEVICE_OFFLINE",
  "DEVICE_ONLINE",
  "DEVICE_WARNING",
  "INCIDENT_OPENED",
  "INCIDENT_RESOLVED",
  "TEST",
] as const;

const filterClassName =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/60";

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnum<T extends string>(
  value: string | undefined,
  values: readonly T[],
): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function createNotificationsHref(
  current: SearchParams,
  changes: Record<string, string | number | null>,
) {
  const query = new URLSearchParams();
  const allowedKeys = [
    "status",
    "channel",
    "type",
    "customerId",
    "deviceId",
    "dateFrom",
    "dateTo",
    "page",
    "pageSize",
    "detail",
  ];

  for (const key of allowedKeys) {
    const value = readValue(current[key]);
    if (value) query.set(key, value);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") query.delete(key);
    else query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `/notificacoes?${serialized}` : "/notificacoes";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "success" | "danger" | "muted";
}) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    muted: "bg-surface-elevated text-muted",
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}
          aria-hidden="true"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </span>
      </div>
    </Card>
  );
}

function NotificationDetails({
  notification,
  closeHref,
}: {
  notification: Notification;
  closeHref: string;
}) {
  return (
    <Card className="border-accent/30 bg-accent/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Detalhes da notificação
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {notification.subject || typeLabels[notification.type]}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Criada em {formatDateTime(notification.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusStyles[notification.status]}>
            {statusLabels[notification.status]}
          </Badge>
          <Link
            href={closeHref}
            scroll={false}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
          >
            Fechar
          </Link>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Canal</dt>
          <dd className="mt-1 text-sm font-medium">
            {channelLabels[notification.channel]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Destino</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.recipient || "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cliente</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.customer?.name || "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Equipamento</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.device?.name || "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Tentativas</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.attemptCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Enviada em</dt>
          <dd className="mt-1 text-sm font-medium">
            {formatDateTime(notification.sentAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Site</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.site?.name || "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Incidente</dt>
          <dd className="mt-1 text-sm font-medium">
            {notification.incident?.title || "Não relacionado"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-border bg-surface/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Mensagem
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
          {notification.message}
        </p>
      </div>

      {notification.errorMessage && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-danger">
            Erro do envio
          </p>
          <p className="mt-2 break-words text-sm text-danger">
            {notification.errorMessage}
          </p>
        </div>
      )}

      {notification.status === "FAILED" && (
        <div className="mt-5">
          <RetryNotificationButton notificationId={notification.id} />
        </div>
      )}
    </Card>
  );
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parsePositiveInteger(readValue(params.page), 1);
  const requestedPageSize = parsePositiveInteger(
    readValue(params.pageSize),
    10,
  );
  const pageSize = [10, 20, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const filters: NotificationFilters = {
    page,
    pageSize,
    status: readEnum(readValue(params.status), notificationStatuses),
    channel: readEnum(readValue(params.channel), notificationChannels),
    type: readEnum(readValue(params.type), notificationTypes),
    customerId: readValue(params.customerId)?.trim() || undefined,
    deviceId: readValue(params.deviceId)?.trim() || undefined,
    dateFrom: readValue(params.dateFrom) || undefined,
    dateTo: readValue(params.dateTo) || undefined,
  };
  const detailId = readValue(params.detail)?.trim();

  const notificationPromise = getNotifications(filters);
  const statsPromise = getNotificationStats();
  const detailPromise = detailId
    ? getNotification(detailId)
    : Promise.resolve({ data: null, hasError: false });
  const [notifications, stats, detail] = await Promise.all([
    notificationPromise,
    statsPromise,
    detailPromise,
  ]);

  const firstItem =
    notifications.total === 0
      ? 0
      : (notifications.page - 1) * notifications.pageSize + 1;
  const lastItem = Math.min(
    notifications.total,
    notifications.page * notifications.pageSize,
  );
  const startPage = Math.max(1, notifications.page - 2);
  const endPage = Math.min(notifications.totalPages, notifications.page + 2);
  const visiblePages = Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, index) => startPage + index,
  );
  const closeDetailHref = createNotificationsHref(params, { detail: null });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader
          title="Central de notificações"
          description="Acompanhe tentativas, entregas, falhas e alertas ignorados"
        />
        <main className="space-y-6 p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Enviadas hoje"
              value={stats.sentToday}
              tone="success"
            />
            <StatCard label="Falhas" value={stats.failed} tone="danger" />
            <StatCard label="Ignoradas" value={stats.skipped} tone="muted" />
            <StatCard label="Total" value={stats.total} tone="accent" />
          </div>

          {(notifications.hasError || stats.hasError) && (
            <Card className="border-danger/30 bg-danger/5">
              <h2 className="font-semibold text-danger">
                Não foi possível atualizar todos os dados
              </h2>
              <p className="mt-1 text-sm text-muted">
                Verifique a conexão com a API e tente atualizar a página.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Filtros</h2>
              <p className="mt-1 text-xs text-muted">
                Combine os campos para localizar uma tentativa específica.
              </p>
            </div>
            <form
              method="get"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="text-xs font-medium text-muted">
                Status
                <select
                  className={filterClassName}
                  name="status"
                  defaultValue={filters.status ?? ""}
                >
                  <option value="">Todos</option>
                  {notificationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted">
                Canal
                <select
                  className={filterClassName}
                  name="channel"
                  defaultValue={filters.channel ?? ""}
                >
                  <option value="">Todos</option>
                  {notificationChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channelLabels[channel]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted">
                Tipo
                <select
                  className={filterClassName}
                  name="type"
                  defaultValue={filters.type ?? ""}
                >
                  <option value="">Todos</option>
                  {notificationTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted">
                Itens por página
                <select
                  className={filterClassName}
                  name="pageSize"
                  defaultValue={String(filters.pageSize)}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </label>
              <label className="text-xs font-medium text-muted">
                ID do cliente
                <input
                  className={filterClassName}
                  type="text"
                  name="customerId"
                  defaultValue={filters.customerId ?? ""}
                  placeholder="UUID do cliente"
                />
              </label>
              <label className="text-xs font-medium text-muted">
                ID do equipamento
                <input
                  className={filterClassName}
                  type="text"
                  name="deviceId"
                  defaultValue={filters.deviceId ?? ""}
                  placeholder="UUID do equipamento"
                />
              </label>
              <label className="text-xs font-medium text-muted">
                Data inicial
                <input
                  className={filterClassName}
                  type="date"
                  name="dateFrom"
                  defaultValue={filters.dateFrom ?? ""}
                />
              </label>
              <label className="text-xs font-medium text-muted">
                Data final
                <input
                  className={filterClassName}
                  type="date"
                  name="dateTo"
                  defaultValue={filters.dateTo ?? ""}
                />
              </label>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-cyan-400"
                >
                  Aplicar filtros
                </button>
                <Link
                  href="/notificacoes"
                  className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
                >
                  Limpar
                </Link>
              </div>
            </form>
          </Card>

          {detail.hasError && (
            <Card className="border-danger/30 bg-danger/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-danger">
                    Não foi possível carregar a notificação selecionada
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Ela pode ter sido removida ou a API está indisponível.
                  </p>
                </div>
                <Link
                  href={closeDetailHref}
                  className="text-sm text-accent hover:underline"
                >
                  Fechar
                </Link>
              </div>
            </Card>
          )}

          {detail.data && (
            <NotificationDetails
              notification={detail.data}
              closeHref={closeDetailHref}
            />
          )}

          {!notifications.hasError && notifications.items.length === 0 && (
            <Card className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022 23.848 23.848 0 0 0 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
              </div>
              <h2 className="mt-4 font-semibold">
                Nenhuma notificação encontrada
              </h2>
              <p className="mt-2 text-sm text-muted">
                Novas tentativas aparecerão aqui. Se houver filtros ativos,
                experimente removê-los.
              </p>
            </Card>
          )}

          {notifications.items.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Tentativas registradas</h2>
                  <p className="mt-1 text-xs text-muted">
                    Exibindo {firstItem}–{lastItem} de {notifications.total}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  Mais recentes primeiro
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-surface-elevated/60 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Data/hora</th>
                      <th className="px-5 py-3 font-medium">Cliente</th>
                      <th className="px-5 py-3 font-medium">Equipamento</th>
                      <th className="px-5 py-3 font-medium">Tipo</th>
                      <th className="px-5 py-3 font-medium">Canal</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {notifications.items.map((notification) => (
                      <tr
                        key={notification.id}
                        className="transition hover:bg-surface-elevated/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                          {formatDateTime(notification.createdAt)}
                        </td>
                        <td className="max-w-44 truncate px-5 py-4">
                          {notification.customer?.name || "—"}
                        </td>
                        <td className="max-w-44 truncate px-5 py-4">
                          {notification.device?.name || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {typeLabels[notification.type]}
                        </td>
                        <td className="px-5 py-4">
                          {channelLabels[notification.channel]}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={statusStyles[notification.status]}>
                            {statusLabels[notification.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <Link
                              href={createNotificationsHref(params, {
                                detail: notification.id,
                              })}
                              scroll={false}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent transition hover:border-accent/40 hover:bg-accent/5"
                            >
                              Detalhes
                            </Link>
                            {notification.status === "FAILED" && (
                              <RetryNotificationButton
                                notificationId={notification.id}
                                compact
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {notifications.totalPages > 1 && (
                <nav
                  className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  aria-label="Paginação de notificações"
                >
                  <p className="text-xs text-muted">
                    Página {notifications.page} de {notifications.totalPages}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {notifications.page > 1 ? (
                      <Link
                        href={createNotificationsHref(params, {
                          page: notifications.page - 1,
                          detail: null,
                        })}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
                      >
                        Anterior
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs text-muted opacity-40">
                        Anterior
                      </span>
                    )}

                    {visiblePages.map((pageNumber) => (
                      <Link
                        key={pageNumber}
                        href={createNotificationsHref(params, {
                          page: pageNumber,
                          detail: null,
                        })}
                        aria-current={
                          pageNumber === notifications.page ? "page" : undefined
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          pageNumber === notifications.page
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-border text-muted hover:border-accent/40 hover:text-foreground"
                        }`}
                      >
                        {pageNumber}
                      </Link>
                    ))}

                    {notifications.page < notifications.totalPages ? (
                      <Link
                        href={createNotificationsHref(params, {
                          page: notifications.page + 1,
                          detail: null,
                        })}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
                      >
                        Próxima
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs text-muted opacity-40">
                        Próxima
                      </span>
                    )}
                  </div>
                </nav>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
