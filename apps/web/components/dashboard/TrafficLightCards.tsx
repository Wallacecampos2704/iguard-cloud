import { StatusDot } from "@/components/ui/StatusDot";
import type { DashboardSummary } from "@/lib/dashboard-summary";

interface TrafficLightCardsProps {
  summary: DashboardSummary;
}

function getPercentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function TrafficLightCards({ summary }: TrafficLightCardsProps) {
  const { devicesOnline, devicesWarning, devicesOffline, totalDevices } = summary;

  const cards = [
    {
      status: "online" as const,
      label: "Online",
      count: devicesOnline,
      percentage: getPercentage(devicesOnline, totalDevices),
      description: "Operando normalmente",
    },
    {
      status: "attention" as const,
      label: "Atenção",
      count: devicesWarning,
      percentage: getPercentage(devicesWarning, totalDevices),
      description: "Requer verificação",
    },
    {
      status: "offline" as const,
      label: "Offline",
      count: devicesOffline,
      percentage: getPercentage(devicesOffline, totalDevices),
      description: "Sem resposta",
    },
  ];

  const borderColors = {
    online: "border-success/30",
    attention: "border-warning/30",
    offline: "border-danger/30",
  };

  const bgColors = {
    online: "from-success/5",
    attention: "from-warning/5",
    offline: "from-danger/5",
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.status}
          className={`relative overflow-hidden rounded-2xl border ${borderColors[card.status]} bg-gradient-to-br ${bgColors[card.status]} to-surface p-6`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={card.status} pulse={card.status === "offline"} size="lg" />
              <span className="font-semibold">{card.label}</span>
            </div>
            <span className="text-3xl font-bold">{card.count}</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{card.description}</span>
              <span>{card.percentage}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  card.status === "online"
                    ? "bg-success"
                    : card.status === "attention"
                      ? "bg-warning"
                      : "bg-danger"
                }`}
                style={{ width: `${card.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
