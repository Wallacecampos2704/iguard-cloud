import { Badge } from "@/components/ui/Badge";

interface DashboardHeaderProps {
  title?: string;
  description?: string;
}

export function DashboardHeader({ 
  title = "Visão geral", 
  description = "Operação de monitoramento em tempo real" 
}: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="info">Demo</Badge>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">Integrador Demo</p>
            <p className="text-xs text-muted">admin@demo.iguard.app</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            ID
          </div>
        </div>
      </div>
    </header>
  );
}
