import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full glass">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 sm:h-9 sm:w-9">
            <svg
              className="h-4 w-4 text-accent sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight sm:text-xl">
            i<span className="text-accent">Guard</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#dor-do-mercado" className="text-sm text-muted transition hover:text-foreground">
            O problema
          </a>
          <a href="#beneficios" className="text-sm text-muted transition hover:text-foreground">
            Benefícios
          </a>
          <a href="#como-funciona" className="text-sm text-muted transition hover:text-foreground">
            Como funciona
          </a>
          <a href="#integradores" className="text-sm text-muted transition hover:text-foreground">
            Integradores
          </a>
          <a href="#faq" className="text-sm text-muted transition hover:text-foreground">
            FAQ
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button href="/dashboard" variant="demo" size="sm">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="hidden sm:inline">Ver demonstração</span>
            <span className="sm:hidden">Demo</span>
          </Button>
          <Button href="/dashboard" size="sm" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Começar teste grátis</span>
            <span className="sm:hidden">Teste grátis</span>
          </Button>
        </div>
      </nav>
    </header>
  );
}
