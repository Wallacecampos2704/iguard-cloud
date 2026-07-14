"use server";

import { revalidatePath } from "next/cache";
import { DEVICES_URL } from "@/lib/dashboard-devices";

export type DeviceActionResult = {
  success: boolean;
  message: string;
};

const DEVICE_TYPES = [
  "ROUTER",
  "MIKROTIK",
  "CAMERA_IP",
  "DVR_NVR",
  "FACIAL",
  "ACCESS_CONTROLLER",
  "SERVER",
  "INTERNET_LINK",
  "SIP_GATEWAY",
  "ALARM",
  "OTHER",
] as const;
const DEVICE_STATUSES = ["ONLINE", "WARNING", "OFFLINE"] as const;
const CHECK_TYPES = ["HTTP", "HTTPS", "TCP_PORT", "RTSP", "PING"] as const;

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }
  return fallback;
}

function readDeviceForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const deviceType = String(formData.get("deviceType") ?? "");
  const host = String(formData.get("host") ?? "").trim();
  const portValue = String(formData.get("port") ?? "").trim();
  const currentStatus = String(formData.get("currentStatus") ?? "");
  const checkType = String(formData.get("checkType") ?? "");

  if (!name || !host) return { error: "Preencha o nome e o host/IP." };
  if (!DEVICE_TYPES.includes(deviceType as (typeof DEVICE_TYPES)[number])) {
    return { error: "Selecione um tipo de dispositivo válido." };
  }
  if (!DEVICE_STATUSES.includes(currentStatus as (typeof DEVICE_STATUSES)[number])) {
    return { error: "Selecione um status inicial válido." };
  }
  if (!CHECK_TYPES.includes(checkType as (typeof CHECK_TYPES)[number])) {
    return { error: "Selecione um tipo de verificação válido." };
  }

  const port = portValue === "" ? null : Number(portValue);
  if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    return { error: "Informe uma porta entre 1 e 65535." };
  }
  let hasEmbeddedPort = false;
  try {
    const parsedHost = new URL(/^https?:\/\//i.test(host) ? host : `http://${host}`);
    hasEmbeddedPort = parsedHost.port !== "";
  } catch {
    // A API retorna a mensagem detalhada para hosts inválidos.
  }
  if (
    (checkType === "TCP_PORT" || checkType === "RTSP") &&
    port === null &&
    !hasEmbeddedPort
  ) {
    return { error: "A porta é obrigatória para verificações TCP e RTSP." };
  }

  return { payload: { name, deviceType, host, port, currentStatus, checkType } };
}

async function mutateDevice(
  url: string,
  method: "POST" | "PATCH",
  formData: FormData,
): Promise<DeviceActionResult> {
  const parsed = readDeviceForm(formData);
  if ("error" in parsed) {
    return { success: false, message: parsed.error ?? "Dados inválidos." };
  }

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.payload),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(payload, "Não foi possível salvar o equipamento."),
      };
    }

    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return {
      success: true,
      message:
        method === "POST"
          ? "Equipamento cadastrado com sucesso."
          : "Equipamento atualizado com sucesso.",
    };
  } catch {
    return { success: false, message: "Não foi possível conectar à API." };
  }
}

export async function createDevice(formData: FormData) {
  return await mutateDevice(DEVICES_URL, "POST", formData);
}

export async function updateDevice(id: string, formData: FormData) {
  return await mutateDevice(
    `${DEVICES_URL}/${encodeURIComponent(id)}`,
    "PATCH",
    formData,
  );
}

export async function deleteDevice(id: string): Promise<DeviceActionResult> {
  try {
    const response = await fetch(`${DEVICES_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(payload, "Não foi possível excluir o equipamento."),
      };
    }
    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return { success: true, message: "Equipamento excluído com sucesso." };
  } catch {
    return { success: false, message: "Não foi possível conectar à API." };
  }
}

export async function checkDevice(id: string): Promise<DeviceActionResult> {
  try {
    const response = await fetch(`${DEVICES_URL}/${encodeURIComponent(id)}/check`, {
      method: "POST",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(payload, "Não foi possível verificar o equipamento."),
      };
    }
    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return { success: true, message: "Verificação concluída e status atualizado." };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API para verificar o equipamento.",
    };
  }
}
