import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';

// ─── Contador local de falhas de sync ─────────────────────────
//
// Ação A da [P0] action_logs sync silent fail (docs/TODO.md).
// Não conserta nada — só conta. Pra post-mortem quando o Sentry
// estiver indisponível ou o user reportar "perdi meus logs" e a
// gente quiser puxar o estado local pelo dev tools / TestFlight share.
//
// MMKV separado (id 'cronopet-sync-failures') sem encryption — counter
// é diagnostic, não dado sensível. Independe do cronopet-storage
// principal pra não bloquear se a encryptionKey falhar (cenário que
// pode ser exatamente UMA das causas de falha de sync).

export type FailurePath =
  | 'session_expired'  // getUser retornou null
  | 'no_family'        // user OK mas family_groups link ausente
  | 'no_internet'      // catch outer do autoSync* (Promise rejeitou)
  | 'client_init'      // client() / supabase singleton falhou
  | 'timeout'          // push demorou > 10s
  | 'rls_denied';      // PostgREST retornou error (RLS, FK, constraint, etc)

const FAILURE_PATHS: readonly FailurePath[] = [
  'session_expired',
  'no_family',
  'no_internet',
  'client_init',
  'timeout',
  'rls_denied',
];

let instance: MMKV | null = null;

function storage(): MMKV {
  if (!instance) {
    instance = createMMKV({ id: 'cronopet-sync-failures' });
  }
  return instance;
}

function keyFor(path: FailurePath): string {
  return `failure:${path}`;
}

/** Incrementa o counter de um caminho de falha. Idempotente em re-render. */
export function incrementFailure(path: FailurePath): void {
  try {
    const k = keyFor(path);
    const prev = storage().getNumber(k) ?? 0;
    storage().set(k, prev + 1);
  } catch {
    // Counter é fire-and-forget. Se MMKV falhar, paciência —
    // Sentry ainda recebe o evento via captureException.
  }
}

/** Snapshot atual dos counters. Útil pra log/share/dev tools. */
export function getCounts(): Record<FailurePath, number> {
  const out = {} as Record<FailurePath, number>;
  for (const path of FAILURE_PATHS) {
    try {
      out[path] = storage().getNumber(keyFor(path)) ?? 0;
    } catch {
      out[path] = 0;
    }
  }
  return out;
}

/** Zera todos os counters. Chamar em logout ou em ação manual de debug. */
export function resetCounts(): void {
  try {
    for (const path of FAILURE_PATHS) {
      // .set(k, 0) em vez de .delete(k): API de delete varia entre
      // versões do react-native-mmkv. Counter zerado === ausente
      // pra todos os efeitos práticos.
      storage().set(keyFor(path), 0);
    }
  } catch {
    /* counter best-effort */
  }
}
