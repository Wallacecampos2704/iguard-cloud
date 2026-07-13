interface HealthOverviewProps {
  score: number;
  openIncidents: number;
  criticalIncidents: number;
}

export function HealthOverview({
  score,
  openIncidents,
  criticalIncidents,
}: HealthOverviewProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        Saúde geral da operação
      </h2>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-success transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-success">{score}</span>
            <span className="text-xs text-muted">de 100</span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          {score >= 90
            ? "Operação saudável. Poucos incidentes críticos."
            : score >= 70
              ? "Atenção necessária em alguns equipamentos."
              : "Situação crítica. Ação imediata recomendada."}
        </p>

        <div className="mt-6 w-full space-y-2">
          {[
            { label: "Disponibilidade média", value: `${score}%` },
            { label: "Incidentes abertos", value: openIncidents },
            { label: "Incidentes críticos", value: criticalIncidents },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
