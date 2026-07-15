"use server";

import { revalidatePath } from "next/cache";
import { INCIDENTS_URL } from "@/lib/incidents";

export type IncidentActionState = {
  success: boolean;
  message: string;
};

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }

  return fallback;
}

async function updateIncident(
  id: string,
  action: "acknowledge" | "resolve",
): Promise<IncidentActionState> {
  try {
    const response = await fetch(
      `${INCIDENTS_URL}/${encodeURIComponent(id)}/${action}`,
      { method: "POST" },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(
          payload,
          action === "acknowledge"
            ? "Não foi possível reconhecer o incidente."
            : "Não foi possível resolver o incidente.",
        ),
      };
    }

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
