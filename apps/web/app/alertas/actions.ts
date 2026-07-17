"use server";

import { revalidatePath } from "next/cache";
import { NOTIFICATION_PREFERENCES_URL } from "@/lib/notification-preferences";

export type AlertPreferencesActionState = {
  success: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNonNegativeInteger(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }

  return fallback;
}

export async function updateNotificationPreferences(
  _previousState: AlertPreferencesActionState,
  formData: FormData,
): Promise<AlertPreferencesActionState> {
  void _previousState;

  const confirmationDelaySeconds = getNonNegativeInteger(
    formData,
    "confirmationDelaySeconds",
  );
  const cooldownMinutes = getNonNegativeInteger(formData, "cooldownMinutes");
  const quietHoursStart = getString(formData, "quietHoursStart");
  const quietHoursEnd = getString(formData, "quietHoursEnd");
  const timezone = getString(formData, "timezone");

  if (confirmationDelaySeconds === null || cooldownMinutes === null) {
    return {
      success: false,
      message: "Informe tempos válidos, sem valores negativos.",
    };
  }

  if (!timezone) {
    return { success: false, message: "Informe um fuso horário válido." };
  }

  const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!isTime(quietHoursStart) || !isTime(quietHoursEnd)) {
    return {
      success: false,
      message: "Informe o início e o fim do horário silencioso.",
    };
  }

  const payload = {
    telegramEnabled: formData.has("telegramEnabled"),
    emailEnabled: formData.has("emailEnabled"),
    whatsappEnabled: formData.has("whatsappEnabled"),
    smsEnabled: formData.has("smsEnabled"),
    alertOnOffline: formData.has("alertOnOffline"),
    alertOnRecovery: formData.has("alertOnRecovery"),
    alertOnWarning: formData.has("alertOnWarning"),
    confirmationDelaySeconds,
    cooldownMinutes,
    quietHoursEnabled: formData.has("quietHoursEnabled"),
    quietHoursStart,
    quietHoursEnd,
    timezone,
  };

  try {
    const response = await fetch(NOTIFICATION_PREFERENCES_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responsePayload = await response.json().catch(() => null);
      return {
        success: false,
        message: getApiErrorMessage(
          responsePayload,
          "Não foi possível salvar as preferências de alerta.",
        ),
      };
    }

    revalidatePath("/alertas");
    return {
      success: true,
      message: "Preferências de alerta salvas com sucesso.",
    };
  } catch {
    return {
      success: false,
      message: "Não foi possível conectar à API de preferências.",
    };
  }
}
