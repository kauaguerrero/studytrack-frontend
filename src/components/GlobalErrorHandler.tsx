"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

/**
 * GlobalErrorHandler — captura erros JavaScript não tratados e promise
 * rejections sem .catch(), enviando-os ao pipeline de monitoramento.
 *
 * Deve ser renderizado uma única vez no RootLayout.
 * Não renderiza nenhum elemento visível.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      // Ignora erros de scripts de terceiros (sem stack rastreável)
      if (!event.filename || event.filename.startsWith("chrome-extension")) return;

      void reportError(
        "UnhandledError",
        event.message || "Erro JavaScript não capturado",
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      );
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : JSON.stringify(reason) || "Promise rejeitada sem motivo";

      // Ignora cancelamentos esperados (AbortController)
      if (message.includes("AbortError") || message.includes("The user aborted")) return;

      void reportError(
        "UnhandledRejection",
        message,
        reason instanceof Error && reason.stack
          ? { stack: reason.stack.slice(0, 500) }
          : {},
      );
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
