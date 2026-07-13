import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { platformStats, organizationsList } from "@/lib/mock-data";

export default function MasterPage() {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    delinquent: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusLabel: Record<string, string> = {
    active: "Ativo",
    trial: "Trial",
    inactive: "Inativo",
    delinquent: "Inadimplente",
  };

  const planColors: Record<string, string> = {
    trial: "bg-blue-500/10 text-blue-400",
    starter: "bg-purple-500/10 text-purple-400",
    pro: "bg-accent/10 text-accent",
    master: "bg-yellow-500/10 text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Master Dashboard" 
          description="Gestão e análise da plataforma iGuard"
        />
        <main className="p-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6">
              <p className="text-xs text-muted mb-2">MRR</p>
              <p className="text-3xl font-bold text-accent">
                R$ {platformStats.mrrRecurrenceRevenue.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-green-400 mt-2">+2.3% vs mês anterior</p>
            </Card>
            <Card className="p-6">
              <p className="text-xs text-muted mb-2">Recebido</p>
              <p className="text-3xl font-bold text-green-400">
                R$ {platformStats.totalReceived.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted mt-2">{platformStats.activeClients} clientes</p>
            </Card>
            <Card className="p-6">
              <p className="text-xs text-muted mb-2">Pendente</p>
              <p className="text-3xl font-bold text-yellow-400">
                R$ {platformStats.totalPending.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted mt-2">Faturado não recebido</p>
            </Card>
            <Card className="p-6">
              <p className="text-xs text-muted mb-2">Saúde Geral</p>
              <p className="text-3xl font-bold text-green-400">
                {platformStats.healthScore}%
              </p>
              <div className="h-1 bg-surface-elevated rounded-full mt-2">
                <div 
                  className="h-full bg-green-400 rounded-full" 
                  style={{ width: `${platformStats.healthScore}%` }}
                ></div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <p className="text-sm font-semibold mb-4">Métricas de Clientes</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Clientes Ativos</span>
                  <span className="font-bold">{platformStats.activeClients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trials Ativos</span>
                  <span className="font-bold">{platformStats.activeTrials}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trials Vencidos</span>
                  <span className="font-bold text-yellow-400">{platformStats.expiredTrials}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Inadimplentes</span>
                  <span className="font-bold text-red-400">{platformStats.delinquent}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold mb-4">Métricas de Sistema</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Equipamentos Monitorados</span>
                  <span className="font-bold">{platformStats.monitoredEquipment}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Alertas Enviados (mês)</span>
                  <span className="font-bold">{platformStats.alertsSent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Churn Rate</span>
                  <span className="font-bold text-orange-400">{platformStats.churn}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Score de Saúde</span>
                  <span className="font-bold text-green-400">{platformStats.healthScore}%</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Organizações</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-semibold">Organização</th>
                    <th className="text-left py-3 font-semibold">Plano</th>
                    <th className="text-left py-3 font-semibold">Status</th>
                    <th className="text-center py-3 font-semibold">Equipamentos</th>
                    <th className="text-center py-3 font-semibold">Incidentes</th>
                    <th className="text-right py-3 font-semibold">Valor/Mês</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationsList.map((org) => (
                    <tr key={org.id} className="border-b border-border/50 hover:bg-surface-elevated/50 transition">
                      <td className="py-3">{org.name}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-md ${planColors[org.plan]}`}>
                          {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusColors[org.status]}>
                          {statusLabel[org.status]}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">{org.equipments}</td>
                      <td className="py-3 text-center">{org.incidents}</td>
                      <td className="py-3 text-right font-semibold">
                        {org.monthlyValue > 0 
                          ? `R$ ${org.monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "Grátis"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
