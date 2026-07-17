import { Badge } from "@/components/ui/Badge";
import { DEMO_MODE_ENABLED } from "@/lib/demo-mode";

export type DashboardIdentity = {
  name: string;
  role: string;
  email?: string | null;
  initials?: string;
};

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  identity?: DashboardIdentity;
  demoMode?: boolean;
}

const productionIdentity: DashboardIdentity = {
  name: "Administrador iGuard",
  role: "Administrador",
  initials: "AI",
};

const demoIdentity: DashboardIdentity = {
  name: "Integrador Demo",
  role: "Administrador",
  email: "admin@demo.iguard.app",
  initials: "ID",
};

function getInitials(identity: DashboardIdentity) {
  if (identity.initials) return identity.initials;

  return identity.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");
}

export function DashboardHeader({
  title = "Visão geral",
  description = "Operação de monitoramento em tempo real",
  identity,
  demoMode = DEMO_MODE_ENABLED,
}: DashboardHeaderProps) {
  const currentIdentity =
    identity ?? (demoMode ? demoIdentity : productionIdentity);

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-sm sm:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        <p className="truncate text-xs text-muted">{description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {demoMode && <Badge variant="info">Demo</Badge>}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{currentIdentity.name}</p>
            <p className="text-xs text-muted">
              {currentIdentity.email || currentIdentity.role}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {getInitials(currentIdentity)}
          </div>
        </div>
      </div>
    </header>
  );
}
