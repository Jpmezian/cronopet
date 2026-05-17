/**
 * Stub de `react-native-mmkv` — Map em memória, sem encryption.
 * Suficiente pra testar a camada Zustand persist middleware: ela só
 * precisa de get/set/remove pra string keys.
 */

class FakeMMKV {
  private store = new Map<string, string | number | boolean>();

  getString(key: string): string | undefined {
    const v = this.store.get(key);
    return typeof v === 'string' ? v : undefined;
  }
  set(key: string, value: string | number | boolean): void {
    this.store.set(key, value);
  }
  remove(key: string): void {
    this.store.delete(key);
  }
  clearAll(): void {
    this.store.clear();
  }
}

export type MMKV = FakeMMKV;

export function createMMKV(_opts?: { id?: string; encryptionKey?: string }): FakeMMKV {
  return new FakeMMKV();
}
