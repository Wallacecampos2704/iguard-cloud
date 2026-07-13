import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface HelpTopic {
  id: string;
  title: string;
  category: "getting-started" | "concepts" | "setup" | "advanced";
  description: string;
  icon: string;
}

const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: "t-001",
    title: "Como cadastrar cliente",
    category: "getting-started",
    description: "Guia completo para registrar uma nova organização no sistema",
    icon: "👥",
  },
  {
    id: "t-002",
    title: "Como cadastrar local",
    category: "getting-started",
    description: "Aprenda a criar endereços e pontos de monitoramento",
    icon: "📍",
  },
  {
    id: "t-003",
    title: "Como cadastrar equipamento",
    category: "getting-started",
    description: "Passo a passo para adicionar seus primeiros equipamentos",
    icon: "📡",
  },
  {
    id: "t-004",
    title: "Como cadastrar contatos",
    category: "getting-started",
    description: "Configure quem recebe alertas de monitoramento",
    icon: "📞",
  },

  // Concepts
  {
    id: "t-005",
    title: "O que é IP",
    category: "concepts",
    description: "Entenda endereços IP e como usá-los para conectar equipamentos",
    icon: "🔢",
  },
  {
    id: "t-006",
    title: "O que é DDNS",
    category: "concepts",
    description: "Sistema para acessar equipamentos mesmo com IP dinâmico",
    icon: "🌐",
  },
  {
    id: "t-007",
    title: "O que é Porta",
    category: "concepts",
    description: "Canais de comunicação que identificam serviços em um equipamento",
    icon: "🚪",
  },
  {
    id: "t-008",
    title: "O que é HTTP",
    category: "concepts",
    description: "Protocolo de comunicação na web e suas aplicações",
    icon: "📜",
  },
  {
    id: "t-009",
    title: "O que é RTSP",
    category: "concepts",
    description: "Protocolo para streaming de vídeo em tempo real",
    icon: "🎬",
  },
  {
    id: "t-010",
    title: "O que é Ping",
    category: "concepts",
    description: "Teste de conectividade para verificar se um equipamento está online",
    icon: "🏓",
  },

  // Setup
  {
    id: "t-011",
    title: "Como personalizar mensagens",
    category: "setup",
    description: "Crie templates customizados para seus alertas",
    icon: "✉️",
  },
  {
    id: "t-012",
    title: "Como funciona o trial",
    category: "setup",
    description: "Entenda o período de avaliação gratuita de 10 dias",
    icon: "⏱️",
  },

  // Advanced
  {
    id: "t-013",
    title: "Como o pagamento libera o sistema",
    category: "advanced",
    description: "Sistema automático de bloqueio e liberação por pagamento",
    icon: "💳",
  },
];

export default function CentralAjudaPage() {
  const categoryColors: Record<string, string> = {
    "getting-started": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    concepts: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    setup: "bg-green-500/20 text-green-400 border-green-500/30",
    advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const categoryLabel: Record<string, string> = {
    "getting-started": "Começando",
    concepts: "Conceitos",
    setup: "Configuração",
    advanced: "Avançado",
  };

  const categories = Array.from(
    new Set(helpTopics.map((a) => a.category))
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Central de Ajuda" 
          description="Aprenda como usar todas as funcionalidades do iGuard"
        />
        <main className="p-8 space-y-8">
          <div>
            <input
              type="text"
              placeholder="Pesquisar artigos..."
              className="w-full px-4 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4">
                  {categoryLabel[category]}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {helpTopics
                    .filter((a) => a.category === category)
                    .map((article) => (
                      <Card
                        key={article.id}
                        className="p-6 cursor-pointer hover:border-accent/50 hover:bg-surface-elevated/50 transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{article.icon}</div>
                          <Badge className={categoryColors[article.category]}>
                            {categoryLabel[article.category]}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{article.title}</h3>
                        <p className="text-sm text-muted">
                          {article.description}
                        </p>
                      </Card>
                    ))}

                          <Card className="p-6 bg-accent/5 border border-accent/30">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">💡</div>
                              <div>
                                <h3 className="font-semibold mb-1">Dica: Começando com iGuard</h3>
                                <p className="text-sm text-muted mb-3">
                                  Para aproveitar ao máximo, recomendamos: (1) Cadastrar sua organização, 
                                  (2) Adicionar um local, (3) Registrar seus primeiros equipamentos, 
                                  (4) Configurar contatos de alerta, e (5) Personalizar mensagens.
                                </p>
                              </div>
                            </div>
                          </Card>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
