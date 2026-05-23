// ─── Lista de emails com Premium dev concedido ────────────────
//
// Feedback R2-5: durante o beta o time interno (founder + sócio)
// precisa testar features Pro sem ter que comprar. Solução: lista
// hardcoded de emails que automaticamente ganham `isPremium=true`
// ao fazer login. Não depende de RevenueCat — funciona offline e
// não conta na receita reportada.
//
// Como adicionar um email:
//   1. Inserir aqui em lowercase
//   2. Próximo login do user → store seta isPremium=true via
//      `applyDevPremiumIfMatch()` no AuthService
//   3. Persiste no MMKV — vale até logout/clear data
//
// IMPORTANTE: não é seguro do ponto de vista de "alguém adversário
// criar conta com esse email pra burlar paywall". Pra isso o app
// precisaria validar contra backend. Aqui assumimos que só users
// internos sabem desses emails e ninguém com má-fé vai cadastrar
// `jpmezian@cronopet.com` por exemplo.

const DEV_PREMIUM_EMAILS_RAW: readonly string[] = [
  'rocha3751@gmail.com',         // founder
  'viniciusvrcoutinho@gmail.com', // sócio
];

// Normalização defensiva — case-insensitive, sem espaços
const DEV_PREMIUM_EMAILS = new Set<string>(
  DEV_PREMIUM_EMAILS_RAW.map((e) => e.trim().toLowerCase()),
);

/** Predicado interno — exportável depois se algum lugar precisar consultar. */
function isDevPremiumEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEV_PREMIUM_EMAILS.has(email.trim().toLowerCase());
}

/**
 * Aplica premium dev se o email match. Idempotente — não-op se
 * o user já é premium ou o email não está na lista. Chamado pelo
 * AuthService após signIn / signUp / restore-session.
 *
 * Recebe `setPremiumStatus` como param (em vez de importar o store
 * direto) pra evitar dependência circular com zustand → AuthService.
 */
export function applyDevPremiumIfMatch(
  email: string | null | undefined,
  setPremiumStatus: (args: {
    isPremium: boolean;
    plan?: 'monthly' | 'annual' | null;
    expiresAt?: number | null;
  }) => void,
): boolean {
  if (!isDevPremiumEmail(email)) return false;
  // 100 anos de validade — efetivamente lifetime sem precisar mudar tipo
  const farFuture = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
  setPremiumStatus({
    isPremium: true,
    plan: 'annual',
    expiresAt: farFuture,
  });
  return true;
}
