"use server";

import { revalidatePath } from "next/cache";
import { authenticatedApiFetch } from "@/lib/api-auth";

export type DeviceActionResult = {
  success: boolean;
  message: string;
};

export type DeviceCheckHistoryItem = {
  id: string;
  status: "ONLINE" | "WARNING" | "OFFLINE" | "UNKNOWN" | "MAINTENANCE";
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkType: string;
  source: string;
  checkedAt: string;
};

export type DeviceHistoryResult = DeviceActionResult & {
  data: DeviceCheckHistoryItem[];
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

const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";
const FORBIDDEN_MESSAGE = "Você não tem permissão para esta ação.";

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

type DeviceApiResponse =
  | { ok: true; response: Response }
  | { ok: false; result: DeviceActionResult };

/**
 * Centraliza a chamada autenticada e a distinção entre sessão ausente/expirada
 * (401), falta de permissão (403) e demais erros da API, para que nenhum
 * fluxo classifique 401/403 como simples falha de conexão.
 */
async function callDeviceApi(
  path: `/${string}`,
  init: RequestInit,
  fallbackMessage: string,
): Promise<DeviceApiResponse> {
  const result = await authenticatedApiFetch(path, init);

  if (!result.ok) {
    return {
      ok: false,
      result: { success: false, message: SESSION_EXPIRED_MESSAGE },
    };
  }

  const { response } = result;

  if (response.status === 401) {
    return {
      ok: false,
      result: { success: false, message: SESSION_EXPIRED_MESSAGE },
    };
  }

  if (response.status === 403) {
    return {
      ok: false,
      result: { success: false, message: FORBIDDEN_MESSAGE },
    };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      result: {
        success: false,
        message: getApiErrorMessage(payload, fallbackMessage),
      },
    };
  }

  return { ok: true, response };
}

async function mutateDevice(
  path: `/${string}`,
  method: "POST" | "PATCH",
  formData: FormData,
): Promise<DeviceActionResult> {
  const parsed = readDeviceForm(formData);
  if ("error" in parsed) {
    return { success: false, message: parsed.error ?? "Dados inválidos." };
  }

  try {
    const outcome = await callDeviceApi(
      path,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.payload),
      },
      "Não foi possível salvar o equipamento.",
    );
    if (!outcome.ok) return outcome.result;

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
  return await mutateDevice("/devices", "POST", formData);
}

export async function updateDevice(id: string, formData: FormData) {
  return await mutateDevice(
    `/devices/${encodeURIComponent(id)}`,
    "PATCH",
    formData,
  );
}

export async function deleteDevice(id: string): Promise<DeviceActionResult> {
  try {
    const outcome = await callDeviceApi(
      `/devices/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      "Não foi possível excluir o equipamento.",
    );
    if (!outcome.ok) return outcome.result;

    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return { success: true, message: "Equipamento excluído com sucesso." };
  } catch {
    return { success: false, message: "Não foi possível conectar à API." };
  }
}

export async function checkDevice(id: string): Promise<DeviceActionResult> {
  try {
    const outcome = await callDeviceApi(
      `/devices/${encodeURIComponent(id)}/check`,
      { method: "POST" },
      "Não foi possível verificar o equipamento.",
    );
    if (!outcome.ok) return outcome.result;

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

export async function checkAllDevices(): Promise<DeviceActionResult> {
  try {
    const outcome = await callDeviceApi(
      "/devices/check-all",
      { method: "POST" },
      "Não foi possível verificar os equipamentos.",
    );
    if (!outcome.ok) return outcome.result;

    const summary = (await outcome.response.json()) as {
      success?: boolean;
      total?: number;
      checked?: number;
      online?: number;
      offline?: number;
      warning?: number;
      message?: string;
    };
    revalidatePath("/equipamentos");
    revalidatePath("/dashboard");
    return {
      success: true,
      message:
        summary.message ??
        `${summary.checked ?? 0} de ${summary.total ?? 0} verificados: ${summary.online ?? 0} online, ${summary.offline ?? 0} offline e ${summary.warning ?? 0} em atenção.`,
    };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API para verificar os equipamentos.",
    };
  }
}

export async function getDeviceChecks(id: string): Promise<DeviceHistoryResult> {
  try {
    const outcome = await callDeviceApi(
      `/devices/${encodeURIComponent(id)}/checks`,
      { cache: "no-store" },
      "Não foi possível carregar o histórico.",
    );
    if (!outcome.ok) return { ...outcome.result, data: [] };

    const payload = (await outcome.response.json()) as DeviceCheckHistoryItem[];
    return {
      success: true,
      message: "Histórico carregado.",
      data: Array.isArray(payload) ? payload : [],
    };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API para carregar o histórico.",
      data: [],
    };
  }
}
