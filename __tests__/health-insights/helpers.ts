/**
 * Builders pra fixtures dos testes do HealthInsights.
 *
 * Filosofia: cada caso de teste descreve um *cenário clínico real*. Os
 * helpers existem pra cenários ficarem legíveis (`waterDays(28, 14, 3)`
 * em vez de 42 timestamps escritos à mão) sem sacrificar precisão dos
 * thresholds que estamos testando.
 *
 * NOW é fixado em 2026-05-17T12:00:00 — pra reprodutibilidade. Sempre
 * passamos `now: NOW` pra `analyzeHealth(...)`.
 */

import type {
  ActionLog,
  ActionKey,
  Acceptance,
  Consistency,
  Appearance,
  MedicalEvent,
  MedicalEventType,
  WeightEntry,
} from '@/types/pet';

export const NOW = new Date('2026-05-17T12:00:00').getTime();
export const DAY = 86_400_000;
export const HOUR = 3_600_000;

let _id = 0;
const rid = () => `t${++_id}`;

// ─── Pet builders ──────────────────────────────────────────────────────

export interface PetFixture {
  tipo: 'cachorro' | 'gato' | 'outro';
  raca?: string;
  idealWeightKg?: number;
  nascimento?: string;
}

export const dog = (raca: string, opts: { idealWeightKg?: number; ageYears?: number } = {}): PetFixture => ({
  tipo: 'cachorro',
  raca,
  idealWeightKg: opts.idealWeightKg,
  nascimento: opts.ageYears ? isoYearsAgo(opts.ageYears) : undefined,
});

export const cat = (raca: string | undefined, opts: { idealWeightKg?: number; ageYears?: number } = {}): PetFixture => ({
  tipo: 'gato',
  raca,
  idealWeightKg: opts.idealWeightKg,
  nascimento: opts.ageYears ? isoYearsAgo(opts.ageYears) : undefined,
});

function isoYearsAgo(years: number): string {
  const d = new Date(NOW - years * 365.25 * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Action log builders ───────────────────────────────────────────────

function ts(daysAgo: number, hour = 12): number {
  // hour é hora local desejada — NOW é 12h, então hour=12 dá daysAgo*DAY exato
  return NOW - daysAgo * DAY + (hour - 12) * HOUR;
}

export function action(key: ActionKey, daysAgo: number, opts: Partial<ActionLog> = {}): ActionLog {
  return {
    id: rid(),
    key,
    timestamp: ts(daysAgo, opts.timestamp ? undefined : 12),
    ...opts,
  };
}

/** N ações por dia, do dia `from` (inclusive, mais antigo) até `to` (exclusive, mais recente). */
export function repeat(
  key: ActionKey,
  fromDaysAgo: number,
  toDaysAgo: number,
  perDay: number,
  opts: Omit<Partial<ActionLog>, 'timestamp' | 'key' | 'id'> = {},
): ActionLog[] {
  const out: ActionLog[] = [];
  for (let d = fromDaysAgo; d > toDaysAgo; d--) {
    for (let i = 0; i < perDay; i++) {
      // Espalha pela parte da manhã/tarde pra não colidir tudo no mesmo instante
      const hour = 8 + Math.floor((i * 12) / perDay);
      out.push({
        id: rid(),
        key,
        timestamp: ts(d, hour),
        ...opts,
      });
    }
  }
  return out;
}

// Atalhos semânticos pra ficar mais legível nos cases
export const food = (daysAgo: number, opts?: { acceptance?: Acceptance; note?: string; quantity?: number }) =>
  action('comida', daysAgo, opts);
export const water = (daysAgo: number, opts?: { volumeMl?: number; acceptance?: Acceptance; note?: string }) =>
  action('agua', daysAgo, opts);
export const walk = (daysAgo: number, opts?: { duration?: number; note?: string }) =>
  action('passeio', daysAgo, opts);
export const pee = (daysAgo: number, opts?: { appearance?: Appearance; note?: string }) =>
  action('xixi', daysAgo, opts);
export const poop = (daysAgo: number, opts?: { consistency?: Consistency; appearance?: Appearance; note?: string }) =>
  action('coco', daysAgo, opts);
export const bath = (daysAgo: number, opts?: { note?: string }) => action('banho', daysAgo, opts);

// ─── Medical events ────────────────────────────────────────────────────

export function medEvent(type: MedicalEventType, daysAgo: number, note?: string): MedicalEvent {
  return { id: rid(), type, timestamp: ts(daysAgo, 12), note };
}

// ─── Weight entries ────────────────────────────────────────────────────

export function weight(daysAgo: number, kg: number): WeightEntry {
  const d = new Date(NOW - daysAgo * DAY);
  return {
    id: rid(),
    peso: kg,
    data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  };
}
