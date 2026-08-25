import { createClient } from "@/lib/supabase/client";
import { reportError } from "@/lib/reportError";

/** Fetch autenticado (sessão admin) reusado pelas 3 abas do modal de conquistas. */
export async function fetchAdminJSON<T>(apiUrl: string, path: string): Promise<T | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(`${apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`Erro ao buscar ${path}:`, err);
    void reportError("AchievementsModalFetchError", String(err));
    return null;
  }
}

export function buildOrgQuery(orgId: string | null): string {
  return orgId ? `&org_id=${encodeURIComponent(orgId)}` : "";
}
