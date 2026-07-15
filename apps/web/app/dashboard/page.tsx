import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { TrafficLightCards } from "@/components/dashboard/TrafficLightCards";
import { HealthOverview } from "@/components/dashboard/HealthOverview";
import { EquipmentTable } from "@/components/dashboard/EquipmentTable";
import { IncidentsList } from "@/components/dashboard/IncidentsList";
import { IncidentStatCards } from "@/components/dashboard/IncidentStatCards";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { getIncidents } from "@/lib/incidents";

export default async function DashboardPage() {
  const [summaryResult, incidentsResult] = await Promise.all([
    getDashboardSummary(),
    getIncidents(),
  ]);
  const { data: summary, hasError } = summaryResult;
  const recentIncidents = incidentsResult.data
    .filter((incident) => incident.status !== "RESOLVED")
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader />
        <main className="p-8 space-y-8">
          {hasError && (
            <p className="text-xs text-muted">
              Não foi possível carregar os indicadores em tempo real. Exibindo
              valores zerados.
            </p>
          )}
          <StatCards summary={summary} />
          <TrafficLightCards summary={summary} />
          <IncidentStatCards summary={summary} />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <EquipmentTable />
            </div>
            <div className="space-y-8">
              <HealthOverview
                score={summary.platformHealthScore}
                openIncidents={summary.openIncidents}
                criticalIncidents={summary.criticalIncidents}
              />
              <IncidentsList
                incidents={recentIncidents}
                hasError={incidentsResult.hasError}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
