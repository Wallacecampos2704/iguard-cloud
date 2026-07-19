import { AlertPreferencesForm } from "@/components/alerts/AlertPreferencesForm";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Card } from "@/components/ui/Card";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { requireAuthenticatedPage } from "@/lib/auth";

export default async function AlertasPage() {
  await requireAuthenticatedPage();

  const { data: preferences, hasError } =
    await getNotificationPreferences();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader
          title="Preferências de alertas"
          description="Configure canais, eventos e regras para reduzir falsos alarmes"
        />
        <main className="space-y-6 p-8">
          <Card className="border-accent/20 bg-accent/5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Regras por organização</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Estas preferências controlam quando uma mudança de estado pode
                  gerar notificação. Segredos do Telegram permanecem somente na
                  API e nunca são enviados ao navegador.
                </p>
              </div>
            </div>
          </Card>

          {hasError && (
            <Card className="border-danger/30 bg-danger/5">
              <h2 className="font-semibold text-danger">
                Não foi possível carregar as preferências atuais
              </h2>
              <p className="mt-1 text-sm text-muted">
                Os valores seguros do MVP estão sendo exibidos. Verifique a API
                antes de salvar alterações.
              </p>
            </Card>
          )}

          <AlertPreferencesForm preferences={preferences} />
        </main>
      </div>
    </div>
  );
}
