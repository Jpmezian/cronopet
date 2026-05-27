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

// Contador interno pra garantir uuids distintos entre chamadas.
// NÃO criptograficamente seguro — só pra testes. Em prod, expo-crypto
// real usa PRNG nativo.
let _uuidCounter = 0;
export function randomUUID(): string {
  _uuidCounter++;
  const h = _uuidCounter.toString(16).padStart(12, '0');
  // Formato uuid v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // (y ∈ {8,9,a,b})
  return `00000000-0000-4000-8000-${h}`;
}

export const CryptoDigestAlgorithm = {
  SHA1:   'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
} as const;
