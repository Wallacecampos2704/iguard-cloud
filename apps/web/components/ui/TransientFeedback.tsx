"use client";

import { useEffect, useState } from "react";

type TransientFeedbackProps = {
  message: string;
  success: boolean;
  durationMs?: number;
  className?: string;
  successClassName?: string;
  errorClassName?: string;
  clearUrlParams?: readonly string[];
  onDismiss?: () => void;
};

const EMPTY_URL_PARAMS: readonly string[] = [];

export function TransientFeedback({
  message,
  success,
  durationMs = 5_000,
  className = "",
  successClassName = "text-success",
  errorClassName = "text-danger",
  clearUrlParams = EMPTY_URL_PARAMS,
  onDismiss,
}: TransientFeedbackProps) {
  const [hiddenMessage, setHiddenMessage] = useState<string | null>(null);

  useEffect(() => {
    if (clearUrlParams.length > 0) {
      const url = new URL(window.location.href);
      let changed = false;

      for (const parameter of clearUrlParams) {
        if (url.searchParams.has(parameter)) {
          url.searchParams.delete(parameter);
          changed = true;
        }
      }

      if (changed) {
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    }

    const timeout = window.setTimeout(() => {
      setHiddenMessage(message);
      onDismiss?.();
    }, durationMs);
    return () => window.clearTimeout(timeout);
  }, [clearUrlParams, durationMs, message, onDismiss]);

  if (hiddenMessage === message) return null;

  return (
    <p
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      className={`${className} ${success ? successClassName : errorClassName}`}
    >
      {message}
    </p>
  );
}
