"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LS_KEY = "last_whatsapp_admin";
const WA_MSG = "Olá! Gostaria de saber mais sobre a StudyTrack para minha instituição.";
const ENCODED_MSG = encodeURIComponent(WA_MSG);

interface AdminContact {
  id: string;
  full_name: string;
  whatsapp_phone: string;
}

// Static fallback — used when Supabase query is blocked by RLS or returns empty
const FALLBACK_ADMINS: AdminContact[] = [
  { id: "igor", full_name: "Igor", whatsapp_phone: "5562994735412" },
];

function pickNext(admins: AdminContact[], lastId: string | null): AdminContact {
  if (admins.length === 0) return FALLBACK_ADMINS[0];
  if (admins.length === 1) return admins[0];
  const lastIdx = admins.findIndex((a) => a.id === lastId);
  return admins[(lastIdx + 1) % admins.length];
}

export function useWhatsAppContact() {
  const [url, setUrl] = useState<string>(`https://wa.me/5562994735412?text=${ENCODED_MSG}`);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      let admins: AdminContact[] = [];

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, whatsapp_phone")
          .eq("role", "admin")
          .not("whatsapp_phone", "is", null);

        if (!error && data && data.length > 0) {
          admins = (data as AdminContact[]).filter((a) => !!a.whatsapp_phone);
        }
      } catch {
        // RLS or network error — use fallback
      }

      if (admins.length === 0) admins = FALLBACK_ADMINS;

      const lastId = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      const chosen = pickNext(admins, lastId);

      if (!cancelled) {
        const phone = chosen.whatsapp_phone.replace(/\D/g, "");
        localStorage.setItem(LS_KEY, chosen.id);
        setUrl(`https://wa.me/${phone}?text=${ENCODED_MSG}`);
        setReady(true);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return { url, ready };
}
