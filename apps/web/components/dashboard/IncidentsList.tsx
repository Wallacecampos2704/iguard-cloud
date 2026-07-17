import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "@/lib/incidents";
import { formatDateTime } from "@/lib/date-time";

const severityVariant: Record<IncidentSeverity, "info" | "warning" | "danger"> =
  {
    LOW: "info",
    MEDIUM: "warning",
    HIGH: "danger",
    CRITICAL: "danger",
  };

const statusVariant: Record<IncidentStatus, "danger" | "warning" | "success"> =
  {
    OPEN: "danger",
    ACKNOWLEDGED: "warning",
    RESOLVED: "success",
  };

const severityLabels: Record<IncidentSeverity, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const statusLabels: Record<IncidentStatus, string> = {
  OPEN: "Aberto",
  ACKNOWLEDGED: "Reconhecido",
  RESOLVED: "Resolvido",
};

interface IncidentsListProps {
  incidents: Incident[];
  hasError: boolean;
}

export function IncidentsList({ incidents, hasError }: IncidentsListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-semibold">Incidentes recentes</h2>
        <Link
          href="/incidentes"
          className="text-xs text-accent hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {hasError ? (
        <p className="px-6 py-5 text-sm text-muted">
          Não foi possível carregar os incidentes.
        </p>
      ) : incidents.length === 0 ? (
        <p className="px-6 py-5 text-sm text-muted">Nenhum incidente aberto.</p>
      ) : (
        <div className="divide-y divide-border">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-start gap-4 px-6 py-4 transition hover:bg-surface-elevated/50"
            >
              <div
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  incident.severity === "CRITICAL" ||
                  incident.severity === "HIGH"
                    ? "bg-danger"
                    : incident.severity === "MEDIUM"
                      ? "bg-warning"
                      : "bg-accent"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{incident.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {incident.customer?.name ?? "Cliente não informado"} ·{" "}
                  {incident.device?.name ?? "Equipamento não informado"}
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
              <span className="shrink-0 text-xs text-muted">
                {formatDateTime(incident.startedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
