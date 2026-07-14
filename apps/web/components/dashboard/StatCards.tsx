import type { DashboardSummary } from "@/lib/dashboard-summary";

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: string;
  compact?: boolean;
  sublabel?: string;
}

function StatCard({
  label,
  value,
  accent,
  compact = false,
  sublabel,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-bold ${compact ? "text-lg" : "text-3xl"} ${
          accent ?? "text-foreground"
        }`}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}

function formatLastCheck(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StatCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Total de equipamentos" value={summary.totalDevices} />
      <StatCard label="Online" value={summary.devicesOnline} accent="text-success" />
      <StatCard label="Offline" value={summary.devicesOffline} accent="text-danger" />
      <StatCard label="Atenção" value={summary.devicesWarning} accent="text-warning" />
      <StatCard
        label="Última verificação geral"
        value={formatLastCheck(summary.lastCheckedAt)}
        sublabel={`${summary.lastRunChecked} equipamentos na última execução`}
        compact
      />
    </div>
  );
}
