import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { IncidentActions } from "@/components/incidents/IncidentActions";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  formatDateTime,
  getDurationMilliseconds,
} from "@/lib/date-time";
import {
  getIncidents,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/incidents";
import { requireAuthenticatedPage } from "@/lib/auth";

const severityLabels: Record<IncidentSeverity, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const severityStyles: Record<IncidentSeverity, string> = {
  LOW: "bg-accent/10 text-accent border-accent/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-danger/10 text-danger border-danger/20",
  CRITICAL: "bg-danger/20 text-danger border-danger/40",
};

const statusLabels: Record<IncidentStatus, string> = {
  OPEN: "Aberto",
  ACKNOWLEDGED: "Reconhecido",
  RESOLVED: "Resolvido",
};

const statusStyles: Record<IncidentStatus, string> = {
  OPEN: "bg-danger/10 text-danger border-danger/20",
  ACKNOWLEDGED: "bg-warning/10 text-warning border-warning/20",
  RESOLVED: "bg-success/10 text-success border-success/20",
};

function formatDuration(incident: Incident, now: number) {
  const duration = getDurationMilliseconds(
    incident.startedAt,
    incident.resolvedAt ?? now,
  );
  if (duration === null) return "—";

  const totalMinutes = Math.max(
    0,
    Math.floor(duration / 60_000),
  );
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getCustomerName(incident: Incident) {
  return incident.customer?.name ?? incident.device?.customer?.name ?? null;
}

function getSiteName(incident: Incident) {
  return incident.site?.name ?? incident.device?.site?.name ?? null;
}

export default async function IncidentesPage() {
  await requireAuthenticatedPage();

  const { data: incidents, hasError, fetchedAt } = await getIncidents();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader
          title="Incidentes"
          description="Acompanhe falhas, reconhecimentos e recuperações dos equipamentos"
        />
        <main className="space-y-6 p-8">
          {hasError && (
            <Card className="border-danger/30 bg-danger/5">
              <h2 className="font-semibold text-danger">
                Não foi possível carregar os incidentes
              </h2>
              <p className="mt-1 text-sm text-muted">
                Verifique a conexão com a API e tente atualizar a página.
              </p>
            </Card>
          )}

          {!hasError && incidents.length === 0 && (
            <Card className="py-12 text-center">
              <h2 className="font-semibold">Nenhum incidente registrado</h2>
              <p className="mt-2 text-sm text-muted">
                Mudanças para OFFLINE ou WARNING aparecerão aqui
                automaticamente.
              </p>
            </Card>
          )}

          {incidents.length > 0 && (
            <div className="grid gap-4">
              {incidents.map((incident) => {
                const customerName = getCustomerName(incident);
                const siteName = getSiteName(incident);

                return (
                  <Card key={incident.id} className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">{incident.title}</h2>
                        <p className="mt-1 text-sm text-muted">
                          Equipamento:{" "}
                          {incident.device?.name ?? "Não informado"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {[customerName, siteName]
                            .filter(Boolean)
                            .join(" • ") || "Cliente/site não informado"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={severityStyles[incident.severity]}>
                          {severityLabels[incident.severity]}
                        </Badge>
                        <Badge className={statusStyles[incident.status]}>
                          {statusLabels[incident.status]}
                        </Badge>
                      </div>
                    </div>

                    {incident.description && (
                      <p className="mt-4 text-sm text-muted">
                        {incident.description}
                      </p>
                    )}

                    <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted">Início</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {formatDateTime(incident.startedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Duração</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {formatDuration(incident, fetchedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Último evento</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {formatDateTime(incident.lastSeenAt)}
                        </dd>
                      </div>
                    </dl>

                    {incident.status !== "RESOLVED" && (
                      <div className="mt-5 border-t border-border pt-5">
                        <IncidentActions
                          incidentId={incident.id}
                          status={incident.status}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
