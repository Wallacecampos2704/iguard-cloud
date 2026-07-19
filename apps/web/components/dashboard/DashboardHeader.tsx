import { Badge } from "@/components/ui/Badge";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { logout } from "@/app/logout/actions";
import { getCurrentUser, type AuthenticatedUser } from "@/lib/auth";
import { DEMO_MODE_ENABLED } from "@/lib/demo-mode";

export type DashboardIdentity = {
  name: string;
  role: string;
  email?: string | null;
  initials?: string;
};

const ROLE_LABELS: Record<AuthenticatedUser["role"], string> = {
  MASTER: "Master",
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
};

function toDashboardIdentity(user: AuthenticatedUser): DashboardIdentity {
  return {
    name: user.name,
    email: user.email,
    role: ROLE_LABELS[user.role],
  };
}

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

export async function DashboardHeader({
  title = "Visão geral",
  description = "Operação de monitoramento em tempo real",
  identity,
  demoMode = DEMO_MODE_ENABLED,
}: DashboardHeaderProps) {
  const authenticatedUser = demoMode ? null : await getCurrentUser();

  const currentIdentity = demoMode
    ? demoIdentity
    : authenticatedUser
      ? toDashboardIdentity(authenticatedUser)
      : (identity ?? productionIdentity);

  const showLogout = Boolean(authenticatedUser);

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
        {showLogout && (
          <form action={logout}>
            <LogoutButton />
          </form>
        )}
      </div>
    </header>
  );
}
