/**
 * Mini-framework de teste compartilhado pelas suites Wave 2+.
 *
 * Filosofia: SEM jest, SEM vitest, SEM watch mode. Cada suite tem seu
 * próprio `run.ts` que importa essas helpers, declara um array de
 * `{ name, fn }`, e chama `runSuite()`. Saída é colorida, tempo total
 * sub-segundo, exit code 1 se algo falhar.
 *
 * Adicionar nova suite custa ~50 linhas de boilerplate — trade aceito
 * em troca de zero config de framework.
 */

export interface TestCase {
  name: string;
  fn: () => void;
  /** Marca opcional pra agrupar visualmente (ex: "edge"). */
  tag?: string;
}

interface Result {
  name: string;
  tag?: string;
  pass: boolean;
  error?: string;
}

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';
const RESET = '\x1b[0m';

// ─── Asserções ────────────────────────────────────────────────────────

export function assertEq<T>(actual: T, expected: T, msg = ''): void {
  if (actual !== expected) {
    throw new Error(
      `${msg ? msg + ': ' : ''}esperava ${JSON.stringify(expected)}, recebeu ${JSON.stringify(actual)}`,
    );
  }
}

/** Assert numérico com tolerância — pra cálculos de ponto flutuante. */
export function assertNear(actual: number, expected: number, tol: number, msg = ''): void {
  if (Number.isNaN(actual) || Math.abs(actual - expected) > tol) {
    throw new Error(
      `${msg ? msg + ': ' : ''}esperava ~${expected} (±${tol}), recebeu ${actual}`,
    );
  }
}

export function assertTrue(v: unknown, msg = ''): void {
  if (!v) throw new Error(`${msg ? msg + ': ' : ''}esperava truthy, recebeu ${v}`);
}

export function assertFalse(v: unknown, msg = ''): void {
  if (v) throw new Error(`${msg ? msg + ': ' : ''}esperava falsy, recebeu ${v}`);
}

export function assertNull(v: unknown, msg = ''): void {
  if (v !== null) throw new Error(`${msg ? msg + ': ' : ''}esperava null, recebeu ${JSON.stringify(v)}`);
}

export function assertNotNull<T>(v: T | null | undefined, msg = ''): asserts v is T {
  if (v == null) throw new Error(`${msg ? msg + ': ' : ''}esperava não-nulo`);
}

// ─── Runner ───────────────────────────────────────────────────────────

export function runSuite(suiteName: string, cases: TestCase[]): void {
  // Sync runner — top-level await complica build CJS do tsx e nenhum
  // dos casos precisa de I/O real. Mocks de tempo e funções puras só.
  const startedAt = Date.now();
  const results: Result[] = [];

  for (const c of cases) {
    try {
      c.fn();
      results.push({ name: c.name, tag: c.tag, pass: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: c.name, tag: c.tag, pass: false, error: msg });
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  console.log(`\n${DIM}── ${suiteName} ──${RESET}`);
  for (const r of results) {
    const tag = r.pass ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`${tag}  ${r.name}`);
    if (!r.pass && r.error) {
      console.log(`      ${DIM}${r.error}${RESET}`);
    }
  }

  const dur = Date.now() - startedAt;
  const tot = `${passed}/${results.length}`;
  const status = failed === 0 ? `${GREEN}✓ ${tot} passou${RESET}` : `${RED}✗ ${failed} falhou${RESET} (${tot})`;
  console.log(`${DIM}── ${status}  ·  ${dur}ms${RESET}`);

  if (failed > 0) process.exit(1);
}

// ─── Time mocking — pra suites que dependem de Date.now() ────────────

let _mockedNow: number | null = null;
const _origDateNow = Date.now;

export function mockTime(ms: number): void {
  _mockedNow = ms;
  Date.now = () => _mockedNow!;
}

export function advanceTime(deltaMs: number): void {
  if (_mockedNow === null) throw new Error('mockTime() não foi chamado antes de advanceTime()');
  _mockedNow += deltaMs;
}

export function restoreTime(): void {
  _mockedNow = null;
  Date.now = _origDateNow;
}
