import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { incidentsList } from "@/lib/mock-data";

export default function IncidentesPage() {
  const severityColors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  const statusColors: Record<string, string> = {
    open: "bg-red-500/20 text-red-400 border-red-500/30",
    investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  const severityLabel: Record<string, string> = {
    critical: "Crítico",
    warning: "Aviso",
    info: "Info",
  };

  const statusLabel: Record<string, string> = {
    open: "Aberto",
    investigating: "Investigando",
    resolved: "Resolvido",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Incidentes" 
          description="Relatório de incidentes registrados"
        />
        <main className="p-8 space-y-8">

          <div className="grid gap-4">
            {incidentsList.map((incident) => (
              <Card key={incident.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{incident.title}</h3>
                    <p className="text-sm text-muted">
                      {incident.client} • {incident.equipment}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={severityColors[incident.severity]}>
                      {severityLabel[incident.severity]}
                    </Badge>
                    <Badge className={statusColors[incident.status]}>
                      {statusLabel[incident.status]}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Criado em</p>
                    <p className="text-sm font-medium">{incident.createdAt}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
