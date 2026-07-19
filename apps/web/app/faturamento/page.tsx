import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { plans, invoicesList } from "@/lib/mock-data";
import { requireAuthenticatedPage } from "@/lib/auth";

export default async function FaturamentoPage() {
  await requireAuthenticatedPage();

  const currentPlan = plans[0]; // Trial

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Faturamento e Planos" 
          description="Gerencie seu plano e pagamentos"
        />
        <main className="p-8 space-y-8">
          <Card className="p-8 border-2 border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Plano Trial</h2>
                <p className="text-lg text-muted mb-4">
                  10 dias grátis • Até 3 equipamentos
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span>Bloqueio automático após vencimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span>Liberação automática após pagamento</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted mb-2">Vence em:</p>
                <p className="text-3xl font-bold text-yellow-400">5 dias</p>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="text-xl font-semibold mb-4">Upgrade para um Plano Pago</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.slice(1).map((plan) => (
                <Card 
                  key={plan.id} 
                  className="p-6 hover:border-accent/50 transition cursor-pointer flex flex-col"
                >
                  <h4 className="text-lg font-bold mb-1">{plan.name}</h4>
                  <p className="text-2xl font-bold text-accent mb-1">
                    R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted mb-4">{plan.period}</p>

                  <div className="flex-1 space-y-2 mb-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-xs">{plan.maxEquipments} equipamentos</span>
                    </div>
                    {plan.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-accent">✓</span>
                        <span className="text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition">
                    Contratar
                  </button>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Método de Pagamento</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-elevated border border-accent/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-16 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">MP</span>
                    </div>
                    <div>
                      <p className="font-semibold">Mercado Pago</p>
                      <p className="text-xs text-muted">Cartão de crédito</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
                <p className="text-sm text-muted">
                  **** **** **** 4242 (expira 12/2026)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-elevated">
                <p className="text-sm font-semibold mb-2">Recurência</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Pagamento automático mensal</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Ativo
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-elevated">
                <p className="text-sm font-semibold mb-2">Webhook de Pagamento</p>
                <p className="text-xs text-muted mb-3">
                  Sistema de notificação automática quando pagamento é aprovado
                </p>
                <button className="text-xs text-accent hover:underline">
                  Ver documentação de webhook →
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico de Faturas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-semibold">Período</th>
                    <th className="text-left py-3 font-semibold">Valor</th>
                    <th className="text-left py-3 font-semibold">Status</th>
                    <th className="text-left py-3 font-semibold">Emissão</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesList.slice(0, 3).map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border/50 hover:bg-surface-elevated/50 transition">
                      <td className="py-3">{invoice.period}</td>
                      <td className="py-3 font-semibold">
                        R$ {invoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <Badge className={
                          invoice.status === "paid" 
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : invoice.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }>
                          {invoice.status === "paid" ? "Pago" : invoice.status === "pending" ? "Pendente" : "Atrasado"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted">{invoice.issueDate}</td>
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
