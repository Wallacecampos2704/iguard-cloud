import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/30">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-bold">
              i<span className="text-accent">Guard</span>
            </span>
          </div>

          <p className="text-sm text-muted text-center">
            Monitoramento inteligente para integradores de segurança eletrônica, TI e portaria remota.
          </p>

          <Button href="/dashboard" size="sm">
            Começar teste grátis
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-border pt-8 text-xs text-muted/60">
          <Link href="/dashboard" className="hover:text-muted transition">
            Dashboard
          </Link>
          <a href="#dor-do-mercado" className="hover:text-muted transition">
            O problema
          </a>
          <a href="#faq" className="hover:text-muted transition">
            FAQ
          </a>
          <span suppressHydrationWarning>© 2026 iGuard. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
