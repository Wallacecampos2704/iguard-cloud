"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDevice } from "@/app/equipamentos/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiDeviceStatus, DashboardDevice } from "@/lib/dashboard-devices";

const DEVICE_TYPES = [
  "HTTP", "TCP", "PING", "RTSP", "CAMERA", "DVR", "NVR", "ROUTER",
  "MIKROTIK", "ACCESS_CONTROL", "FACIAL", "MODEM", "OTHER",
];

const statusLabel: Record<ApiDeviceStatus, string> = {
  ONLINE: "Online",
  WARNING: "Atenção",
  OFFLINE: "Offline",
  UNKNOWN: "Desconhecido",
  MAINTENANCE: "Manutenção",
};

const statusVariant: Record<ApiDeviceStatus, "default" | "success" | "warning" | "danger"> = {
  ONLINE: "success",
  WARNING: "warning",
  OFFLINE: "danger",
  UNKNOWN: "default",
  MAINTENANCE: "warning",
};

const fieldClass = "mt-2 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function EquipmentManager({
  devices,
  hasLoadError,
}: {
  devices: DashboardDevice[];
  hasLoadError: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const closeOnEscape = () => {
      if (!dialogRef.current?.open) formRef.current?.reset();
    };
    const dialog = dialogRef.current;
    dialog?.addEventListener("close", closeOnEscape);
    return () => dialog?.removeEventListener("close", closeOnEscape);
  }, []);

  function openModal() {
    setMessage(null);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createDevice(formData);
      setMessage({ type: result.success ? "success" : "error", text: result.message });

      if (result.success) {
        formRef.current?.reset();
        closeModal();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Equipamentos cadastrados</h2>
          <p className="mt-1 text-sm text-muted">Gerencie os dispositivos monitorados pela plataforma.</p>
        </div>
        <Button onClick={openModal}>+ Novo equipamento</Button>
      </div>

      {message && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
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
        ) : devices.map((equipment) => (
          <Card key={equipment.id} className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{equipment.name}</h3>
                <p className="mt-1 text-sm text-muted">{equipment.customerName} · {equipment.siteName}</p>
              </div>
              <Badge variant={statusVariant[equipment.currentStatus]}>{statusLabel[equipment.currentStatus]}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div><p className="mb-1 text-xs text-muted">Tipo</p><p className="text-sm font-medium">{equipment.deviceType.replaceAll("_", " ")}</p></div>
              <div><p className="mb-1 text-xs text-muted">Host/IP</p><p className="break-all font-mono text-sm font-medium text-accent">{equipment.host}</p></div>
              <div><p className="mb-1 text-xs text-muted">Porta</p><p className="text-sm font-medium">{equipment.port ?? "—"}</p></div>
              <div><p className="mb-1 text-xs text-muted">Última verificação</p><p className="text-sm font-medium">{equipment.lastCheckedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(equipment.lastCheckedAt)) : "Nunca"}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <dialog ref={dialogRef} className="m-auto w-[min(92vw,36rem)] rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/70">
        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Novo equipamento</h2><p className="mt-1 text-sm text-muted">Informe os dados do dispositivo.</p></div>
            <button type="button" onClick={closeModal} disabled={isPending} aria-label="Fechar" className="rounded-lg px-2 py-1 text-xl text-muted transition hover:bg-surface-elevated hover:text-foreground">×</button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">Nome<input className={fieldClass} name="name" required maxLength={120} autoFocus placeholder="Ex.: Câmera recepção" /></label>
            <label className="text-sm font-medium">Tipo do dispositivo<select className={fieldClass} name="deviceType" required defaultValue="PING">{DEVICE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            <label className="text-sm font-medium">Status inicial<select className={fieldClass} name="currentStatus" required defaultValue="ONLINE"><option value="ONLINE">Online</option><option value="WARNING">Atenção</option><option value="OFFLINE">Offline</option></select></label>
            <label className="text-sm font-medium">Host/IP<input className={fieldClass} name="host" required maxLength={255} placeholder="192.168.1.10" /></label>
            <label className="text-sm font-medium">Porta <span className="font-normal text-muted">(opcional)</span><input className={fieldClass} name="port" type="number" min={1} max={65535} step={1} inputMode="numeric" placeholder="Ex.: 80" /></label>
          </div>

          {message?.type === "error" && <p role="alert" className="mt-4 text-sm text-danger">{message.text}</p>}
          <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={closeModal} className={isPending ? "pointer-events-none opacity-60" : ""}>Cancelar</Button><Button type="submit" className={isPending ? "pointer-events-none opacity-60" : ""}>{isPending ? "Salvando..." : "Salvar equipamento"}</Button></div>
        </form>
      </dialog>
    </div>
  );
}
