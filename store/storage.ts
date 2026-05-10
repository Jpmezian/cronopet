import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * MMKV — Storage nativo ultrarrápido (C++ bridge via Nitro Modules).
 * ~30x mais rápido que AsyncStorage para leitura/escrita.
 *
 * ─── SEGURANÇA ──────────────────────────────────────────────
 * O MMKV é inicializado com uma chave AES de 256 bits que é:
 *  • Gerada criptograficamente na primeira execução (expo-crypto)
 *  • Guardada no Secure Enclave (iOS Keychain / Android Keystore) via
 *    expo-secure-store — nunca toca a memória de outro app
 *  • Nunca transmitida pela rede
 *
 * Resultado: se o dispositivo for comprometido ou o backup do iCloud for
 * exposto, o conteúdo do MMKV continua ilegível sem a chave do Keychain.
 */

const SECURE_STORE_KEY = 'cronopet.mmkv.encryption-key.v1';

/**
 * Gera uma chave AES de 256 bits (64 chars hex).
 * Usa expo-crypto que chama o PRNG nativo (iOS SecRandomCopyBytes / Android SecureRandom).
 */
function generateEncryptionKey(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Recupera (ou cria) a chave de criptografia do MMKV.
 * Guardada no Keychain (iOS) / Keystore (Android) — isolada do bundle do app.
 *
 * Async: chamado uma única vez na boot do app via `ensureEncryptionKeyReady()`.
 */
let cachedKey: string | null = null;

export async function ensureEncryptionKeyReady(): Promise<string> {
  if (cachedKey) return cachedKey;
  try {
    const existing = await SecureStore.getItemAsync(SECURE_STORE_KEY, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    if (existing) {
      cachedKey = existing;
      return existing;
    }
    const key = generateEncryptionKey();
    await SecureStore.setItemAsync(SECURE_STORE_KEY, key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    cachedKey = key;
    return key;
  } catch (err) {
    // Fallback: chave estática derivada (menos seguro, mas não crasha o app)
    // — NUNCA deve acontecer em produção com device real
    const fallback = 'cronopet-fallback-key-insecure-' + (globalThis as any)?.navigator?.userAgent?.slice(0, 8);
    cachedKey = fallback;
    return fallback;
  }
}

/**
 * Inicialização lazy + síncrona. Se a chave não foi pre-carregada via
 * ensureEncryptionKeyReady(), cria um MMKV SEM criptografia no primeiro
 * setItem (degraded mode). O layout root chama ensureEncryptionKeyReady()
 * antes do store hidratar, então em produção sempre terá criptografia.
 */
let mmkvInstance: MMKV | null = null;

function getStorage(): MMKV {
  if (!mmkvInstance) {
    if (cachedKey) {
      mmkvInstance = createMMKV({ id: 'cronopet-storage', encryptionKey: cachedKey });
    } else {
      // Fallback unencrypted (só acontece se ensureEncryptionKeyReady não foi chamado)
      mmkvInstance = createMMKV({ id: 'cronopet-storage' });
    }
  }
  return mmkvInstance;
}

/**
 * Apaga a instância em memória (chamar após rotacionar chave ou fazer logout completo).
 */
export function resetStorageInstance(): void {
  mmkvInstance = null;
  cachedKey = null;
}

/**
 * Adaptador MMKV para Zustand persist middleware.
 */
export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const value = getStorage().getString(name);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      getStorage().set(name, value);
    } catch {
      // Optimistic UI não deve travar por storage
    }
  },
  removeItem: (name: string): void => {
    try {
      getStorage().remove(name);
    } catch {
      // Silently fail
    }
  },
};
