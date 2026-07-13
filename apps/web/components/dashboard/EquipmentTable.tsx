import { StatusDot } from "@/components/ui/StatusDot";
import { Badge } from "@/components/ui/Badge";
import {
  getDashboardDevices,
  type ApiDeviceStatus,
  type DashboardDevice,
} from "@/lib/dashboard-devices";

type EquipmentStatus = "online" | "attention" | "offline" | "neutral";

const statusLabels: Record<ApiDeviceStatus, string> = {
  ONLINE: "Online",
  WARNING: "Atenção",
  OFFLINE: "Offline",
  UNKNOWN: "Desconhecido",
  MAINTENANCE: "Manutenção",
};

const statusBadgeVariant: Record<
  ApiDeviceStatus,
  "default" | "success" | "warning" | "danger"
> = {
  ONLINE: "success",
  WARNING: "warning",
  OFFLINE: "danger",
  UNKNOWN: "default",
  MAINTENANCE: "warning",
};

const statusDot: Record<ApiDeviceStatus, EquipmentStatus> = {
  ONLINE: "online",
  WARNING: "attention",
  OFFLINE: "offline",
  UNKNOWN: "neutral",
  MAINTENANCE: "attention",
};

function formatHost(device: DashboardDevice) {
  return device.port ? `${device.host}:${device.port}` : device.host;
}

function formatResponseTime(responseTimeMs: number | null) {
  return typeof responseTimeMs === "number" ? `${responseTimeMs} ms` : "-";
}

function formatLastCheckedAt(lastCheckedAt: string | null) {
  if (!lastCheckedAt) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(lastCheckedAt));
}

function formatDeviceType(deviceType: string) {
  return deviceType.replaceAll("_", " ");
}

export async function EquipmentTable() {
  const { data: devices, hasError } = await getDashboardDevices();

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold">Equipamentos</h2>
          {hasError && (
            <p className="mt-1 text-xs text-muted">
              Não foi possível carregar os equipamentos em tempo real.
            </p>
          )}
        </div>
        <span className="text-xs text-muted">{devices.length} registros</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Equipamento</th>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Tipo</th>
              <th className="px-6 py-3 font-medium">IP</th>
              <th className="px-6 py-3 font-medium">Resposta</th>
              <th className="px-6 py-3 font-medium">Última verificação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {devices.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-muted" colSpan={7}>
                  Nenhum equipamento encontrado.
                </td>
              </tr>
            ) : (
              devices.map((equipment) => (
                <tr
                  key={equipment.id}
                  className="transition hover:bg-surface-elevated/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusDot
                        status={statusDot[equipment.currentStatus]}
                        pulse={equipment.currentStatus === "OFFLINE"}
                      />
                      <Badge variant={statusBadgeVariant[equipment.currentStatus]}>
                        {statusLabels[equipment.currentStatus]}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{equipment.name}</td>
                  <td className="px-6 py-4 text-muted">
                    <div>{equipment.customerName}</div>
                    <div className="mt-1 text-xs">{equipment.siteName}</div>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {formatDeviceType(equipment.deviceType)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted">
                    {formatHost(equipment)}
                  </td>
                  <td className="px-6 py-4">
                    {formatResponseTime(equipment.responseTimeMs)}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {formatLastCheckedAt(equipment.lastCheckedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
