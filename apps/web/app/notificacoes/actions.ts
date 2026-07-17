"use server";

import { revalidatePath } from "next/cache";
import { NOTIFICATIONS_URL } from "@/lib/notifications";

export type NotificationActionState = {
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

export async function retryNotification(
  id: string,
  _previousState: NotificationActionState,
): Promise<NotificationActionState> {
  void _previousState;

  try {
    const response = await fetch(
      `${NOTIFICATIONS_URL}/${encodeURIComponent(id)}/retry`,
      { method: "POST" },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(
          payload,
          "Não foi possível reenviar esta notificação.",
        ),
      };
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    revalidatePath("/notificacoes");

    if (
      typeof payload === "object" &&
      payload !== null &&
      "status" in payload &&
      payload.status === "FAILED"
    ) {
      const errorMessage =
        "errorMessage" in payload && typeof payload.errorMessage === "string"
          ? payload.errorMessage
          : "A nova tentativa também falhou.";
      return { success: false, message: errorMessage };
    }

    return {
      success: true,
      message: "Notificação reenviada com sucesso.",
    };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API de notificações.",
    };
  }
}
