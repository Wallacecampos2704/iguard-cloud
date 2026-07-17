"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_MODE_ENABLED } from "@/lib/demo-mode";

const navItems = [
  {
    label: "Visão geral",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Equipamentos",
    href: "/equipamentos",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008V18zm0-6h.008v.008H12V12z" />
      </svg>
    ),
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Incidentes",
    href: "/incidentes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    label: "Alertas",
    href: "/alertas",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    label: "Notificações",
    href: "/notificacoes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.66V6.75a9 9 0 015.25-2.25m0 0V3.75a2.25 2.25 0 012.25 2.25v.75m0 0H21a2.25 2.25 0 012.25 2.25v11.338A2.25 2.25 0 0021 20.25h-6.75m0 0h-6a2.25 2.25 0 01-2.25-2.25v-11.338c0-1.132.75-2.093 1.776-2.192a48.424 48.424 0 011.123-.08m0 0H3.75m10.5 0v-3.375c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v3.375m0 0H9" />
      </svg>
    ),
  },
  {
    label: "Faturamento",
    href: "/faturamento",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h.008v.008H5.625v-.008zm0 2.25h.008v.008H5.625V15.75zm0 2.25h.008v.008H5.625v-.008zm5.625-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15.75zm0 2.25h.008v.008h-.008v-.008zm5.625-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15.75zm0 2.25h.008v.008h-.008v-.008zm5.625-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15.75zm0 2.25h.008v.008h-.008v-.008zM3.75 4.5H21a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0121 22.5H3.75a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013.75 4.5z" />
      </svg>
    ),
  },
  {
    label: "Central de Ajuda",
    href: "/central-ajuda",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.90.727-2.1.72-2.97.25m0 0a2.25 2.25 0 00-2.25 2.25m0 0a2.25 2.25 0 112.25 2.25m-3-7.465a9 9 0 1118 0M12 12a3 3 0 11-6 0 3 3 0 016 0zm0 0a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    label: "Master",
    href: "/master",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94m-9.642 0A9.009 9.009 0 0012 2.25c4.06 0 7.605 2.381 9.331 5.816m0 0A9.009 9.009 0 0021.75 12c0 4.06-2.381 7.605-5.816 9.331m0 0A9.009 9.009 0 0112 21.75c-4.06 0-7.605-2.381-9.331-5.816m15.75-7.35c-.422 2.432-2.56 4.281-5.161 4.281-.639 0-1.263-.125-1.855-.381m0 0a3 3 0 00-5.848 0M7.5 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar({
  demoMode = DEMO_MODE_ENABLED,
}: {
  demoMode?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/30">
            <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="font-bold">
            i<span className="text-accent">Guard</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {demoMode && (
        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-xs font-medium text-accent">Modo demonstração</p>
            <p className="mt-1 text-xs text-muted">
              Dados simulados para preview visual.
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex text-xs text-accent hover:underline"
            >
              ← Voltar ao site
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
