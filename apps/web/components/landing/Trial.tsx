import { Button } from "@/components/ui/Button";

export function Trial() {
  return (
    <section className="py-24 bg-surface/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-12 text-center lg:p-16">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Teste grátis por 10 dias
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Experimente o iGuard sem compromisso. Monitore até{" "}
              <strong className="text-foreground">3 equipamentos</strong> gratuitamente
              e veja na prática como antecipar problemas.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                10 dias de trial
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Até 3 equipamentos
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Sem cartão de crédito
              </span>
            </div>

            <div className="mt-10">
              <Button href="/dashboard" size="lg">
                Começar teste grátis
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
