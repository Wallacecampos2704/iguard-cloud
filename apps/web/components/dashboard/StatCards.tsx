import type { DashboardSummary } from "@/lib/dashboard-summary";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

interface StatCardsProps {
  summary: DashboardSummary;
}

function StatCard({ label, value, sublabel, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? "text-foreground"}`}>
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function StatCards({ summary }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <StatCard label="Equipamentos monitorados" value={summary.totalDevices} />
      <StatCard label="Online" value={summary.devicesOnline} accent="text-success" />
      <StatCard label="Atenção" value={summary.devicesWarning} accent="text-warning" />
      <StatCard label="Offline" value={summary.devicesOffline} accent="text-danger" />
      <StatCard label="Incidentes abertos" value={summary.openIncidents} accent="text-danger" />
      <StatCard label="Incidentes críticos" value={summary.criticalIncidents} accent="text-danger" />
      <StatCard label="Contatos de alerta" value={summary.notificationContacts} />
      <StatCard
        label="Trials ativos"
        value={summary.trialSubscriptions}
        accent="text-warning"
        sublabel="Assinaturas trial"
      />
      <StatCard
        label="Pagamentos pendentes"
        value={summary.pendingPayments}
        accent="text-warning"
      />
      <StatCard label="Pagamentos aprovados" value={summary.approvedPayments} />
      <StatCard
        label="Total aprovado"
        value={formatCurrency(summary.totalApprovedAmount)}
      />
    </div>
  );
}
