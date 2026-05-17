/**
 * Stub de `expo-image-manipulator`. manipulateAsync vira identity
 * pass-through — retorna o mesmo URI sem reencodar. Suficiente
 * pra testes de store que só verificam que o URI fica consistente.
 */

export const SaveFormat = {
  JPEG: 'jpeg',
  PNG:  'png',
} as const;

export async function manipulateAsync(
  uri: string,
  _actions: unknown[],
  _options?: unknown,
): Promise<{ uri: string }> {
  return { uri };
}
