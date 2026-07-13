import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { messageTemplates } from "@/lib/mock-data";

export default function AlertasPage() {
  const categoryColors: Record<string, string> = {
    technical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    client: "bg-green-500/20 text-green-400 border-green-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    recovery: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    financial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  const categoryLabel: Record<string, string> = {
    technical: "Técnica (Integrador)",
    client: "Cliente Final",
    critical: "Crítica",
    recovery: "Recuperação",
    financial: "Financeira",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Modelos de Mensagens" 
          description="Customize templates de alertas para seus contatos"
        />
        <main className="p-8 space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Templates de Alertas
            </h2>
            <p className="text-sm text-muted mb-6">
              Personalize as mensagens enviadas aos seus contatos de alerta
            </p>
          </div>

          <div className="space-y-4">
            {messageTemplates.map((template) => (
              <Card key={template.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <Badge className={categoryColors[template.category]}>
                      {categoryLabel[template.category]}
                    </Badge>
                  </div>
                </div>

                <div className="bg-surface-elevated rounded-lg p-4 mb-4 font-mono text-sm text-muted whitespace-pre-wrap overflow-auto max-h-32">
                  {template.content}
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted mb-2">Variáveis Disponíveis:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <code
                        key={variable}
                        className="px-2 py-1 text-xs rounded bg-surface-elevated text-accent border border-accent/30"
                      >
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.6 0-3 1.4-3 3v2.25m0 0a2.25 2.25 0 00-2.25 2.25v3c0 1.6 1.4 3 3 3m0 0h15m-6-7.5v3.375c0 .591-.475 1.071-1.063 1.071H4.5m0 0V4.875c0-.591.475-1.071 1.063-1.071h10.5z" />
                    </svg>
                    Copiar
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 text-foreground text-sm font-medium transition border border-border">
                    Editar
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 border-2 border-dashed border-accent/30">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Criar novo template</h4>
                <p className="text-sm text-muted mt-1">
                  Crie templates personalizados para seus tipos de alerta
                </p>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
