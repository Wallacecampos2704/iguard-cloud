import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { clientsList } from "@/lib/mock-data";
import { requireAuthenticatedPage } from "@/lib/auth";

export default async function ClientesPage() {
  await requireAuthenticatedPage();

  const planColors: Record<string, string> = {
    starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    professional: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    enterprise: "bg-accent/20 text-accent border-accent/30",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    trial: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const planLabel: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  const statusLabel: Record<string, string> = {
    active: "Ativo",
    trial: "Trial",
    inactive: "Inativo",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Clientes" 
          description="Gestão de clientes cadastrados"
        />
        <main className="p-8 space-y-8">

          <div className="grid gap-4">
            {clientsList.map((client) => (
              <Card key={client.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{client.name}</h3>
                    <p className="text-sm text-muted">{client.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={planColors[client.plan]}>
                      {planLabel[client.plan]}
                    </Badge>
                    <Badge className={statusColors[client.status]}>
                      {statusLabel[client.status]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Telefone</p>
                    <p className="text-sm font-medium">{client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Equipamentos</p>
                    <p className="text-sm font-medium">{client.equipment}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Cadastrado em</p>
                    <p className="text-sm font-medium">{client.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Última atividade</p>
                    <p className="text-sm font-medium">{client.lastActivity}</p>
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
