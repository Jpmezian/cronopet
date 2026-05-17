/**
 * Stub das funções de NotificationService.
 *
 * Trocamos o módulo inteiro via tsconfig paths pra evitar import de
 * `expo-notifications` (que puxa native modules). Cada função retorna
 * uma Promise resolvida sem efeito colateral. Suficiente pra que
 * actions do store que fazem `.then()/.catch()` não throwem em teste.
 */

export async function scheduleDailyReminder(
  _petName: string,
  _streak: number,
  _hour: number,
  _minute: number,
): Promise<string | undefined> {
  return undefined;
}

export async function scheduleStreakAtRiskReminder(
  _petName: string,
  _streak: number,
): Promise<string | undefined> {
  return undefined;
}

export async function cancelAllReminders(): Promise<void> { /* no-op */ }

export async function cancelNotification(_id: string): Promise<void> { /* no-op */ }

export async function scheduleAppointmentReminder(
  _title: string,
  _date: string,
  _time: string,
): Promise<string | undefined> {
  return undefined;
}

export async function scheduleSmartReminder(
  _opts: unknown,
): Promise<string | undefined> {
  return undefined;
}

export async function requestPermissionsAsync(): Promise<{ granted: boolean }> {
  return { granted: false };
}
