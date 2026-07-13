import { incidentsList } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";

const severityVariant = {
  critical: "danger",
  warning: "warning",
  info: "info",
} as const;

const statusVariant = {
  open: "danger",
  investigating: "warning",
  resolved: "success",
} as const;

const severityLabels = {
  critical: "Crítico",
  warning: "Alerta",
  info: "Info",
};

const statusLabels = {
  open: "Aberto",
  investigating: "Investigando",
  resolved: "Resolvido",
};

export function IncidentsList() {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-semibold">Incidentes recentes</h2>
        <span className="text-xs text-muted">{incidentsList.length} abertos</span>
      </div>

      <div className="divide-y divide-border">
        {incidentsList.map((incident) => (
          <div
            key={incident.id}
            className="flex items-start gap-4 px-6 py-4 transition hover:bg-surface-elevated/50"
          >
            <div
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                incident.severity === "critical"
                  ? "bg-danger"
                  : incident.severity === "warning"
                    ? "bg-warning"
                    : "bg-accent"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{incident.title}</p>
              <p className="mt-1 text-xs text-muted">
                {incident.client} · {incident.equipment}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={severityVariant[incident.severity]}>
                  {severityLabels[incident.severity]}
                </Badge>
                <Badge variant={statusVariant[incident.status]}>
                  {statusLabels[incident.status]}
                </Badge>
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted">{incident.createdAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
