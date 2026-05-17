/**
 * Runner do gold dataset.
 *
 * Compara saída de analyzeHealth(...) com expectFires/expectMisses por caso.
 * Match é por *prefixo de ID* — IDs reais incluem dayKey, mas o prefixo
 * é único por detector.
 *
 * Saída:
 *   - Lista PASS/FAIL por caso
 *   - Resumo final + sumário de detectores cobertos
 *   - Exit code 1 se algum FAIL
 *
 * Uso: `npx tsx __tests__/health-insights/run.ts` ou `npm run test:health`.
 */

import { analyzeHealth, type HealthInsight } from '@/services/HealthInsights';
import type { PetProfile, ActionLog, MedicalEvent, WeightEntry } from '@/types/pet';
import { NOW } from './helpers';
import type { PetFixture } from './helpers';
import { CASES } from './cases';

export interface AnalyzeInputForTests {
  pet: PetFixture;
  actionHistory: ActionLog[];
  weightHistory: WeightEntry[];
  medicalEvents: MedicalEvent[];
  ambientTempC?: number | null;
}

export interface TestCase {
  name: string;
  fixture: AnalyzeInputForTests;
  /** Prefixos de ID que devem aparecer no resultado. */
  expectFires: string[];
  /** Prefixos que NÃO devem aparecer (controle negativo opcional). */
  expectMisses?: string[];
}

// ─── Lista canônica dos 40 IDs (prefixos) pra rastrear cobertura ──────

const ALL_DETECTOR_PREFIXES = [
  // Genéricos (1-9)
  'weight_var_14d', 'weight_var_30d', 'weight_trend',
  'appetite_drop', 'food_refused', 'food_partial',
  'hydration_gap', 'hydration_low',
  'diarrhea', 'soft_stool', 'no_stool', 'hard_stool',
  'abnormal_appearance', 'med_recur',
  // Raça (10-13)
  'breed_match', 'exercise_deficit', 'bath_overdue',
  'heat_risk', 'cold_risk',
  // Singulares Fase 2 (14-30)
  'polydipsia', 'polyuria', 'polyphagia_weightloss', 'lethargy_activity',
  'halitosis', 'ear_scratching', 'periodontal', 'anal_sac',
  'local_licking', 'thermal_intolerance', 'vocal_change', 'sleep_change',
  'breath_difficulty', 'lameness', 'chronic_vomiting', 'bloody_diarrhea',
  'new_lump',
  // Compostos (31-40)
  'diabetes_suspicion', 'ckd_suspicion', 'hyperthyroid', 'arthritis_pattern',
  'otitis_by_breed', 'atopy_pattern', 'gdv_risk', 'pancreatitis_pattern',
  'cardiomyopathy', 'gi_emergency',
];

// ─── Helpers de match ──────────────────────────────────────────────────

function hasPrefix(insights: HealthInsight[], prefix: string): boolean {
  return insights.some((i) => i.id.startsWith(prefix));
}

// ─── Runner ───────────────────────────────────────────────────────────

interface Result {
  name: string;
  pass: boolean;
  errors: string[];
  fired: string[];
}

function runCase(c: TestCase): Result {
  const insights = analyzeHealth({
    pet: c.fixture.pet as Pick<PetProfile, 'tipo' | 'raca' | 'idealWeightKg' | 'nascimento'>,
    actionHistory: c.fixture.actionHistory,
    weightHistory: c.fixture.weightHistory,
    medicalEvents: c.fixture.medicalEvents,
    ambientTempC: c.fixture.ambientTempC ?? null,
    now: NOW,
  });

  const fired = insights.map((i) => i.id);
  const errors: string[] = [];

  for (const want of c.expectFires) {
    if (!hasPrefix(insights, want)) {
      errors.push(`  ❌ esperado disparar "${want}*" — não apareceu`);
    }
  }
  for (const wantMiss of c.expectMisses ?? []) {
    if (hasPrefix(insights, wantMiss)) {
      errors.push(`  ❌ esperado NÃO disparar "${wantMiss}*" — apareceu`);
    }
  }

  return { name: c.name, pass: errors.length === 0, errors, fired };
}

function main() {
  const startedAt = Date.now();
  const results = CASES.map(runCase);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  // ── Detalhamento por caso ──
  for (const r of results) {
    const tag = r.pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`${tag}  ${r.name}`);
    if (!r.pass) {
      for (const e of r.errors) console.log(e);
      console.log(`  → disparou: [${r.fired.join(', ') || '(nada)'}]`);
    }
  }

  // ── Cobertura de detectores ──
  const allFiredPrefixes = new Set<string>();
  for (const r of results) {
    for (const id of r.fired) {
      const matched = ALL_DETECTOR_PREFIXES.find((p) => id.startsWith(p));
      if (matched) allFiredPrefixes.add(matched);
    }
  }
  const uncovered = ALL_DETECTOR_PREFIXES.filter((p) => !allFiredPrefixes.has(p));

  console.log('');
  console.log(`─── Resumo ────────────────────────────────────`);
  console.log(`Casos:       ${results.length}`);
  console.log(`Passou:      ${passed}`);
  console.log(`Falhou:      ${failed}`);
  console.log(`Cobertura:   ${allFiredPrefixes.size} / ${ALL_DETECTOR_PREFIXES.length} detectores disparados`);
  if (uncovered.length > 0) {
    console.log(`Não cobertos (não dispararam em nenhum caso):`);
    for (const u of uncovered) console.log(`  • ${u}`);
  }
  console.log(`Tempo:       ${Date.now() - startedAt}ms`);

  process.exit(failed === 0 ? 0 : 1);
}

main();
