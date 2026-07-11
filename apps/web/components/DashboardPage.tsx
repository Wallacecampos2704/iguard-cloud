'use client';

import { useEffect, useState } from 'react';

type Summary = {
  monitoredDevices: number;
  online: number;
  attention: number;
  offline: number;
  openIncidents: number;
  uptime: string;
  lastUpdated: string;
};

type Device = {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'online' | 'attention' | 'offline';
  health: 'normal' | 'warning' | 'critical';
  lastSeen: string;
};

const summaryCards = [
  { key: 'monitoredDevices', label: 'Equipamentos monitorados', icon: '🖥️' },
  { key: 'online', label: 'Online', icon: '✅' },
  { key: 'attention', label: 'Atenção', icon: '⚠️' },
  { key: 'offline', label: 'Offline', icon: '❌' },
  { key: 'openIncidents', label: 'Incidentes abertos', icon: '🚨' },
] as const;

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

function statusLabel(status: Device['status']) {
  if (status === 'online') return 'online';
  if (status === 'attention') return 'atenção';
  return 'offline';
}

function statusClass(status: Device['status']) {
  if (status === 'online') return 'bg-emerald-500/15 text-emerald-300';
  if (status === 'attention') return 'bg-amber-500/15 text-amber-300';
  return 'bg-rose-500/15 text-rose-300';
}

function healthLabel(health: Device['health']) {
  if (health === 'normal') return 'Normal';
  if (health === 'warning') return 'Atenção';
  return 'Crítico';
}

function healthClass(health: Device['health']) {
  if (health === 'normal') return 'text-emerald-300';
  if (health === 'warning') return 'text-amber-300';
  return 'text-rose-300';
}

export default function DashboardPage() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const [summaryResponse, devicesResponse] = await Promise.all([
        fetch(`${apiUrl}/dashboard/summary`, { cache: 'no-store' }),
        fetch(`${apiUrl}/devices`, { cache: 'no-store' }),
      ]);

      if (!summaryResponse.ok) {
        throw new Error('Falha ao carregar resumo');
      }

      if (!devicesResponse.ok) {
        throw new Error('Falha ao carregar equipamentos');
      }

      const summaryData = await summaryResponse.json();
      const devicesData = await devicesResponse.json();

      setSummary(summaryData);
      setDevices(devicesData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-[280px_1fr] gap-6 p-6">
        <aside className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/20">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200">
              iG
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">iGuard Cloud</p>
              <h1 className="text-xl font-semibold text-white">Monitoramento SaaS</h1>
            </div>
          </div>

          <p className="mb-10 text-sm leading-6 text-slate-400">
            Plataforma para integradores com visibilidade inteligente de dispositivos, alertas e incidentes.
          </p>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActivePage(item)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  activePage === item
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {activePage === 'Dashboard' ? (
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8">
              <div className="mb-8 flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Dashboard</p>
                  <h2 className="mt-3 text-4xl font-semibold text-white">Visão geral do iGuard</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                    Painel inicial com informações de dispositivos monitorados e incidentes em tempo real.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300">
                  Última atualização:{' '}
                  {summary?.lastUpdated
                    ? new Date(summary.lastUpdated).toLocaleString('pt-BR')
                    : loading
                      ? 'Carregando...'
                      : '-'}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                {summaryCards.map((card) => (
                  <article key={card.key} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{card.label}</p>
                      <span className="rounded-2xl bg-slate-800 px-3 py-2 text-xl">{card.icon}</span>
                    </div>
                    <p className="text-4xl font-semibold text-white">{summary?.[card.key] ?? '-'}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-[1.6fr_1fr] gap-6">
              <article className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Equipamentos</p>
                    <h3 className="mt-3 text-3xl font-semibold text-white">Visão geral dos dispositivos</h3>
                  </div>
                  <span className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-300">
                    {devices.length} itens
                  </span>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-800">
                  <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.9fr] bg-slate-900/80 px-6 py-4 text-xs uppercase tracking-[0.25em] text-slate-500">
                    <span>Dispositivo</span>
                    <span>Tipo</span>
                    <span>Localização</span>
                    <span>Status</span>
                    <span>Último contato</span>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.9fr] items-center px-6 py-5 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-white">{device.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{device.id}</p>
                        </div>
                        <span className="text-slate-300">{device.type}</span>
                        <span className="text-slate-300">{device.location}</span>
                        <span className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${statusClass(device.status)}`}>
                          {statusLabel(device.status)}
                        </span>
                        <span className="text-slate-300">{device.lastSeen}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8">
                <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Insights</p>
                <h3 className="mt-3 text-3xl font-semibold text-white">Resumo operacional</h3>

                <div className="mt-8 space-y-4">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <p className="text-sm text-slate-400">Disponibilidade de rede</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{summary?.uptime ?? '-'}</p>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <p className="text-sm text-slate-400">Alertas recentes</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {summary
                        ? `${summary.attention} dispositivo(s) em atenção, ${summary.offline} offline e ${summary.openIncidents} incidente(s) aberto(s).`
                        : 'Carregando dados operacionais...'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <p className="text-sm text-slate-400">Operação</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Controle unificado para CFTV, acesso e rede em um painel premium, ideal para integradores inteligentes.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </main>
        ) : activePage === 'Equipamentos' ? (
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8">
              <div className="mb-8 flex items-center justify-between gap-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Equipamentos</p>
                  <h2 className="mt-3 text-4xl font-semibold text-white">Dispositivos monitorados</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                    Lista inicial dos equipamentos cadastrados no PostgreSQL. O próximo passo será habilitar cadastro e edição.
                  </p>
                </div>

                <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white opacity-60">
                  Novo equipamento
                </button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-800">
                <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_0.9fr] bg-slate-900/80 px-6 py-4 text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span>Dispositivo</span>
                  <span>Tipo</span>
                  <span>Localização</span>
                  <span>Status</span>
                  <span>Saúde</span>
                  <span>Último contato</span>
                </div>

                <div className="divide-y divide-slate-800">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_0.9fr] items-center px-6 py-5 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">{device.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{device.id}</p>
                      </div>
                      <span className="text-slate-300">{device.type}</span>
                      <span className="text-slate-300">{device.location}</span>
                      <span className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${statusClass(device.status)}`}>
                        {statusLabel(device.status)}
                      </span>
                      <span className={`font-semibold ${healthClass(device.health)}`}>{healthLabel(device.health)}</span>
                      <span className="text-slate-300">{device.lastSeen}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        ) : (
          <main>
            <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8">
              <p className="text-sm uppercase tracking-[0.32em] text-sky-300">{activePage}</p>
              <h2 className="mt-3 text-4xl font-semibold text-white">Módulo em construção</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Esta área será conectada nas próximas etapas do iGuard Cloud.
              </p>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
