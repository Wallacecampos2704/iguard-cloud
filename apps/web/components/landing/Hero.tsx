import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { HeroBadges } from "@/components/landing/HeroBadges";
import { DEMO_MODE_ENABLED } from "@/lib/demo-mode";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
      <div className="absolute inset-0 grid-bg" />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-0 h-[320px] w-[320px] rounded-full bg-purple-500/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Coluna esquerda — copy */}
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              SaaS de monitoramento para integradores
            </div>

            <div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="gradient-text">iGuard</span>
              </h1>
              <p className="mt-4 text-lg font-medium leading-snug text-foreground sm:text-xl lg:text-2xl">
                Monitoramento inteligente para quem não pode descobrir o
                problema tarde demais.
              </p>
            </div>

            {/* Preview mobile — aparece cedo na primeira dobra */}
            <div className="pb-2 lg:hidden">
              <DashboardPreview />
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Centralize CFTV, faciais, MikroTik, alarmes e portaria remota em
              um único painel. Receba alertas por{" "}
              <strong className="font-medium text-foreground/90">
                E-mail, Telegram ou WhatsApp
              </strong>{" "}
              antes que o cliente perceba a falha.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/dashboard" size="lg" className="w-full sm:w-auto">
                Começar teste grátis
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Button>
              <Button
                href="/dashboard"
                variant="demo"
                size="lg"
                className="w-full sm:w-auto"
              >
                {DEMO_MODE_ENABLED && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                {DEMO_MODE_ENABLED ? "Ver demonstração" : "Acessar painel"}
              </Button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Teste grátis sem cartão de crédito
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  10 dias · Até 3 equipamentos · Cancele quando quiser
                </p>
              </div>
            </div>

            <HeroBadges />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">312+</span> equipamentos monitorados
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-success">98,4%</span> uptime médio
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <Link href="/dashboard" className="text-accent hover:underline">
                Ver painel ao vivo →
              </Link>
            </div>
          </div>

          {/* Coluna direita — preview desktop */}
          <div className="hidden pb-8 lg:block lg:pb-0">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
