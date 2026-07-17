"use client";

import { useActionState } from "react";
import {
  acknowledgeIncident,
  resolveIncident,
  type IncidentActionState,
} from "@/app/incidentes/actions";
import { Button } from "@/components/ui/Button";
import { TransientFeedback } from "@/components/ui/TransientFeedback";
import type { IncidentStatus } from "@/lib/incidents";

const initialState: IncidentActionState = {
  success: false,
  message: "",
};

interface IncidentActionsProps {
  incidentId: string;
  status: IncidentStatus;
}

export function IncidentActions({ incidentId, status }: IncidentActionsProps) {
  const [acknowledgeState, acknowledgeAction, isAcknowledging] = useActionState(
    acknowledgeIncident.bind(null, incidentId),
    initialState,
  );
  const [resolveState, resolveAction, isResolving] = useActionState(
    resolveIncident.bind(null, incidentId),
    initialState,
  );
  const feedback = resolveState.message ? resolveState : acknowledgeState;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "OPEN" && (
          <form action={acknowledgeAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isAcknowledging || isResolving}
            >
              {isAcknowledging ? "Reconhecendo..." : "Reconhecer"}
            </Button>
          </form>
        )}
        {status !== "RESOLVED" && (
          <form action={resolveAction}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAcknowledging || isResolving}
            >
              {isResolving ? "Resolvendo..." : "Resolver manualmente"}
            </Button>
          </form>
        )}
      </div>
      {!isAcknowledging && !isResolving && feedback.message && (
        <TransientFeedback
          key={`${feedback.success}-${feedback.message}`}
          message={feedback.message}
          success={feedback.success}
          className="text-xs"
        />
      )}
    </div>
  );
}
