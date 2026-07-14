"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkAllDevices,
  checkDevice,
  createDevice,
  deleteDevice,
  getDeviceChecks,
  updateDevice,
} from "@/app/equipamentos/actions";
import type { DeviceCheckHistoryItem } from "@/app/equipamentos/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiDeviceStatus, DashboardDevice } from "@/lib/dashboard-devices";

const DEVICE_TYPES = [
  ["CAMERA_IP", "Câmera IP"],
  ["DVR_NVR", "DVR / NVR"],
  ["FACIAL", "Controle facial"],
  ["ACCESS_CONTROLLER", "Controle de acesso"],
  ["ROUTER", "Roteador"],
  ["MIKROTIK", "MikroTik"],
  ["SERVER", "Servidor"],
  ["INTERNET_LINK", "Link de internet / modem"],
  ["SIP_GATEWAY", "Gateway SIP"],
  ["ALARM", "Alarme"],
  ["OTHER", "Outro"],
] as const;

const CHECK_TYPES = [
  ["HTTP", "HTTP"],
  ["HTTPS", "HTTPS"],
  ["TCP_PORT", "TCP"],
  ["RTSP", "RTSP"],
  ["PING", "PING"],
] as const;

const statusLabel: Record<ApiDeviceStatus, string> = {
  ONLINE: "Online",
  WARNING: "Atenção",
  OFFLINE: "Offline",
  UNKNOWN: "Desconhecido",
  MAINTENANCE: "Manutenção",
};
const statusVariant: Record<
  ApiDeviceStatus,
  "default" | "success" | "warning" | "danger"
> = {
  ONLINE: "success",
  WARNING: "warning",
  OFFLINE: "danger",
  UNKNOWN: "default",
  MAINTENANCE: "warning",
};
const fieldClass =
  "mt-2 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelFromOptions(
  value: string,
  options: readonly (readonly [string, string])[],
) {
  return options.find(([option]) => option === value)?.[1] ?? value.replaceAll("_", " ");
}

export function EquipmentManager({
  devices,
  hasLoadError,
}: {
  devices: DashboardDevice[];
  hasLoadError: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formDevice, setFormDevice] = useState<DashboardDevice | null>();
  const [historyDevice, setHistoryDevice] = useState<DashboardDevice>();
  const [history, setHistory] = useState<DeviceCheckHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string>();
  const [activeAction, setActiveAction] = useState<{
    type: "check" | "delete" | "check-all" | "history";
    id?: string;
  }>();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (formDevice === undefined && historyDevice === undefined) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        setFormDevice(undefined);
        setHistoryDevice(undefined);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [formDevice, historyDevice, isPending]);

  function finishAction(result: { success: boolean; message: string }) {
    setMessage({ type: result.success ? "success" : "error", text: result.message });
    setActiveAction(undefined);
    if (result.success) router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const editing = formDevice ?? null;

    startTransition(async () => {
      const result = editing
        ? await updateDevice(editing.id, data)
        : await createDevice(data);
      finishAction(result);
      if (result.success) setFormDevice(undefined);
    });
  }

  function handleCheck(id: string) {
    setMessage(null);
    setActiveAction({ type: "check", id });
    startTransition(async () => finishAction(await checkDevice(id)));
  }

  function handleCheckAll() {
    setMessage(null);
    setActiveAction({ type: "check-all" });
    startTransition(async () => finishAction(await checkAllDevices()));
  }

  function handleHistory(device: DashboardDevice) {
    setHistoryDevice(device);
    setHistory([]);
    setHistoryError(undefined);
    setActiveAction({ type: "history", id: device.id });
    startTransition(async () => {
      const result = await getDeviceChecks(device.id);
      setHistory(result.data);
      setHistoryError(result.success ? undefined : result.message);
      setActiveAction(undefined);
    });
  }

  function handleDelete(device: DashboardDevice) {
    if (!window.confirm(`Excluir o equipamento “${device.name}”? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setMessage(null);
    setActiveAction({ type: "delete", id: device.id });
    startTransition(async () => finishAction(await deleteDevice(device.id)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Equipamentos cadastrados</h2>
          <p className="mt-1 text-sm text-muted">
            Gerencie dispositivos, portas externas e protocolos de monitoramento.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={isPending} onClick={handleCheckAll}>
            {activeAction?.type === "check-all" ? "Verificando todos..." : "Verificar todos"}
          </Button>
          <Button onClick={() => { setMessage(null); setFormDevice(null); }}>
            + Novo equipamento
          </Button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}
      {hasLoadError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Não foi possível carregar os equipamentos. Tente atualizar a página.
        </div>
      )}

      <div className="grid gap-4">
        {devices.length === 0 && !hasLoadError ? (
          <Card className="text-center text-sm text-muted">Nenhum equipamento cadastrado.</Card>
        ) : (
          devices.map((device) => (
            <Card key={device.id} className="p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{device.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {device.customerName} · {device.siteName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge variant={statusVariant[device.currentStatus]}>
                    {statusLabel[device.currentStatus]}
                  </Badge>
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setFormDevice(device)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => handleHistory(device)}>
                    {activeAction?.type === "history" && activeAction.id === device.id ? "Carregando..." : "Histórico"}
                  </Button>
                  <Button variant="danger" size="sm" disabled={isPending} onClick={() => handleDelete(device)}>
                    {activeAction?.type === "delete" && activeAction.id === device.id ? "Excluindo..." : "Excluir"}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={isPending} onClick={() => handleCheck(device.id)}>
                    {activeAction?.type === "check" && activeAction.id === device.id ? "Verificando..." : "Verificar agora"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <Detail label="Tipo" value={labelFromOptions(device.deviceType, DEVICE_TYPES)} />
                <Detail label="Host externo" value={device.host} mono accent />
                <Detail label="Porta externa" value={device.port?.toString() ?? "—"} />
                <Detail label="Tipo de verificação" value={labelFromOptions(device.checkType, CHECK_TYPES)} />
                <Detail label="Última verificação" value={formatDate(device.lastCheckedAt)} />
                <Detail label="Tempo de resposta" value={device.responseTimeMs == null ? "—" : `${device.responseTimeMs} ms`} />
              </div>
            </Card>
          ))
        )}
      </div>

      {historyDevice !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="history-title">
            <div className="flex items-start justify-between gap-4 border-b border-border p-6">
              <div>
                <h2 id="history-title" className="text-lg font-semibold">Histórico de verificações</h2>
                <p className="mt-1 text-sm text-muted">{historyDevice.name} · últimas 20 verificações</p>
              </div>
              <button type="button" onClick={() => setHistoryDevice(undefined)} disabled={isPending} aria-label="Fechar" className="rounded-lg px-2 py-1 text-xl text-muted hover:bg-surface-elevated hover:text-foreground">
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-6">
              {activeAction?.type === "history" && (
                <p className="py-8 text-center text-sm text-muted">Carregando histórico...</p>
              )}
              {historyError && (
                <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {historyError}
                </p>
              )}
              {!historyError && activeAction?.type !== "history" && history.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">Nenhuma verificação registrada.</p>
              )}
              {history.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-b border-border bg-surface-elevated text-left text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data e hora</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Resposta</th>
                        <th className="px-4 py-3 font-medium">Verificação</th>
                        <th className="px-4 py-3 font-medium">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap px-4 py-3">{formatDate(item.checkedAt)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{item.responseTimeMs == null ? "—" : `${item.responseTimeMs} ms`}</td>
                          <td className="px-4 py-3">{labelFromOptions(item.checkType, CHECK_TYPES)}</td>
                          <td className={`px-4 py-3 ${item.errorMessage ? "text-danger" : "text-muted"}`}>
                            {item.errorMessage ?? "Sem erro"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {formDevice !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="device-form-title">
            <form key={formDevice?.id ?? "new"} onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="device-form-title" className="text-lg font-semibold">
                    {formDevice ? "Editar equipamento" : "Novo equipamento"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">Informe o endereço externo e como ele deve ser verificado.</p>
                </div>
                <button type="button" onClick={() => setFormDevice(undefined)} disabled={isPending} aria-label="Fechar" className="rounded-lg px-2 py-1 text-xl text-muted hover:bg-surface-elevated hover:text-foreground">
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium sm:col-span-2">
                  Nome
                  <input className={fieldClass} name="name" required maxLength={120} autoFocus defaultValue={formDevice?.name ?? ""} placeholder="Ex.: Câmera portaria" />
                </label>
                <label className="text-sm font-medium">
                  Tipo do equipamento
                  <select className={fieldClass} name="deviceType" required defaultValue={formDevice?.deviceType ?? "CAMERA_IP"}>
                    {DEVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Status inicial
                  <select className={fieldClass} name="currentStatus" required defaultValue={formDevice?.currentStatus ?? "ONLINE"}>
                    <option value="ONLINE">Online</option>
                    <option value="WARNING">Atenção</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Host externo ou URL
                  <input className={fieldClass} name="host" required maxLength={255} defaultValue={formDevice?.host ?? ""} placeholder="clientevpn.exemplo.com.br ou https://dominio.com.br:8081" />
                </label>
                <label className="text-sm font-medium">
                  Porta externa <span className="font-normal text-muted">(opcional para HTTP/PING)</span>
                  <input className={fieldClass} name="port" type="number" min={1} max={65535} step={1} inputMode="numeric" defaultValue={formDevice?.port ?? ""} placeholder="Ex.: 8081" />
                </label>
                <label className="text-sm font-medium">
                  Tipo de verificação
                  <select className={fieldClass} name="checkType" required defaultValue={formDevice?.checkType ?? "HTTP"}>
                    {CHECK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              {message?.type === "error" && <p role="alert" className="mt-4 text-sm text-danger">{message.text}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="secondary" disabled={isPending} onClick={() => setFormDevice(undefined)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar equipamento"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-muted">{label}</p>
      <p className={`break-all text-sm font-medium ${mono ? "font-mono" : ""} ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
