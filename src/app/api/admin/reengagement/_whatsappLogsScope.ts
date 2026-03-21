/**
 * Alinha telefone de perfil com phone_number em whatsapp_logs (mesma regra do backend BR).
 */
export function normalizeWhatsappPhoneKey(phone: string | null | undefined): string {
  if (phone == null || phone === '') return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/** Filtro PostgREST: mensagens do usuário por user_id OU pelo telefone (outbound legado sem user_id). */
export function whatsappLogsOrFilterForUser(userId: string, profilePhone: string | null | undefined): string {
  const key = normalizeWhatsappPhoneKey(profilePhone);
  if (!key) return `user_id.eq.${userId}`;
  return `user_id.eq.${userId},phone_number.eq.${key}`;
}
