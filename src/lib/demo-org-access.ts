import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Registra acesso real (login) a uma org demo — first/last access — para saber
 * se as credenciais de demonstração liberadas a um prospect foram usadas.
 *
 * Só deve ser chamado para logins reais como founder/student da própria org
 * demo (nunca para o admin, que acessa via "Ver portal" reaproveitando a
 * própria sessão, sem nunca autenticar como o founder/student demo).
 *
 * Best-effort: nunca lança, para não quebrar o carregamento da página.
 */
export async function pingDemoOrgAccess(adminClient: SupabaseClient, orgId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await adminClient
      .from('organizations')
      .update({ demo_first_accessed_at: now })
      .eq('id', orgId)
      .is('demo_first_accessed_at', null);
    await adminClient
      .from('organizations')
      .update({ demo_last_accessed_at: now })
      .eq('id', orgId);
  } catch {
    // silencioso — tracking de acesso não pode derrubar a página
  }
}
