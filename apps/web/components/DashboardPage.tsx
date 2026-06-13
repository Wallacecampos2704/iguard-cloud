'use client';

import { useEffect, useState } from 'react';

interface Summary {
  monitoredDevices: number;
  online: number;
  attention: number;
  offline: number;
  openIncidents: number;
  uptime: string;
  lastUpdated: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  health: string;
  lastSeen: string;
}

const statusStyles: Record<string, string> = {
  online: 'bg-emerald-500/15 text-emerald-300',
  attention: 'bg-amber-500/15 text-amber-300',
  offline: 'bg-rose-500/15 text-rose-300',
};

const summaryCards = [
  { key: 'monitoredDevices', label: 'Equipamentos monitorados', icon: '🖥️' },
  { key: 'online', label: 'Online', icon: '✅' },
  { key: 'attention', label: 'Atenção', icon: '⚠️' },
  { key: 'offline', label: 'Offline', icon: '❌' },
  { key: 'openIncidents', label: 'Incidentes abertos', icon: '🚨' },
];

const navItems = [
  'Dashboard',
  'Equipamentos',
  'Clientes',
  'Incidentes',
  'Alertas',
  'Faturamento',
  'Central de ajuda',
  'Master',
];

const devicesDemo: Device[] = [
  {
    id: 'dev-001',
    name: 'NVR Central 01',
    type: 'NVR',
    location: 'Branch A',
    status: 'online',
    health: 'normal',
    lastSeen: '2 min atrás',
  },
  {
    id: 'dev-002',
    name: 'MikroTik Router 13',
    type: 'Router',
    location: 'Headquarter',
    status: 'attention',
    health: 'warning',
    lastSeen: '5 min atrás',
  },
  {
    id: 'dev-003',
    name: 'Access Controller 07',
    type: 'Controle de Acesso',
    location: 'Portão Principal',
    status: 'offline',
    health: 'critical',
    lastSeen: '12 min atrás',
  },
  {
    id: 'dev-004',
    name: 'Câmera PTZ 21',
    type: 'CFTV',
    location: 'Entrada Leste',
    status: 'online',
    health: 'normal',
    lastSeen: '30 seg atrás',
  },
];

function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [devices, setDevices] = useState<Device[]>(devicesDemo);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/dashboard/summary`)
      .then((res) => res.json())
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[280px_1fr] gap-6 p-6">
        <aside className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30">
                iG
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">iGuard Cloud</p>
                <h1 className="text-xl font-semibold text-white">Monitoramento SaaS</h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Plataforma para integradores com visibilidade inteligente de dispositivos, alertas e incidentes.
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-800/70"
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-brand-300">Dashboard</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Visão geral do iGuard</h2>
                <p className="mt-2 max-w-xl text-slate-400">
                  Painel inicial com informações de dispositivos monitorados e incidentes em tempo real.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 px-5 py-4 text-sm text-slate-300 ring-1 ring-slate-700">
                Última atualização: {summary?.lastUpdated ? new Date(summary.lastUpdated).toLocaleString('pt-BR') : 'Carregando...'}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {summaryCards.map((card) => {
                const value = summary ? (summary as any)[card.key] : '—';
                return (
                  <div key={card.key} className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-2xl">
                        {card.icon}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <article className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-brand-300">Equipamentos</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Visão geral dos dispositivos</h3>
                </div>
                <span className="rounded-2xl bg-slate-900/80 px-4 py-2 text-sm text-slate-300">{devices.length} itens</span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
                <div className="grid grid-cols-6 gap-4 border-b border-slate-800/90 bg-slate-900/80 px-5 py-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <span className="col-span-2">Dispositivo</span>
                  <span>Tipo</span>
                  <span>Localização</span>
                  <span>Status</span>
                  <span>Último contato</span>
                </div>
                <div className="space-y-1 p-4">
                  {devices.map((device) => (
                    <div key={device.id} className="grid grid-cols-6 gap-4 rounded-3xl bg-slate-900/80 px-5 py-4 text-sm text-slate-200">
                      <div className="col-span-2 space-y-1">
                        <p className="font-semibold text-white">{device.name}</p>
                        <p className="text-slate-500">{device.id}</p>
                      </div>
                      <span>{device.type}</span>
                      <span>{device.location}</span>
                      <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[device.status] || 'bg-slate-700 text-slate-200'}`}>
                        {device.status}
                      </span>
                      <span>{device.lastSeen}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-brand-300">Insights</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Resumo operacional</h3>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
                  <p className="text-sm text-slate-400">Disponibilidade de rede</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{summary?.uptime ?? '—'}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
                  <p className="text-sm text-slate-400">Alertas recentes</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    12 dispositivos com sinal instável, 3 incidentes com prioridade alta e 4 manutenções programadas.
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
                  <p className="text-sm text-slate-400">Operação</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Controle unificado para CFTV, acesso e rede em um painel premium, ideal para integradores inteligentes.
                  </p>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
