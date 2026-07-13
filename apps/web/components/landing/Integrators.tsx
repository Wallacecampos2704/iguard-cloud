import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const integratorTypes = [
  {
    title: "Segurança eletrônica",
    items: ["CFTV / DVR / NVR", "Controle de acesso", "Alarmes monitorados", "Cerca elétrica"],
  },
  {
    title: "TI e infraestrutura",
    items: ["Servidores e switches", "Links e VPNs", "Storage e backup", "Ambientes cloud"],
  },
  {
    title: "Portaria remota",
    items: ["Interfones IP", "Portões automatizados", "Centrais de atendimento", "Câmeras de entrada"],
  },
];

export function Integrators() {
  return (
    <section id="integradores" className="py-24 bg-surface/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="info" className="mb-4">Para integradores</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Feito para quem monitora dezenas — ou centenas — de clientes
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              O iGuard foi pensado para empresas de segurança eletrônica, integradores de TI
              e operadores de portaria remota que precisam de visibilidade centralizada
              sem aumentar a equipe.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Painel único para todos os clientes e equipamentos",
                "Status semáforo: online, atenção e offline",
                "Histórico de incidentes e uptime por equipamento",
                "Gestão de trials e assinaturas (em breve com Mercado Pago)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4">
            {integratorTypes.map((type) => (
              <Card key={type.title}>
                <h3 className="font-semibold text-accent">{type.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {type.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-lg bg-background px-3 py-1 text-xs text-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
