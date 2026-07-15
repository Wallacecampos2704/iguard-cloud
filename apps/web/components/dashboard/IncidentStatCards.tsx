import type { DashboardSummary } from "@/lib/dashboard-summary";

function formatResolutionTime(milliseconds: number) {
  if (milliseconds <= 0) return "0 min";

  const totalMinutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function IncidentStatCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    {
      label: "Incidentes abertos",
      value: summary.openIncidents,
      accent: "text-warning",
    },
    {
      label: "Incidentes críticos",
      value: summary.criticalIncidents,
      accent: "text-danger",
    },
    {
      label: "Resolvidos hoje",
      value: summary.resolvedIncidentsToday,
      accent: "text-success",
    },
    {
      label: "Tempo médio de resolução",
      value: formatResolutionTime(summary.meanResolutionTimeMs),
      accent: "text-accent",
    },
  ];

  return (
    <section aria-labelledby="incident-summary-title" className="space-y-4">
      <h2
        id="incident-summary-title"
        className="text-sm font-semibold uppercase tracking-wider text-muted"
      >
        Incidentes
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {card.label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${card.accent}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
