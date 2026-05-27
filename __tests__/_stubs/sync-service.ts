/**
 * Stub de `@/services/SyncService`. O store faz dynamic import dele —
 * em teste, queremos que o import resolva sem puxar supabase.
 */

export async function pushActionLog(_groupId: string, _userId: string, _log: unknown): Promise<void> { /* no-op */ }
export async function pushWeightEntry(_groupId: string, _userId: string, _entry: unknown): Promise<void> { /* no-op */ }
export async function pushVaccine(_groupId: string, _userId: string, _v: unknown): Promise<void> { /* no-op */ }
export async function pushAppointment(_groupId: string, _userId: string, _a: unknown): Promise<void> { /* no-op */ }
export async function pushMedicalEvent(_groupId: string, _userId: string, _e: unknown): Promise<void> { /* no-op */ }
export async function pullFromCloud(_groupId: string): Promise<{
  actionLogs: unknown[]; vaccines: unknown[]; appointments: unknown[]; weightHistory: unknown[];
}> {
  return { actionLogs: [], vaccines: [], appointments: [], weightHistory: [] };
}

// ─── Auto-sync helpers (DB-004) ──────────────────────────────
// Stubs faltantes detectados em 2026-05-26 quando suite test:pet
// começou a falhar com "(0 , import_SyncService.autoSyncX) is not
// a function". usePetStore importa estaticamente esses helpers.
// Signature real (services/SyncService.ts L340–390): fire-and-forget,
// retorna void. Mantém parity aqui pra typecheck + test runner.

export function autoSyncPet(_pet: unknown): void { /* no-op */ }
export function autoSyncActionLog(_log: unknown): void { /* no-op */ }
export function autoSyncDeleteActionLog(_logId: string): void { /* no-op */ }
export function autoSyncVaccine(_v: unknown): void { /* no-op */ }
export function autoSyncAppointment(_a: unknown): void { /* no-op */ }
export function autoSyncWeightEntry(_w: unknown): void { /* no-op */ }
