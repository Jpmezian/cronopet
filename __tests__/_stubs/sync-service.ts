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
