"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationPreferences,
  type AlertPreferencesActionState,
} from "@/app/alertas/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { NotificationPreferences } from "@/lib/notification-preferences";

const initialState: AlertPreferencesActionState = {
  success: false,
  message: "",
};

const checkboxClassName =
  "h-4 w-4 rounded border-border bg-surface-elevated text-accent accent-cyan-500";
const inputClassName =
  "mt-2 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/60";

type PreferenceToggleProps = {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
};

function PreferenceToggle({
  name,
  title,
  description,
  defaultChecked,
  disabled = false,
}: PreferenceToggleProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated/40 p-4">
      <input
        className={`${checkboxClassName} mt-0.5`}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

export function AlertPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const [state, action, pending] = useActionState(
    updateNotificationPreferences,
    initialState,
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    preferences.quietHoursEnabled,
  );

  return (
    <form action={action} className="space-y-6">
      <Card>
        <div className="mb-5">
          <h2 className="font-semibold">Canais ativos</h2>
          <p className="mt-1 text-sm text-muted">
            Escolha por onde o iGuard poderá entregar os alertas.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <PreferenceToggle
            name="telegramEnabled"
            title="Telegram"
            description="Usa o bot configurado de forma segura na API. Nenhum token é exibido aqui."
            defaultChecked={preferences.telegramEnabled}
          />
          <PreferenceToggle
            name="emailEnabled"
            title="E-mail"
            description="Estrutura preparada; o envio ainda permanece como placeholder/log no MVP."
            defaultChecked={preferences.emailEnabled}
          />
          <PreferenceToggle
            name="whatsappEnabled"
            title="WhatsApp (em breve)"
            description="Canal reservado para uma integração futura e desabilitado neste MVP."
            defaultChecked={false}
            disabled
          />
          <PreferenceToggle
            name="smsEnabled"
            title="SMS (em breve)"
            description="Canal reservado para uma integração futura e desabilitado neste MVP."
            defaultChecked={false}
            disabled
          />
        </div>
      </Card>

      <Card>
        <div className="mb-5">
          <h2 className="font-semibold">Eventos monitorados</h2>
          <p className="mt-1 text-sm text-muted">
            Defina quais mudanças de estado devem gerar uma tentativa de alerta.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <PreferenceToggle
            name="alertOnOffline"
            title="Quando cair"
            description="Alerta quando um equipamento muda para OFFLINE."
            defaultChecked={preferences.alertOnOffline}
          />
          <PreferenceToggle
            name="alertOnRecovery"
            title="Quando recuperar"
            description="Comunica uma única recuperação por incidente."
            defaultChecked={preferences.alertOnRecovery}
          />
          <PreferenceToggle
            name="alertOnWarning"
            title="Quando entrar em atenção"
            description="Alerta quando o equipamento muda para WARNING."
            defaultChecked={preferences.alertOnWarning}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-5">
          <h2 className="font-semibold">Controle de ruído</h2>
          <p className="mt-1 text-sm text-muted">
            Evite falsos alarmes e mensagens muito próximas.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Confirmação antes de alertar (segundos)
            <input
              className={inputClassName}
              type="number"
              name="confirmationDelaySeconds"
              min={0}
              step={1}
              defaultValue={preferences.confirmationDelaySeconds}
              required
            />
            <span className="mt-1.5 block text-xs font-normal text-muted">
              Use 0 para preservar o envio imediato atual.
            </span>
          </label>
          <label className="text-sm font-medium">
            Intervalo mínimo entre alertas (minutos)
            <input
              className={inputClassName}
              type="number"
              name="cooldownMinutes"
              min={0}
              step={1}
              defaultValue={preferences.cooldownMinutes}
              required
            />
            <span className="mt-1.5 block text-xs font-normal text-muted">
              Controla a janela de descanso entre novas notificações.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <input
            className={`${checkboxClassName} mt-1`}
            id="quietHoursEnabled"
            type="checkbox"
            name="quietHoursEnabled"
            checked={quietHoursEnabled}
            onChange={(event) => setQuietHoursEnabled(event.target.checked)}
          />
          <label htmlFor="quietHoursEnabled">
            <span className="block font-semibold">Horário silencioso</span>
            <span className="mt-1 block text-sm text-muted">
              Registre a tentativa como ignorada durante o intervalo configurado.
            </span>
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium">
            Início
            <input
              className={inputClassName}
              type="time"
              name="quietHoursStart"
              defaultValue={preferences.quietHoursStart ?? "22:00"}
              disabled={!quietHoursEnabled}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Fim
            <input
              className={inputClassName}
              type="time"
              name="quietHoursEnd"
              defaultValue={preferences.quietHoursEnd ?? "07:00"}
              disabled={!quietHoursEnabled}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Fuso horário
            <input
              className={inputClassName}
              type="text"
              name="timezone"
              list="iguard-timezones"
              defaultValue={preferences.timezone}
              placeholder="America/Sao_Paulo"
              required
            />
            <datalist id="iguard-timezones">
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="America/Fortaleza">America/Fortaleza</option>
              <option value="America/Recife">America/Recife</option>
              <option value="America/Manaus">America/Manaus</option>
              <option value="America/Rio_Branco">America/Rio_Branco</option>
              <option value="UTC">UTC</option>
            </datalist>
          </label>
        </div>
        {!quietHoursEnabled && (
          <input
            type="hidden"
            name="quietHoursStart"
            value={preferences.quietHoursStart ?? "22:00"}
          />
        )}
        {!quietHoursEnabled && (
          <input
            type="hidden"
            name="quietHoursEnd"
            value={preferences.quietHoursEnd ?? "07:00"}
          />
        )}
      </Card>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar preferências"}
        </Button>
        {state.message && (
          <p
            role="status"
            className={`text-sm ${state.success ? "text-success" : "text-danger"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
