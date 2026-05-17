/**
 * Stub de `expo-location` pro test runner. Permissão sempre denied
 * (testes não dependem de GPS), getCurrentPositionAsync nunca chamado.
 */

export const Accuracy = {
  Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6,
} as const;

export async function requestForegroundPermissionsAsync(): Promise<{ status: 'denied' | 'granted' }> {
  return { status: 'denied' };
}

export async function getCurrentPositionAsync(_opts?: unknown): Promise<{
  coords: { latitude: number; longitude: number };
}> {
  return { coords: { latitude: -22.9711, longitude: -43.1822 } };
}
