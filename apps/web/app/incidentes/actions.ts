"use server";

import { revalidatePath } from "next/cache";
import { authenticatedApiFetch } from "@/lib/api-auth";

export type IncidentActionState = {
  success: boolean;
  message: string;
};

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

type IncidentApiResponse =
  | { ok: true; response: Response }
  | { ok: false; result: IncidentActionState };

/**
 * Centraliza a chamada autenticada e a distinção entre sessão ausente/expirada
 * (401) e falta de permissão (403). Erros de rede não são capturados aqui,
 * propositalmente, para que o catch de updateIncident preserve a mensagem de
 * conexão específica da ação.
 */
async function callIncidentApi(
  path: `/${string}`,
  init: RequestInit,
  fallbackMessage: string,
): Promise<IncidentApiResponse> {
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

async function updateIncident(
  id: string,
  action: "acknowledge" | "resolve",
): Promise<IncidentActionState> {
  const path: `/${string}` = `/incidents/${encodeURIComponent(id)}/${action}`;

  try {
    const outcome = await callIncidentApi(
      path,
      { method: "POST" },
      action === "acknowledge"
        ? "Não foi possível reconhecer o incidente."
        : "Não foi possível resolver o incidente.",
    );

    if (!outcome.ok) return outcome.result;

    revalidatePath("/incidentes");
    revalidatePath("/dashboard");

    return {
      success: true,
      message:
        action === "acknowledge"
          ? "Incidente reconhecido com sucesso."
          : "Incidente resolvido com sucesso.",
    };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API de incidentes.",
    };
  }
}

export async function acknowledgeIncident(id: string) {
  return await updateIncident(id, "acknowledge");
}

export async function resolveIncident(id: string) {
  return await updateIncident(id, "resolve");
}
