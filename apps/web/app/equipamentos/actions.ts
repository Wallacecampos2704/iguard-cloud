"use server";

import { revalidatePath } from "next/cache";
import { DEVICES_URL } from "@/lib/dashboard-devices";

export type CreateDeviceResult = {
  success: boolean;
  message: string;
};

const DEVICE_TYPES = [
  "HTTP",
  "TCP",
  "PING",
  "RTSP",
  "CAMERA",
  "DVR",
  "NVR",
  "ROUTER",
  "MIKROTIK",
  "ACCESS_CONTROL",
  "FACIAL",
  "MODEM",
  "OTHER",
] as const;

const DEVICE_STATUSES = ["ONLINE", "WARNING", "OFFLINE"] as const;

function getApiErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload
  ) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }

  return "Não foi possível cadastrar o equipamento.";
}

export async function createDevice(
  formData: FormData,
): Promise<CreateDeviceResult> {
  const name = String(formData.get("name") ?? "").trim();
  const deviceType = String(formData.get("deviceType") ?? "");
  const host = String(formData.get("host") ?? "").trim();
  const portValue = String(formData.get("port") ?? "").trim();
  const currentStatus = String(formData.get("currentStatus") ?? "");

  if (!name || !host) {
    return { success: false, message: "Preencha o nome e o host/IP." };
  }

  if (!DEVICE_TYPES.includes(deviceType as (typeof DEVICE_TYPES)[number])) {
    return { success: false, message: "Selecione um tipo de dispositivo válido." };
  }

  if (!DEVICE_STATUSES.includes(currentStatus as (typeof DEVICE_STATUSES)[number])) {
    return { success: false, message: "Selecione um status inicial válido." };
  }

  const port = portValue === "" ? undefined : Number(portValue);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    return { success: false, message: "Informe uma porta entre 1 e 65535." };
  }

  try {
    const response = await fetch(DEVICES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, deviceType, host, port, currentStatus }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return { success: false, message: getApiErrorMessage(payload) };
    }

    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return { success: true, message: "Equipamento cadastrado com sucesso." };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API. Tente novamente.",
    };
  }
}
