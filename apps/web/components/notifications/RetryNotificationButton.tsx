"use client";

import { useActionState } from "react";
import {
  retryNotification,
  type NotificationActionState,
} from "@/app/notificacoes/actions";
import { Button } from "@/components/ui/Button";
import { TransientFeedback } from "@/components/ui/TransientFeedback";

const initialState: NotificationActionState = {
  success: false,
  message: "",
};

type RetryNotificationButtonProps = {
  notificationId: string;
  compact?: boolean;
};

export function RetryNotificationButton({
  notificationId,
  compact = false,
}: RetryNotificationButtonProps) {
  const [state, action, pending] = useActionState(
    retryNotification.bind(null, notificationId),
    initialState,
  );

  return (
    <div className="space-y-1.5">
      <form action={action}>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending}
          className={compact ? "px-3 py-1.5 text-xs" : ""}
        >
          {pending ? "Reenviando..." : "Reenviar"}
        </Button>
      </form>
      {!pending && state.message && (
        <TransientFeedback
          key={`${state.success}-${state.message}`}
          message={state.message}
          success={state.success}
          className="max-w-56 text-xs"
        />
      )}
    </div>
  );
}
