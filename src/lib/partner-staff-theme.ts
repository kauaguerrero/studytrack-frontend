/**
 * Tema da equipe do parceiro (founder, admin e associado/corretor) nas rotas
 * /partners/[slug]/* fora da área do aluno.
 *
 * Fonte de verdade: `profiles.theme_preference` no banco. O script inline de
 * partners/[slug]/layout.tsx aplica a classe `dark` no <html> antes do primeiro
 * paint a partir desse valor; o localStorage é só um cache e nunca vence o
 * banco (antes vencia, e o tema não acompanhava o usuário entre dispositivos).
 */
import { createClient } from '@/lib/supabase/client';

export type PartnerStaffTheme = 'light' | 'dark';

export function getPartnerStaffThemeStorageKey(slug: string) {
  return `partner-founder-theme-${slug}`;
}

/** Tema efetivamente aplicado agora (o que está no <html>). */
export function getAppliedPartnerStaffTheme(): PartnerStaffTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyPartnerStaffTheme(slug: string, next: PartnerStaffTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', next === 'dark');
  root.style.colorScheme = next;
  root.dataset.partnerTheme = next;
  try {
    localStorage.setItem(getPartnerStaffThemeStorageKey(slug), next);
  } catch {
    // localStorage indisponível (modo privado etc.): o banco continua valendo.
  }
}

/**
 * Salva o tema no banco e confirma que gravou. Lança erro com mensagem
 * amigável se não conseguir.
 */
export async function persistPartnerStaffTheme(next: PartnerStaffTheme): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id || !session.access_token) throw new Error('Sessão inválida.');
  const userId = session.user.id;

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
  const apiRes = await fetch(`${api}/api/account/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ theme_preference: next }),
  }).catch(() => null);

  if (!apiRes?.ok) {
    // Fallback direto no Supabase caso a API esteja indisponível.
    const { error } = await supabase
      .from('profiles')
      .update({ theme_preference: next })
      .eq('id', userId);
    if (error) throw error;
  }

  // Verifica persistência real para evitar falso positivo de sucesso.
  const { data: profileCheck, error: profileCheckError } = await supabase
    .from('profiles')
    .select('theme_preference')
    .eq('id', userId)
    .single();

  if (profileCheckError) throw profileCheckError;
  if ((profileCheck as { theme_preference?: string } | null)?.theme_preference !== next) {
    throw new Error('Não foi possível persistir o tema no banco de dados.');
  }
}
