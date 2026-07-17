import Link from "next/link";
import { DEMO_MODE_ENABLED } from "@/lib/demo-mode";

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/20 via-blue-500/10 to-purple-500/10 blur-2xl" />
      <div className="relative rounded-2xl border border-accent/30 bg-surface p-1.5 glow-accent shadow-2xl shadow-accent/10">
        <div className="rounded-xl bg-surface-elevated p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <span className="truncate font-mono text-[10px] text-muted sm:text-xs">
              dashboard.iguard.app
            </span>
            <span className="hidden rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success sm:inline">
              Live
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { label: "Online", value: "289", color: "text-success", bg: "bg-success/5" },
              { label: "Atenção", value: "14", color: "text-warning", bg: "bg-warning/5" },
              { label: "Offline", value: "9", color: "text-danger", bg: "bg-danger/5" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-lg ${stat.bg} border border-border/50 p-2 text-center sm:p-3`}
              >
                <div className={`text-lg font-bold sm:text-2xl ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted sm:text-xs">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-3 rounded-lg border border-border/50 bg-background p-2.5">
            <div className="flex items-center justify-between text-[10px] text-muted sm:text-xs">
              <span>Saúde da operação</span>
              <span className="font-semibold text-success">94/100</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-success to-accent" />
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              { name: "DVR Principal", client: "Cond. Solar", status: "online" },
              { name: "Portaria Remota", client: "Res. Parque", status: "offline" },
              { name: "Servidor NVR", client: "Indústria", status: "attention" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-2 sm:gap-3 sm:px-3"
              >
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    row.status === "online"
                      ? "bg-success"
                      : row.status === "attention"
                        ? "bg-warning"
                        : "bg-danger animate-pulse"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium sm:text-xs">{row.name}</p>
                  <p className="truncate text-[10px] text-muted">{row.client}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-accent/30 bg-surface px-4 py-1.5 text-xs font-medium text-accent shadow-lg transition hover:border-accent/60 hover:bg-accent/10"
      >
        {DEMO_MODE_ENABLED && (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {DEMO_MODE_ENABLED ? "Explorar demonstração" : "Acessar painel"}
      </Link>
    </div>
  );
}
