import { Card } from "@/components/ui/Card";

const problems = [
  {
    title: "Cliente liga antes de você saber",
    description:
      "DVR offline, câmera fora ou link instável — e a primeira notícia chega pelo telefone do condômino, não pelo seu painel.",
  },
  {
    title: "Equipamentos espalhados, zero visão",
    description:
      "Cada cliente com marcas, IPs e sistemas diferentes. Sem centralização, a operação vira apagar incêndio o dia inteiro.",
  },
  {
    title: "Equipe reativa, margem apertada",
    description:
      "Horas gastas em chamados evitáveis. Menos tempo para vender, instalar e crescer a base de clientes.",
  },
];

const monitored = [
  "Câmeras IP",
  "DVRs e NVRs",
  "Faciais",
  "MikroTik",
  "Links de internet",
  "Alarmes",
  "Portaria remota",
];

export function PainPoints() {
  return (
    <section id="dor-do-mercado" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-danger/80">
            A dor do mercado
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Seu cliente não pode descobrir a falha{" "}
            <span className="gradient-text">antes de você.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Integradores perdem contratos, tempo e credibilidade quando a falha
            aparece tarde demais. O iGuard coloca você na frente do problema —
            monitorando tudo o que importa, em um só lugar.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {problems.map((problem) => (
            <Card key={problem.title} className="border-danger/10 bg-danger/[0.03]">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <svg className="h-4 w-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {problem.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-surface to-purple-500/5 p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h3 className="text-xl font-bold sm:text-2xl">
                Um painel para monitorar tudo o que sua operação depende
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                O iGuard foi feito para integradores que precisam enxergar, em
                tempo real, a saúde de câmeras, DVRs, leitores faciais,
                roteadores MikroTik, links de internet, centrais de alarme e
                sistemas de portaria remota — cliente por cliente, equipamento
                por equipamento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {monitored.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-medium text-foreground"
                >
                  <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
