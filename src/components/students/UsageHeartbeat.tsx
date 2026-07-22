"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const PING_INTERVAL_MS = 60_000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * Envia um heartbeat a cada ~60s enquanto a aba está visível e houve
 * interação recente do aluno — alimenta o card "Tempo de Uso" do
 * painel admin (GET /api/admin/stats/usage-time). Sem UI própria.
 */
export function UsageHeartbeat() {
  const activeRef = useRef(true);

  useEffect(() => {
    const markActive = () => {
      activeRef.current = true;
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const supabase = createClient();
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

    const sendPing = async () => {
      if (document.visibilityState !== "visible" || !activeRef.current) return;
      activeRef.current = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(`${apiUrl}/api/student/analytics/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // Best-effort: telemetria de uso não deve gerar erro visível pro aluno.
      }
    };

    const interval = setInterval(sendPing, PING_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
      clearInterval(interval);
    };
  }, []);

  return null;
}
