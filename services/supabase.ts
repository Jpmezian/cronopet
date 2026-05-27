// ═══════════════════════════════════════════════════════════════
// ═══ Cliente Supabase — inicialização LAZY (fix race 2026-05-27) ═
// ═══════════════════════════════════════════════════════════════
//
// HISTÓRICO DO BUG (race no module-load):
//
//   Antes deste arquivo, `createClient` era chamado no top-level
//   (`export const supabase = createClient(...)`). Supabase JS v2
//   dispara `_recoverAndRefresh` via MICROTASK dentro do constructor,
//   que invoca `adapter.getItem` ANTES de qualquer useEffect do React
//   rodar. A `initSupabaseAuthStorage(key)` no `app/_layout.tsx` é
//   async (Keychain read) e só executa depois do React mount.
//
//   Resultado: o adapter caía num fallback unencrypted MMKV (mesma
//   `id: 'cronopet-auth'` mas SEM `encryptionKey`). MMKV abria a
//   instância no disco, tentava ler bytes encriptados sem key, e
//   retornava `undefined` silenciosamente (cipher mismatch). Supabase
//   entendia "sem session" → user perdia login a cada cold start.
//
// FIX (este arquivo):
//
//   `getSupabase()` é o ÚNICO ponto de acesso ao client. Singleton-
//   promise: múltiplas chamadas concorrentes durante boot recebem
//   a mesma instância. O client SÓ é criado APÓS a encryption key
//   ter sido resolvida e `authStorage` populado.
//
//   `MMKVSupabaseAdapter` foi modificado pra THROW se chamado antes
//   da init (fail-loud), eliminando a silent corruption. Como o
//   adapter agora só pode ser tocado por chamadas vindas do próprio
//   client (que só existe pós-init), o throw é um net unreachable
//   em runtime saudável — é proteção em camadas.
//
// SEGURANÇA mantida:
//   - PKCE flow (auditoria H-2, 2026-05-21)
//   - persistSession + autoRefreshToken
//   - MMKV encrypted com chave do Keychain (`expo-secure-store`)
//   - clearSupabaseAuthStorage continua síncrono pra signOut flow
//     que já está pós-boot (usePetStore.user → user-initiated).

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import * as Sentry from '@sentry/react-native';
import { ensureEncryptionKeyReady } from '@/store/storage';

// ─── Estado interno (módulo singleton) ───────────────────────

let supabaseClientPromise: Promise<SupabaseClient> | null = null;
let authStorage: MMKV | null = null;

// ─── Storage adapter (síncrono, fail-loud) ───────────────────
//
// Supabase aceita storage síncrono (`string | null`) ou async
// (`Promise<string | null>`). MMKV é síncrono nativo (Nitro Modules).
//
// IMPORTANTE: o adapter SÓ pode ser invocado APÓS `getSupabase()` ter
// resolvido — o client Supabase só é criado dentro de `initSupabaseClient`,
// que popula `authStorage` antes de retornar. Se algum caller fizer
// `(await getSupabase()).auth.X`, a init já rodou.
//
// O throw abaixo é defensivo. Se ele disparar em prod, algum import
// circular ou top-level call escapou da disciplina lazy — investigar
// no Sentry pelo tag `op: supabase_storage_*`.

function getAuthStorageOrThrow(): MMKV {
  if (!authStorage) {
    throw new Error(
      'Supabase auth storage not initialized. ' +
      'Call getSupabase() and await it before any auth operation.',
    );
  }
  return authStorage;
}

const MMKVSupabaseAdapter = {
  getItem: (key: string): string | null => {
    try {
      return getAuthStorageOrThrow().getString(key) ?? null;
    } catch (e) {
      Sentry.captureException(e, { tags: { op: 'supabase_storage_get' } });
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      getAuthStorageOrThrow().set(key, value);
    } catch (e) {
      Sentry.captureException(e, { tags: { op: 'supabase_storage_set' } });
    }
  },
  removeItem: (key: string): void => {
    try {
      getAuthStorageOrThrow().remove(key);
    } catch (e) {
      Sentry.captureException(e, { tags: { op: 'supabase_storage_remove' } });
    }
  },
};

// ─── Inicialização lazy do client ────────────────────────────

async function initSupabaseClient(): Promise<SupabaseClient> {
  // 1. Carrega encryption key do Keychain ANTES de tudo. Bloqueia
  //    até resolver pra eliminar a race que existia antes.
  const encryptionKey = await ensureEncryptionKeyReady();

  // 2. Cria a instância MMKV encrypted dedicada à auth. Mesma key
  //    do MMKV principal de dados — Keychain é a fonte única.
  authStorage = createMMKV({ id: 'cronopet-auth', encryptionKey });

  // 3. Só agora o client Supabase é criado. O constructor dispara
  //    `_recoverAndRefresh` que chama `adapter.getItem` — `authStorage`
  //    já está disponível, sem fallback, sem race.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return createClient(url, anonKey, {
    auth: {
      storage:            MMKVSupabaseAdapter,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
      flowType:           'pkce',
    },
  });
}

// ─── API pública ─────────────────────────────────────────────

/**
 * Único ponto de acesso ao Supabase client. Singleton-promise.
 *
 * Uso:
 *   const supabase = await getSupabase();
 *   const { data } = await supabase.auth.getUser();
 *
 * Múltiplas chamadas concorrentes durante boot recebem a MESMA
 * promise — sem race, sem criação dupla. Após o primeiro resolve,
 * todas as chamadas seguintes retornam imediatamente.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseClientPromise) {
    supabaseClientPromise = initSupabaseClient();
  }
  return supabaseClientPromise;
}

/**
 * Limpa todo o storage de auth (sessão + refresh token).
 * Usado em signOut + delete-account. Síncrono — esses flows são
 * sempre user-initiated, então o storage já está inicializado.
 *
 * Se `authStorage` ainda não foi populado (caso impossível em prod
 * saudável — signOut só é chamado após login), no-op silencioso.
 */
export function clearSupabaseAuthStorage(): void {
  try {
    authStorage?.clearAll();
  } catch (e) {
    Sentry.captureException(e, { tags: { op: 'supabase_storage_clear' } });
  }
}
