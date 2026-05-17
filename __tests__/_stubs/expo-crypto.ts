/**
 * Stub de `expo-crypto` pro test runner em Node.
 *
 * O módulo real puxa `react-native` que tem syntax Flow incompatível
 * com esbuild puro. Substituído via `tsconfig.test.json` paths quando
 * rodamos via `npm run test:*`. Nunca usado em build do app.
 *
 * Implementação: getRandomBytes determinístico (não-seguro!) pra que
 * funções dependentes não throwem. Testes que validam segurança de
 * RNG real devem rodar em device via Maestro.
 */

export function getRandomBytes(byteLength: number): Uint8Array {
  const out = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) out[i] = (i * 7 + 3) & 0xff;
  return out;
}

export const CryptoDigestAlgorithm = {
  SHA1:   'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
} as const;
