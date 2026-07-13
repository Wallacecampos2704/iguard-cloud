import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { alertContacts } from "@/lib/mock-data";
import React from "react";

export default function NotificacoesPage() {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader 
          title="Contatos de Alerta" 
          description="Gerencie quem recebe notificações críticas"
        />
        <main className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Contatos Cadastrados</h2>
              <p className="text-sm text-muted mt-1">
                {alertContacts.length} de 5 contatos adicionados
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition">
              + Novo Contato
            </button>
          </div>

          <div className="space-y-4">
            {alertContacts.map((contact) => (
              <Card key={contact.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{contact.name}</h3>
                    <p className="text-sm text-muted">{contact.role}</p>
                  </div>
                  <Badge className={statusColors[contact.status]}>
                    {contact.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div>
                    <p className="text-xs text-muted mb-1">WhatsApp</p>
                    <p className="text-sm font-mono font-medium text-accent">
                      {contact.whatsapp}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Email</p>
                    <p className="text-sm font-mono font-medium text-accent">
                      {contact.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Telegram</p>
                    <p className="text-sm font-mono font-medium text-accent">
                      {contact.telegram}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-3">Tipos de Notificações Recebidas</p>
                  <div className="flex flex-wrap gap-2">
                    {contact.receiveCritical && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        🚨 Alerta Crítico
                      </Badge>
                    )}
                    {contact.receiveRecovery && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        ✅ Recuperação
                      </Badge>
                    )}
                    {contact.receiveFinancial && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        💳 Financeiro
                      </Badge>
                    )}
                    {!contact.receiveCritical && !contact.receiveRecovery && !contact.receiveFinancial && (
                      <span className="text-xs text-muted">Nenhuma notificação ativa</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border mt-4 pt-4 flex gap-2">
                  <button className="px-3 py-1 text-sm rounded-lg bg-accent/10 hover:bg-accent/20 text-accent font-medium transition">
                    Editar
                  </button>
                  <button className="px-3 py-1 text-sm rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition">
                    Remover
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {alertContacts.length < 5 && (
            <Card className="p-6 border-2 border-dashed border-accent/30 flex flex-col items-center justify-center text-center">
              <div className="mb-3">
                <svg className="h-8 w-8 text-muted mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="font-semibold">Adicione mais contatos</p>
              <p className="text-sm text-muted mt-1">
                Você pode adicionar até 5 contatos para receber alertas
              </p>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
