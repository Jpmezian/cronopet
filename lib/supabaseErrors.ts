// ─── Tradução de erros do Supabase Auth pra mensagens pt-BR ────
//
// Antes vivia inline em app/premium.tsx. Extraído pra ser reusado
// pelo onboarding/StepAuth (2026-05-24 sprint AUTH).

export function translateSupabaseError(msg?: string): string {
  if (!msg) return 'Erro desconhecido. Tente novamente.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered'))   return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be'))        return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate'))        return 'E-mail inválido.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('rate limit'))                return 'Muitas tentativas. Aguarde alguns minutos.';
  if (msg.includes('Network request failed'))    return 'Sem conexão. Verifique sua internet e tente de novo.';
  return msg;
}
