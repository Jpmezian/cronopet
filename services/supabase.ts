import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';

// ─── MMKV dedicado à sessão de autenticação ───────────────────
//
// Instância separada do storage de dados do pet para isolamento
// total — qualquer reset de dados do usuário não toca na sessão.
//
// ─── SEGURANÇA ─────────────────────────────────────────────
// Criptografada com a MESMA chave usada no MMKV principal (chave
// AES de 256 bits vivendo no Keychain/Keystore). Sessão JWT do
// Supabase NUNCA fica em plaintext no disco.

let authStorage: MMKV | null = null;
let authEncryptionKey: string | null = null;

/**
 * Inicializa o storage de auth com a chave de criptografia.
 * Chamado pelo layout root antes de qualquer operação do Supabase.
 */
export function initSupabaseAuthStorage(encryptionKey: string): void {
  authEncryptionKey = encryptionKey;
  authStorage = createMMKV({ id: 'cronopet-auth', encryptionKey });
}

function getAuthStorage(): MMKV {
  if (!authStorage) {
    // Fallback unencrypted (só acontece se initSupabaseAuthStorage não foi chamado)
    authStorage = createMMKV({ id: 'cronopet-auth' });
  }
  return authStorage;
}

// ─── Adapter MMKV → SupportedStorage (Supabase) ──────────────
//
// Supabase aceita métodos síncronos (string | null) além de
// Promise — o MMKV síncrono é 100% compatível com a interface.

const MMKVSupabaseAdapter = {
  getItem: (key: string): string | null => {
    try {
      return getAuthStorage().getString(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      getAuthStorage().set(key, value);
    } catch {
      // Silently fail — não travar o fluxo de autenticação
    }
  },
  removeItem: (key: string): void => {
    try {
      getAuthStorage().remove(key);
    } catch {
      // Silently fail
    }
  },
};

/**
 * Limpa todo o storage de auth (sessão + refresh token).
 * Usado no "apagar todos os dados" e no logout completo.
 */
export function clearSupabaseAuthStorage(): void {
  try {
    getAuthStorage().clearAll();
  } catch {
    // silent
  }
}

// ─── Cliente Supabase ─────────────────────────────────────────
//
// EXPO_PUBLIC_ → disponível no bundle do app (lado cliente).
// `detectSessionInUrl: false` obrigatório em React Native —
// o ambiente não tem window.location para fazer o parse da URL.
// `autoRefreshToken: true` mantém a sessão viva sem re-login.

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            MMKVSupabaseAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
