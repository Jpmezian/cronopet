/**
 * services/HealthInsights.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Motor de detecção de padrões de saúde do pet.
 *
 * Roda 100% local (sem rede, sem IA). Recebe o estado do store
 * e retorna insights priorizados por severidade.
 *
 * IMPORTANTE: NUNCA é diagnóstico. É um sinal pra o tutor prestar
 * atenção e considerar levar ao veterinário. Toda mensagem reforça isso.
 *
 * Heurísticas implementadas:
 *  1. Variação de peso (≥5% em 14d → warning; ≥10% em 30d → alert)
 *  2. Tendência sustentada de perda/ganho (3+ pesagens consecutivas)
 *  3. Queda de apetite (recente < 60% baseline → warning; <40% → alert)
 *  4. Recusas de comida sucessivas (acceptance=refused/partial em 3+ logs)
 *  5. Hidratação baixa (gap >24h durante o dia)
 *  6. Diarreia (2+ liquid em 3d)
 *  7. Constipação (3+ hard em 5d, OU >36h sem coco pra cachorro)
 *  8. Aparência alterada (xixi/coco com appearance='abnormal')
 *  9. Eventos médicos recorrentes (2+ do mesmo tipo em 14d)
 *
 * Cada insight tem ID estável pra ser dismissado pelo tutor.
 */

import type {
  ActionLog, WeightEntry, MedicalEvent, PetProfile,
} from '@/types/pet';
import { getBreedHealthProfile, type BreedHealthProfile } from '@/data/breed-conditions';

// ─── Tipos públicos ────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'alert';

export type InsightCategory =
  | 'weight'
  | 'appetite'
  | 'hydration'
  | 'stool'
  | 'urine'
  | 'medical'
  | 'breed'        // Predisposição racial detectada via sintomas
  | 'exercise'     // Deficit/excesso de exercício vs recomendado
  | 'grooming'     // Banho/tosa atrasados
  | 'thermal';     // Risco térmico (calor/frio) por raça

export interface HealthInsight {
  /** ID estável (mesmo conteúdo = mesmo ID, pra dismiss persistir) */
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  /** Frase curta — vai no card */
  title: string;
  /** Detalhe de 1-2 linhas explicando contexto */
  message: string;
  /** Sugestão de ação — sempre menciona veterinário se severity ≥ warning */
  suggestion: string;
  detectedAt: number;
  /** Para debug e Sentry (NÃO mostrar em UI sem revisar PII) */
  evidence?: Record<string, unknown>;
}

interface AnalyzeInput {
  pet: Pick<PetProfile, 'tipo' | 'raca' | 'idealWeightKg' | 'nascimento'>;
  actionHistory: ActionLog[];
  weightHistory: WeightEntry[];
  medicalEvents: MedicalEvent[];
  /** Timestamp "agora" — injetável pra teste */
  now?: number;
  /** IDs já dismissados — não retorna eles */
  dismissedIds?: string[];
  /** Temperatura ambiente atual em °C (do useWeather) — usado pra alerta térmico */
  ambientTempC?: number | null;
  /** Categorias de insight que o tutor desativou — não geram alerta */
  disabledCategories?: string[];
}

// ─── API pública ───────────────────────────────────────────────────────

/**
 * Analisa o estado e retorna insights priorizados.
 * Limite implícito de N insights — o caller decide quantos mostrar.
 */
export function analyzeHealth(input: AnalyzeInput): HealthInsight[] {
  const now = input.now ?? Date.now();
  const breedProfile = input.pet.raca
    ? getBreedHealthProfile(input.pet.raca, input.pet.tipo)
    : null;

  const ctx: Ctx = {
    now,
    pet: input.pet,
    logs: input.actionHistory,
    weights: input.weightHistory,
    events: input.medicalEvents,
    breedProfile,
    ambientTempC: input.ambientTempC ?? null,
  };

  const all: HealthInsight[] = [
    // ── Detectores genéricos (1-9) ──
    ...detectWeightVariation(ctx),
    ...detectWeightTrend(ctx),
    ...detectAppetiteDrop(ctx),
    ...detectFoodRefusals(ctx),
    ...detectHydrationGap(ctx),
    ...detectDiarrhea(ctx),
    ...detectConstipation(ctx),
    ...detectAbnormalAppearance(ctx),
    ...detectRecurrentMedicalEvents(ctx),
    // ── Detectores raça-específicos (10-13) ──
    ...detectBreedRiskMatch(ctx),
    ...detectExerciseDeficit(ctx),
    // R3-2 (TestFlight): heurística de banho atrasado removida — frequência
    // de banho varia demais por raça, clima, lifestyle. Gerava falsos
    // positivos. Mantemos o método pra reactivar no futuro se virar opt-in.
    // ...detectBathOverdue(ctx),
    ...detectThermalStress(ctx),
    // ── Detectores singulares — Fase 2 (14-30) ──
    // Base: VetCompass (n=3,884 cães primary care UK), Cornell Feline
    // Health Center, AVMA, AKC, Merck Manual. Cobrem os top sintomas
    // que primary care vê e que tutores mais reportam tarde.
    ...detectPolydipsia(ctx),
    ...detectPolyuria(ctx),
    ...detectPolyphagiaWithWeightLoss(ctx),
    ...detectLethargyByActivity(ctx),
    ...detectHalitosis(ctx),
    ...detectEarScratching(ctx),
    ...detectPeriodontal(ctx),
    ...detectAnalSacIssue(ctx),
    ...detectLocalLicking(ctx),
    ...detectThermalIntolerance(ctx),
    ...detectVocalChange(ctx),
    ...detectSleepChange(ctx),
    ...detectBreathDifficulty(ctx),
    ...detectLamenessNote(ctx),
    ...detectChronicVomiting(ctx),
    ...detectBloodyDiarrhea(ctx),
    ...detectNewLump(ctx),
    // ── Detectores compostos (31-40) ──
    // Combinam 2-3 sinais pra subir specificity. Cobrem síndromes
    // clínicas frequentes que sinais isolados não pegam bem.
    ...detectDiabetesSuspicion(ctx),
    ...detectCKDSuspicion(ctx),
    ...detectFelineHyperthyroidism(ctx),
    ...detectArthritisPattern(ctx),
    ...detectOtitisByBreed(ctx),
    ...detectAtopyByBreed(ctx),
    ...detectGDVRisk(ctx),
    ...detectPancreatitisPattern(ctx),
    ...detectCardiomyopathyPattern(ctx),
    ...detectGIEmergency(ctx),
  ];

  const dismissed = new Set(input.dismissedIds ?? []);
  const disabledCats = new Set(input.disabledCategories ?? []);

  return all
    .filter((i) => !dismissed.has(i.id) && !disabledCats.has(i.category))
    .sort(bySeverityDesc);
}

// ═══════════════════════════════════════════════════════════════════════
// Internals
// ═══════════════════════════════════════════════════════════════════════

interface Ctx {
  now: number;
  pet: Pick<PetProfile, 'tipo' | 'raca' | 'idealWeightKg' | 'nascimento'>;
  logs: ActionLog[];
  weights: WeightEntry[];
  events: MedicalEvent[];
  breedProfile: BreedHealthProfile | null;
  ambientTempC: number | null;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

function bySeverityDesc(a: HealthInsight, b: HealthInsight): number {
  const order: Record<InsightSeverity, number> = { alert: 3, warning: 2, info: 1 };
  return order[b.severity] - order[a.severity];
}

function dateToMs(yyyymmdd: string): number {
  // Trata como meia-noite local — boa o suficiente pra range queries de saúde
  return new Date(yyyymmdd + 'T12:00:00').getTime();
}

// ─── 1. Variação de peso ───────────────────────────────────────────────

function detectWeightVariation(ctx: Ctx): HealthInsight[] {
  if (ctx.weights.length < 2) return [];

  const sorted = [...ctx.weights].sort((a, b) => dateToMs(a.data) - dateToMs(b.data));
  const latest = sorted[sorted.length - 1];
  const latestMs = dateToMs(latest.data);

  // Procura referência ~14d e ~30d atrás
  const ref14 = findClosestBefore(sorted, latestMs - 14 * DAY_MS, 7 * DAY_MS);
  const ref30 = findClosestBefore(sorted, latestMs - 30 * DAY_MS, 10 * DAY_MS);

  const out: HealthInsight[] = [];

  if (ref14) {
    const pct = ((latest.peso - ref14.peso) / ref14.peso) * 100;
    if (Math.abs(pct) >= 10) {
      out.push({
        id: `weight_var_14d_${latest.data}`,
        severity: 'alert',
        category: 'weight',
        title: pct < 0 ? 'Perda de peso significativa' : 'Ganho de peso significativo',
        message: `Mudança de ${pct.toFixed(1)}% em ~14 dias (${ref14.peso}kg → ${latest.peso}kg).`,
        suggestion: 'Recomendamos marcar consulta com o veterinário.',
        detectedAt: ctx.now,
        evidence: { fromKg: ref14.peso, toKg: latest.peso, days: 14, pct },
      });
    } else if (Math.abs(pct) >= 5) {
      out.push({
        id: `weight_var_14d_${latest.data}`,
        severity: 'warning',
        category: 'weight',
        title: pct < 0 ? 'Possível perda de peso' : 'Possível ganho de peso',
        message: `Variação de ${pct.toFixed(1)}% nas últimas 2 semanas.`,
        suggestion: 'Vale acompanhar nos próximos dias e considerar avaliação veterinária.',
        detectedAt: ctx.now,
        evidence: { fromKg: ref14.peso, toKg: latest.peso, days: 14, pct },
      });
    }
  }

  if (ref30 && !out.length) {
    const pct = ((latest.peso - ref30.peso) / ref30.peso) * 100;
    if (Math.abs(pct) >= 10) {
      out.push({
        id: `weight_var_30d_${latest.data}`,
        severity: 'warning',
        category: 'weight',
        title: pct < 0 ? 'Tendência de perda de peso' : 'Tendência de ganho de peso',
        message: `Variação de ${pct.toFixed(1)}% no último mês.`,
        suggestion: 'Acompanhe e avalie com veterinário se persistir.',
        detectedAt: ctx.now,
        evidence: { fromKg: ref30.peso, toKg: latest.peso, days: 30, pct },
      });
    }
  }

  return out;
}

function findClosestBefore(
  sorted: WeightEntry[],
  targetMs: number,
  toleranceMs: number,
): WeightEntry | undefined {
  let best: WeightEntry | undefined;
  let bestDiff = Infinity;
  for (const w of sorted) {
    const ms = dateToMs(w.data);
    if (ms > targetMs + toleranceMs) break;
    const diff = Math.abs(ms - targetMs);
    if (diff <= toleranceMs && diff < bestDiff) {
      best = w;
      bestDiff = diff;
    }
  }
  return best;
}

// ─── 2. Tendência sustentada (3+ pesagens consecutivas no mesmo sentido) ──

function detectWeightTrend(ctx: Ctx): HealthInsight[] {
  if (ctx.weights.length < 3) return [];
  const sorted = [...ctx.weights].sort((a, b) => dateToMs(a.data) - dateToMs(b.data));
  const last3 = sorted.slice(-3);

  const allDown = last3[2].peso < last3[1].peso && last3[1].peso < last3[0].peso;
  const allUp   = last3[2].peso > last3[1].peso && last3[1].peso > last3[0].peso;

  if (!allDown && !allUp) return [];

  const totalPct = ((last3[2].peso - last3[0].peso) / last3[0].peso) * 100;
  if (Math.abs(totalPct) < 2) return []; // ruído

  return [{
    id: `weight_trend_${last3[2].data}`,
    severity: 'info',
    category: 'weight',
    title: allDown ? 'Tendência de queda no peso' : 'Tendência de aumento no peso',
    message: `Últimas 3 pesagens consecutivas mostram ${allDown ? 'queda' : 'aumento'} (${totalPct.toFixed(1)}% no total).`,
    suggestion: 'Continue acompanhando. Avise o veterinário na próxima consulta.',
    detectedAt: ctx.now,
    evidence: { entries: last3.map((w) => w.peso) },
  }];
}

// ─── 3. Queda de apetite (média móvel 3d vs 14d baseline) ──────────────

function detectAppetiteDrop(ctx: Ctx): HealthInsight[] {
  const food = ctx.logs.filter((l) => l.key === 'comida');
  if (food.length < 7) return []; // sem baseline confiável

  const recentCutoff   = ctx.now - 3 * DAY_MS;
  const baselineCutoff = ctx.now - 17 * DAY_MS; // 14d antes dos últimos 3

  const recentDays = countDaysWithFood(food, recentCutoff, ctx.now);
  const baselineDays = countDaysWithFood(food, baselineCutoff, recentCutoff);
  if (baselineDays === 0) return [];

  const recentDailyAvg = recentDays / 3;
  const baselineDailyAvg = baselineDays / 14;
  if (baselineDailyAvg < 0.5) return []; // baseline insuficiente

  const ratio = recentDailyAvg / baselineDailyAvg;
  if (ratio < 0.4) {
    return [{
      id: `appetite_drop_${dayKey(ctx.now)}`,
      severity: 'alert',
      category: 'appetite',
      title: 'Queda forte de apetite',
      message: `Nos últimos 3 dias o pet comeu bem menos que o usual (cerca de ${Math.round(ratio * 100)}% do habitual).`,
      suggestion: 'Recomendamos avaliação veterinária — perda prolongada de apetite pode indicar problema de saúde.',
      detectedAt: ctx.now,
      evidence: { recentDailyAvg, baselineDailyAvg, ratio },
    }];
  }
  if (ratio < 0.6) {
    return [{
      id: `appetite_drop_${dayKey(ctx.now)}`,
      severity: 'warning',
      category: 'appetite',
      title: 'Apetite reduzido',
      message: `O pet está comendo menos do que o usual nos últimos dias.`,
      suggestion: 'Observe nos próximos 1-2 dias. Se continuar, marque consulta.',
      detectedAt: ctx.now,
      evidence: { recentDailyAvg, baselineDailyAvg, ratio },
    }];
  }
  return [];
}

function countDaysWithFood(food: ActionLog[], from: number, to: number): number {
  const days = new Set<string>();
  for (const log of food) {
    if (log.timestamp >= from && log.timestamp < to) {
      days.add(dayKey(log.timestamp));
    }
  }
  return days.size;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ─── 4. Recusas sucessivas de comida ───────────────────────────────────

function detectFoodRefusals(ctx: Ctx): HealthInsight[] {
  const recent = ctx.logs
    .filter((l) => l.key === 'comida' && l.timestamp >= ctx.now - 5 * DAY_MS)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  if (recent.length < 3) return [];

  const refused = recent.filter((l) => l.acceptance === 'refused').length;
  const notFull = recent.filter((l) => l.acceptance && l.acceptance !== 'full').length;

  if (refused >= 2) {
    return [{
      id: `food_refused_${dayKey(ctx.now)}`,
      severity: 'warning',
      category: 'appetite',
      title: 'Recusas de comida recorrentes',
      message: `${refused} refeições recusadas nos últimos dias.`,
      suggestion: 'Verifique se mudou ração, ambiente ou rotina. Se persistir, marque consulta.',
      detectedAt: ctx.now,
      evidence: { refused, notFull, sample: recent.length },
    }];
  }
  if (notFull >= 3) {
    return [{
      id: `food_partial_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'appetite',
      title: 'Pet não está terminando as refeições',
      message: `Várias refeições recentes não foram totalmente aceitas.`,
      suggestion: 'Vale observar comportamento e quantidade ofertada.',
      detectedAt: ctx.now,
      evidence: { refused, notFull, sample: recent.length },
    }];
  }
  return [];
}

// ─── 5. Hidratação baixa ───────────────────────────────────────────────

function detectHydrationGap(ctx: Ctx): HealthInsight[] {
  const water = ctx.logs.filter((l) => l.key === 'agua');
  if (water.length === 0) return []; // sem baseline

  const last = water.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  const gap = ctx.now - last.timestamp;

  if (gap > 24 * HOUR_MS) {
    return [{
      id: `hydration_gap_${dayKey(ctx.now)}`,
      severity: 'warning',
      category: 'hydration',
      title: 'Sem registro de água há mais de 24h',
      message: 'Não há registro de hidratação nas últimas horas.',
      suggestion: 'Confirme se o pet está bebendo água. Desidratação é grave em pets — se está recusando, procure o veterinário.',
      detectedAt: ctx.now,
      evidence: { gapHours: Math.round(gap / HOUR_MS) },
    }];
  }
  if (gap > 12 * HOUR_MS) {
    return [{
      id: `hydration_low_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'hydration',
      title: 'Hidratação não registrada hoje',
      message: 'Sem registros de água nas últimas horas — talvez só falta registrar.',
      suggestion: 'Cheque a tigela e registre se o pet bebeu.',
      detectedAt: ctx.now,
      evidence: { gapHours: Math.round(gap / HOUR_MS) },
    }];
  }
  return [];
}

// ─── 6. Diarreia (2+ liquid em 3d) ─────────────────────────────────────

function detectDiarrhea(ctx: Ctx): HealthInsight[] {
  const recent = ctx.logs.filter(
    (l) => l.key === 'coco' && l.timestamp >= ctx.now - 3 * DAY_MS,
  );
  const liquid = recent.filter((l) => l.consistency === 'liquid').length;
  const soft   = recent.filter((l) => l.consistency === 'soft').length;

  if (liquid >= 2) {
    return [{
      id: `diarrhea_${dayKey(ctx.now)}`,
      severity: 'warning',
      category: 'stool',
      title: 'Possível diarreia',
      message: `${liquid} registros de fezes líquidas em 3 dias.`,
      suggestion: 'Mantenha hidratado e procure o veterinário se persistir além de 24h ou houver outros sintomas.',
      detectedAt: ctx.now,
      evidence: { liquid, soft, total: recent.length },
    }];
  }
  if (soft >= 3) {
    return [{
      id: `soft_stool_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'stool',
      title: 'Fezes amolecidas com frequência',
      message: `${soft} registros recentes com consistência amolecida.`,
      suggestion: 'Pode ser dieta ou estresse. Acompanhe nos próximos dias.',
      detectedAt: ctx.now,
      evidence: { liquid, soft, total: recent.length },
    }];
  }
  return [];
}

// ─── 7. Constipação ────────────────────────────────────────────────────

function detectConstipation(ctx: Ctx): HealthInsight[] {
  const cocos = ctx.logs.filter((l) => l.key === 'coco');
  if (cocos.length === 0) return [];

  const lastCoco = cocos.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  const gap = ctx.now - lastCoco.timestamp;

  // Cães e gatos saudáveis fazem cocô pelo menos 1x ao dia
  const thresholdHours = ctx.pet.tipo === 'cachorro' ? 36 : 48;
  if (gap > thresholdHours * HOUR_MS) {
    return [{
      id: `no_stool_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'stool',
      title: 'Sem registros de cocô recentes',
      message: `Último registro há mais de ${Math.round(gap / HOUR_MS)} horas.`,
      suggestion: 'Pode ser apenas falta de registro. Se realmente não evacuou, observe e cheque com veterinário se passar de 48-72h.',
      detectedAt: ctx.now,
      evidence: { gapHours: Math.round(gap / HOUR_MS) },
    }];
  }

  // Hard recorrente
  const hardRecent = ctx.logs.filter(
    (l) => l.key === 'coco'
      && l.timestamp >= ctx.now - 5 * DAY_MS
      && l.consistency === 'hard',
  ).length;
  if (hardRecent >= 3) {
    return [{
      id: `hard_stool_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'stool',
      title: 'Possível constipação',
      message: `${hardRecent} registros recentes de fezes endurecidas.`,
      suggestion: 'Avalie hidratação e fibra na dieta. Persistindo, procure o veterinário.',
      detectedAt: ctx.now,
      evidence: { hardRecent },
    }];
  }
  return [];
}

// ─── 8. Aparência alterada (xixi/coco) ─────────────────────────────────

function detectAbnormalAppearance(ctx: Ctx): HealthInsight[] {
  const recent = ctx.logs.filter(
    (l) => (l.key === 'xixi' || l.key === 'coco')
      && l.timestamp >= ctx.now - 7 * DAY_MS
      && l.appearance === 'abnormal',
  );
  if (recent.length === 0) return [];

  const xixi = recent.filter((l) => l.key === 'xixi').length;
  const coco = recent.filter((l) => l.key === 'coco').length;
  const sev: InsightSeverity = recent.length >= 3 ? 'warning' : 'info';

  return [{
    id: `abnormal_appearance_${dayKey(ctx.now)}`,
    severity: sev,
    category: xixi > coco ? 'urine' : 'stool',
    title: 'Aparência alterada nos registros',
    message: `${recent.length} registro(s) marcado(s) como aparência alterada nos últimos 7 dias${xixi > 0 ? ` (${xixi} xixi)` : ''}${coco > 0 ? ` (${coco} cocô)` : ''}.`,
    suggestion: 'Sangue, cor incomum ou volume estranho merecem avaliação veterinária.',
    detectedAt: ctx.now,
    evidence: { xixi, coco, total: recent.length },
  }];
}

// ─── 9. Eventos médicos recorrentes ────────────────────────────────────

function detectRecurrentMedicalEvents(ctx: Ctx): HealthInsight[] {
  const cutoff = ctx.now - 14 * DAY_MS;
  const recent = ctx.events.filter((e) => e.timestamp >= cutoff);
  if (recent.length === 0) return [];

  const counts: Partial<Record<string, number>> = {};
  for (const e of recent) counts[e.type] = (counts[e.type] ?? 0) + 1;

  const out: HealthInsight[] = [];
  for (const [type, count] of Object.entries(counts)) {
    if ((count ?? 0) >= 2) {
      out.push({
        id: `med_recur_${type}_${dayKey(ctx.now)}`,
        severity: 'warning',
        category: 'medical',
        title: `Sintoma recorrente: ${labelMedicalType(type)}`,
        message: `${count} ocorrência(s) registrada(s) nas últimas 2 semanas.`,
        suggestion: 'Sintomas que voltam pedem avaliação veterinária — leve o histórico do app.',
        detectedAt: ctx.now,
        evidence: { type, count },
      });
    }
  }
  return out;
}

function labelMedicalType(type: string): string {
  const labels: Record<string, string> = {
    vomito: 'vômito',
    febre: 'febre',
    mancando: 'mancando',
    diarreia: 'diarreia',
    coceira: 'coceira',
    perda_apetite: 'perda de apetite',
    outro: 'sintoma',
  };
  return labels[type] ?? type;
}

// ═══════════════════════════════════════════════════════════════════════
// Detectores raça-específicos
// ═══════════════════════════════════════════════════════════════════════

// ─── 10. Sintoma + predisposição racial ──────────────────────────────
//
// Cruza eventos médicos registrados nos últimos 30 dias com as
// predisposições conhecidas da raça. Se um sintoma observado bater com
// algo que a raça é predisposta, sobe pra "warning" mesmo se aparece só 1x
// (pq o risco-base é maior).

function detectBreedRiskMatch(ctx: Ctx): HealthInsight[] {
  if (!ctx.breedProfile || ctx.breedProfile.predispositions.length === 0) return [];

  const cutoff = ctx.now - 30 * DAY_MS;
  const recent = ctx.events.filter((e) => e.timestamp >= cutoff);
  if (recent.length === 0) return [];

  const out: HealthInsight[] = [];
  const matched = new Set<string>(); // Evita duplicar a mesma predisposição

  for (const pred of ctx.breedProfile.predispositions) {
    if (matched.has(pred.condition)) continue;
    if (pred.watchFor.length === 0) continue; // obesityProne etc não tem sintoma observável

    // Procura algum evento médico registrado que bata com os sintomas-alvo
    const hits = recent.filter((e) => pred.watchFor.includes(e.type));
    if (hits.length === 0) continue;

    matched.add(pred.condition);
    const sev: InsightSeverity = pred.severity === 'serious' ? 'alert'
      : pred.severity === 'common' ? 'warning' : 'info';

    out.push({
      id: `breed_match_${pred.condition.replace(/\s+/g, '_').toLowerCase()}_${dayKey(ctx.now)}`,
      severity: sev,
      category: 'breed',
      title: `Sinal compatível com predisposição racial`,
      message: `${ctx.breedProfile.displayName} tem predisposição a "${pred.condition}". Você registrou ${hits.length} ${hits.length === 1 ? 'evento' : 'eventos'} compatível${hits.length === 1 ? '' : 'eis'} nos últimos 30 dias.`,
      suggestion: `${pred.brief} Mencione esse padrão ao veterinário.`,
      detectedAt: ctx.now,
      evidence: { breed: ctx.breedProfile.displayName, condition: pred.condition, hits: hits.length },
    });
  }

  // Limita a 2 alertas raça-match por vez pra não saturar a UI
  return out.slice(0, 2);
}

// ─── 11. Deficit de exercício (cachorros) ────────────────────────────
//
// Compara minutos de passeio dos últimos 7 dias com o recomendado pra raça.
// Só dispara pra cachorro (gato exerciseMinPerDay = 0).

function detectExerciseDeficit(ctx: Ctx): HealthInsight[] {
  if (!ctx.breedProfile || ctx.breedProfile.exerciseMinPerDay === 0) return [];

  // Antes esta heurística era hostil pra usuário novo: registrou 1
  // passeio de 30min → 30/7 = 4.3 min/dia → alerta "deficit grave!".
  // Bug de TestFlight. Agora exigimos:
  //   (a) Pet existe há ≥ 7 dias (usa timestamp do log mais antigo)
  //   (b) Pelo menos 3 dias-com-passeio na janela (não 3 logs do mesmo dia)
  // Caso contrário não há baseline pra falar "média baixa" — calar.
  const oldestLog = ctx.logs.length > 0
    ? Math.min(...ctx.logs.map((l) => l.timestamp))
    : ctx.now;
  const daysOfUse = (ctx.now - oldestLog) / DAY_MS;
  if (daysOfUse < 7) return []; // Pet novo no app — sem baseline confiável

  const cutoff = ctx.now - 7 * DAY_MS;
  const walks = ctx.logs.filter((l) => l.key === 'passeio' && l.timestamp >= cutoff);

  // Conta dias distintos com passeio (não logs — alguém pode logar 2× no
  // mesmo dia). Se < 3 dias distintos, ainda é cedo pra avaliar padrão.
  const walkDays = new Set(
    walks.map((l) => new Date(l.timestamp).toISOString().slice(0, 10))
  );
  if (walkDays.size < 3) return [];

  const totalMinutes = walks.reduce((sum, l) => sum + (l.duration ?? 30), 0);
  // Divide pelo nº de dias REAIS com passeio, não pelos 7 da janela.
  // Tutor que passeia 3× na semana com 60min cada vê "60 min/dia nos
  // dias de passeio", não "26 min/dia" (média diluída e falsa).
  const dailyAvg = totalMinutes / walkDays.size;
  const recommended = ctx.breedProfile.exerciseMinPerDay;
  const ratio = dailyAvg / recommended;

  if (ratio >= 0.7) return []; // 70%+ do recomendado tá ok

  const sev: InsightSeverity = ratio < 0.3 ? 'warning' : 'info';
  return [{
    id: `exercise_deficit_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'exercise',
    title: 'Pet está se exercitando menos que o ideal',
    message: `Média de ${Math.round(dailyAvg)} min nos dias de passeio (${walkDays.size}/7 dias). ${ctx.breedProfile.displayName} precisa de ~${recommended} min/dia.`,
    suggestion: ratio < 0.3
      ? 'Falta de exercício leva a obesidade, ansiedade e problemas comportamentais. Tente aumentar gradualmente.'
      : 'Aumente um pouco o tempo dos passeios — faz diferença pro corpo e pra cabeça.',
    detectedAt: ctx.now,
    evidence: { dailyAvg, recommended, ratio },
  }];
}

// ─── 12. Banho atrasado (DESATIVADO em R3-2) ─────────────────────────
//
// Desabilitado: frequência varia demais por raça/clima/lifestyle e era
// fonte de falso positivo. Mantemos a função pra eventualmente virar
// opt-in pelo tutor (notificação manual). Sem chamadores hoje.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectBathOverdue(ctx: Ctx): HealthInsight[] {
  if (!ctx.breedProfile || ctx.breedProfile.bathFrequencyDays === 0) return [];

  const baths = ctx.logs.filter((l) => l.key === 'banho');
  if (baths.length === 0) return []; // Sem registro pra comparar

  const lastBath = baths.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  const daysSince = (ctx.now - lastBath.timestamp) / DAY_MS;
  const recommended = ctx.breedProfile.bathFrequencyDays;
  const overdueRatio = daysSince / recommended;

  if (overdueRatio < 1.5) return []; // Menos de 50% atrasado, não alerta

  const sev: InsightSeverity = overdueRatio > 2.5 ? 'warning' : 'info';
  return [{
    id: `bath_overdue_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'grooming',
    title: 'Banho atrasado',
    message: `Último banho há ${Math.round(daysSince)} dias. ${ctx.breedProfile.displayName} costuma precisar a cada ~${recommended} dias.`,
    suggestion: ctx.breedProfile.groomingNeeds === 'high'
      ? 'Pelagem dessa raça pede manutenção frequente — nós e dermatites surgem rápido se ficar sem cuidado.'
      : 'Banho mantém a pele saudável e ajuda a perceber caroços, parasitas ou ferimentos.',
    detectedAt: ctx.now,
    evidence: { daysSince: Math.round(daysSince), recommended, ratio: overdueRatio },
  }];
}

// ─── 13. Estresse térmico (calor) ────────────────────────────────────
//
// Se a raça tem heatTolerance baixo (braquicefálicos, pelagem dupla)
// e a temperatura ambiente passou de 28°C, alerta pra evitar passeios
// nas horas quentes. Usa weather (passa-se ambientTempC do useWeather).

function detectThermalStress(ctx: Ctx): HealthInsight[] {
  if (!ctx.breedProfile || ctx.ambientTempC == null) return [];

  // Calor: heatTolerance low + temp ≥ 28°C
  if (ctx.breedProfile.heatTolerance === 'low' && ctx.ambientTempC >= 28) {
    return [{
      id: `heat_risk_${dayKey(ctx.now)}`,
      severity: ctx.ambientTempC >= 32 ? 'alert' : 'warning',
      category: 'thermal',
      title: 'Risco térmico — temperatura alta',
      message: `Hoje está ${ctx.ambientTempC}°C. ${ctx.breedProfile.displayName} tem baixa tolerância ao calor.`,
      suggestion: 'Passeios só de manhã cedo ou após o pôr do sol. Hidratação reforçada. Sinais de hipertermia (ofegante intenso, gengiva escura): emergência.',
      detectedAt: ctx.now,
      evidence: { tempC: ctx.ambientTempC, tolerance: ctx.breedProfile.heatTolerance },
    }];
  }

  // Frio: coldTolerance low + temp ≤ 12°C
  if (ctx.breedProfile.coldTolerance === 'low' && ctx.ambientTempC <= 12) {
    return [{
      id: `cold_risk_${dayKey(ctx.now)}`,
      severity: 'info',
      category: 'thermal',
      title: 'Frio — atenção pra raça sensível',
      message: `Hoje está ${ctx.ambientTempC}°C. ${ctx.breedProfile.displayName} sente frio mais que outras raças.`,
      suggestion: 'Roupinha em passeios curtos. Cama em local protegido de corrente de ar.',
      detectedAt: ctx.now,
      evidence: { tempC: ctx.ambientTempC, tolerance: ctx.breedProfile.coldTolerance },
    }];
  }

  return [];
}

// ═══════════════════════════════════════════════════════════════════════
// FASE 2 — Detectores expandidos (singulares 14-30, compostos 31-40)
// ═══════════════════════════════════════════════════════════════════════
//
// Adicionados em 2026-05-17. Base científica:
//
//   • VetCompass (Royal Veterinary College, n=3,884 cães primary care):
//     top disorders = otitis externa (10.2%), periodontal (9.3%),
//     anal sac (7.1%), obesidade. Gatos: periodontal (13.9%), pulgas.
//   • Cornell Feline Health Center: hipertireoidismo, IRC, asma felina.
//   • AVMA + AKC breed predisposition lists.
//   • Merck Veterinary Manual — sinais clínicos e diferenciais.
//   • The Pet Vet / AKC educational: top early signs missed by owners.
//
// Princípios:
//   - Cada detector retorna 0 ou 1 insight (sem spam).
//   - ID estável (mesmo conteúdo = mesmo ID) pra dismissal persistir.
//   - Suggestion sempre menciona vet se severity >= warning.
//   - Compostos requerem 2-3 sinais convergentes — specificity > recall.
//   - Keyword scan em `note` é fuzzy mas case-insensitive (notesContain).

// ─── Helpers compartilhados pra Fase 2 ──────────────────────────────

function normalize(s: string | undefined): string {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // remove diacríticos
}

function notesContain(text: string | undefined, needles: string[]): boolean {
  const t = normalize(text);
  if (!t) return false;
  return needles.some((n) => t.includes(normalize(n)));
}

/** Junta notas de logs + medical events e conta matches por keyword na janela. */
function countNotesWithAny(ctx: Ctx, keywords: string[], windowDays: number): number {
  const cutoff = ctx.now - windowDays * DAY_MS;
  let count = 0;
  for (const l of ctx.logs) {
    if (l.timestamp < cutoff) continue;
    if (notesContain(l.note, keywords)) count++;
  }
  for (const e of ctx.events) {
    if (e.timestamp < cutoff) continue;
    if (notesContain(e.note, keywords)) count++;
  }
  return count;
}

/** Calcula idade aproximada em anos (null se nascimento ausente). */
function petAgeYears(ctx: Ctx): number | null {
  if (!ctx.pet.nascimento) return null;
  const birth = new Date(ctx.pet.nascimento + 'T12:00:00').getTime();
  if (Number.isNaN(birth)) return null;
  return (ctx.now - birth) / (365.25 * DAY_MS);
}

/** Sênior heurístico: usa lifeExpectancyYears da raça (top 25% da vida). */
function isSenior(ctx: Ctx): boolean {
  const age = petAgeYears(ctx);
  if (age == null) return false;
  const life = ctx.breedProfile?.lifeExpectancyYears;
  if (life) {
    const seniorThreshold = life.min * 0.7; // top 30% da vida
    return age >= seniorThreshold;
  }
  // Fallback genérico: cães ≥8 anos, gatos ≥10 anos
  return ctx.pet.tipo === 'gato' ? age >= 10 : age >= 8;
}

/** Cães grandes de peito profundo (alto risco de GDV/torção gástrica). */
function isLargeDeepChest(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  const name = normalize(ctx.breedProfile.displayName);
  return [
    'pastor alemao', 'doberman', 'dogo argentino', 'fila brasileiro',
    'dogue alemao', 'gran danes', 'bullmastiff', 'mastim',
    'rottweiler', 'boxer', 'weimaraner', 'setter',
    'standard poodle', 'akita', 'cane corso', 'irish wolfhound',
  ].some((b) => name.includes(b));
}

/** Raças com orelha pendular = mais otite externa. */
function hasPendantEars(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  const name = normalize(ctx.breedProfile.displayName);
  return [
    'cocker', 'beagle', 'basset', 'labrador', 'golden',
    'cavalier', 'poodle', 'lhasa', 'shih', 'maltes',
    'dachshund', 'teckel', 'spaniel', 'setter',
  ].some((b) => name.includes(b));
}

/** Raças braquicefálicas = baixa tolerância calor/exercício. */
function isBrachycephalic(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  const name = normalize(ctx.breedProfile.displayName);
  return [
    'pug', 'bulldog', 'buldogue', 'boxer', 'shih tzu',
    'lhasa', 'pequines', 'boston terrier', 'french',
    'persa', 'himalaio', 'exotic',
  ].some((b) => name.includes(b));
}

/** Raças com predisposição cardíaca herdada (Cavalier, Doberman, gatos HCM). */
function hasCardiacPredisposition(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  return ctx.breedProfile.predispositions.some(
    (p) => p.category === 'cardiac',
  );
}

/** Raças com predisposição ortopédica (artrose / displasia). */
function hasOrthopedicPredisposition(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  return ctx.breedProfile.predispositions.some(
    (p) => p.category === 'orthopedic',
  );
}

/** Raças com predisposição dermatológica (atopia, alergia). */
function hasAtopyPredisposition(ctx: Ctx): boolean {
  if (!ctx.breedProfile) return false;
  return ctx.breedProfile.predispositions.some(
    (p) => p.category === 'dermatological',
  );
}

// ─── 14. Polidipsia (água > 50% acima da média) ─────────────────────

function detectPolydipsia(ctx: Ctx): HealthInsight[] {
  const water = ctx.logs.filter((l) => l.key === 'agua');
  if (water.length < 14) return [];

  const recentCut = ctx.now - 7 * DAY_MS;
  const baseCut   = ctx.now - 28 * DAY_MS;

  const recent = water.filter((l) => l.timestamp >= recentCut);
  const base   = water.filter((l) => l.timestamp >= baseCut && l.timestamp < recentCut);
  if (base.length < 7) return [];

  const recentVol = recent.reduce((s, l) => s + (l.volumeMl ?? 150), 0) / 7;
  const baseVol   = base.reduce((s, l) => s + (l.volumeMl ?? 150), 0) / 21;
  if (baseVol < 50) return []; // baseline insuficiente

  const ratio = recentVol / baseVol;
  if (ratio < 1.5) return [];

  const sev: InsightSeverity = ratio > 2.0 ? 'alert' : 'warning';
  return [{
    id: `polydipsia_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'hydration',
    title: 'Aumento marcado no consumo de água',
    message: `Nos últimos 7 dias, o consumo médio subiu ${Math.round((ratio - 1) * 100)}% versus o histórico. Aumento sustentado de sede pode indicar diabetes, doença renal ou outras condições endócrinas.`,
    suggestion: 'Vale uma consulta veterinária — exames simples de sangue/urina esclarecem.',
    detectedAt: ctx.now,
    evidence: { recentVolMl: Math.round(recentVol), baseVolMl: Math.round(baseVol), ratio },
  }];
}

// ─── 15. Poliúria (frequência de xixi acima do esperado) ────────────

function detectPolyuria(ctx: Ctx): HealthInsight[] {
  const pee = ctx.logs.filter((l) => l.key === 'xixi');
  if (pee.length < 14) return [];

  const recentCut = ctx.now - 7 * DAY_MS;
  const baseCut   = ctx.now - 28 * DAY_MS;

  const recentCount = pee.filter((l) => l.timestamp >= recentCut).length;
  const baseCount   = pee.filter((l) => l.timestamp >= baseCut && l.timestamp < recentCut).length;
  if (baseCount < 7) return [];

  const recentRate = recentCount / 7;
  const baseRate   = baseCount / 21;
  const ratio = recentRate / baseRate;
  if (ratio < 1.5) return [];

  return [{
    id: `polyuria_${dayKey(ctx.now)}`,
    severity: ratio > 2.0 ? 'alert' : 'warning',
    category: 'urine',
    title: 'Aumento na frequência de urinar',
    message: `Pet urinou ${Math.round((ratio - 1) * 100)}% mais frequente nos últimos 7 dias. Associado à sede aumentada, é sinal clássico de diabetes ou doença renal.`,
    suggestion: 'Consulta veterinária recomendada — exame de urina é rápido e esclarecedor.',
    detectedAt: ctx.now,
    evidence: { recentPerDay: recentRate, basePerDay: baseRate, ratio },
  }];
}

// ─── 16. Polifagia + perda de peso (combinação de alarme) ───────────

function detectPolyphagiaWithWeightLoss(ctx: Ctx): HealthInsight[] {
  const food = ctx.logs.filter((l) => l.key === 'comida');
  if (food.length < 7 || ctx.weights.length < 2) return [];

  const recentCut = ctx.now - 14 * DAY_MS;
  const baseCut   = ctx.now - 42 * DAY_MS;
  const recentDays = countDaysWithFood(food, recentCut, ctx.now);
  const baseDays   = countDaysWithFood(food, baseCut, recentCut);
  if (baseDays < 14) return [];

  const recentRate = recentDays / 14;
  const baseRate   = baseDays / 28;
  if (baseRate < 0.5) return [];

  const appetiteUp = recentRate / baseRate >= 1.2;
  if (!appetiteUp) return [];

  // Peso caiu ≥3% no mesmo período?
  const sorted = [...ctx.weights].sort((a, b) => dateToMs(a.data) - dateToMs(b.data));
  const latest = sorted[sorted.length - 1];
  const ref = findClosestBefore(sorted, dateToMs(latest.data) - 30 * DAY_MS, 14 * DAY_MS);
  if (!ref) return [];
  const pctLoss = ((latest.peso - ref.peso) / ref.peso) * 100;
  if (pctLoss > -3) return [];

  const isCat = ctx.pet.tipo === 'gato';
  return [{
    id: `polyphagia_weightloss_${dayKey(ctx.now)}`,
    severity: 'alert',
    category: 'weight',
    title: 'Comendo mais e perdendo peso — combinação importante',
    message: `Apetite aumentou ${Math.round((recentRate / baseRate - 1) * 100)}% mas o pet perdeu ${Math.abs(pctLoss).toFixed(1)}% de peso no último mês. ${isCat ? 'Em gatos, é o padrão clássico de hipertireoidismo.' : 'Em cães, pode indicar diabetes, parasitas ou má-absorção.'}`,
    suggestion: 'Avaliação veterinária com exames de sangue é a próxima etapa.',
    detectedAt: ctx.now,
    evidence: { appetiteRatio: recentRate / baseRate, weightPctChange: pctLoss },
  }];
}

// ─── 17. Letargia por queda de atividade ─────────────────────────────

function detectLethargyByActivity(ctx: Ctx): HealthInsight[] {
  const walks = ctx.logs.filter((l) => l.key === 'passeio');
  if (walks.length < 14) return [];

  const recentCut = ctx.now - 14 * DAY_MS;
  const baseCut   = ctx.now - 42 * DAY_MS;

  const recentMin = walks
    .filter((l) => l.timestamp >= recentCut)
    .reduce((s, l) => s + (l.duration ?? 30), 0) / 14;
  const baseMin = walks
    .filter((l) => l.timestamp >= baseCut && l.timestamp < recentCut)
    .reduce((s, l) => s + (l.duration ?? 30), 0) / 28;
  if (baseMin < 5) return [];

  const ratio = recentMin / baseMin;
  if (ratio > 0.6) return [];

  const noteSignals = countNotesWithAny(
    ctx,
    ['letargia', 'sem energia', 'apatico', 'apatica', 'desanimado', 'desanimada', 'sem vontade', 'parado'],
    14,
  );

  const sev: InsightSeverity = noteSignals >= 1 || ratio < 0.4 ? 'warning' : 'info';
  return [{
    id: `lethargy_activity_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'exercise',
    title: 'Queda na atividade do pet',
    message: `Tempo de passeio caiu ${Math.round((1 - ratio) * 100)}% em comparação ao último mês.${noteSignals > 0 ? ' Você também anotou sinais de desânimo recentemente.' : ''} Letargia é sinal inespecífico mas comum em doenças sistêmicas.`,
    suggestion: sev === 'warning'
      ? 'Vale uma avaliação clínica — descartar dor, infecção, anemia ou problema endócrino.'
      : 'Observe nos próximos dias — se persistir ou piorar, leve ao veterinário.',
    detectedAt: ctx.now,
    evidence: { recentMinPerDay: recentMin, baseMinPerDay: baseMin, ratio, noteSignals },
  }];
}

// ─── 18. Halitose (mau hálito persistente) ───────────────────────────

function detectHalitosis(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['mau halito', 'mau-halito', 'halitose', 'boca fedendo', 'respiracao fedendo', 'baforada', 'boca cheirando', 'halito'],
    30,
  );
  if (hits < 2) return [];

  return [{
    id: `halitosis_${dayKey(ctx.now)}`,
    severity: hits >= 4 ? 'warning' : 'info',
    category: 'medical',
    title: 'Mau hálito persistente',
    message: `Mau hálito foi anotado ${hits}x no último mês. Causa #1 em pets é doença periodontal (tártaro, gengivite) — atinge ~70% dos cães e gatos a partir dos 3 anos. Halitose súbita também pode indicar doença renal ou diabetes.`,
    suggestion: 'Vale avaliação dentária no veterinário e considerar limpeza profissional.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ─── 19. Coçar/balançar orelha (otite externa) ───────────────────────

function detectEarScratching(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['cocando orelha', 'balancando cabeca', 'sacudindo cabeca', 'orelha fedendo', 'cera orelha', 'cera escura', 'orelha vermelha', 'orelha quente'],
    14,
  );
  if (hits < 2) return [];

  return [{
    id: `ear_scratching_${dayKey(ctx.now)}`,
    severity: hits >= 3 ? 'warning' : 'info',
    category: 'medical',
    title: 'Sinais de incômodo na orelha',
    message: `Comportamentos de orelha foram anotados ${hits}x nas últimas 2 semanas. Otite externa é a queixa veterinária mais comum em cães (10% dos atendimentos primários).${hasPendantEars(ctx) ? ` ${ctx.breedProfile?.displayName} tem orelha pendular, o que aumenta o risco.` : ''}`,
    suggestion: 'Consulta com otoscopia — quanto mais cedo, menos invasivo o tratamento.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits, pendantEars: hasPendantEars(ctx) },
  }];
}

// ─── 20. Doença periodontal (sinais bucais) ──────────────────────────

function detectPeriodontal(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['tartaro', 'gengiva sangrando', 'gengiva inflamada', 'dente mole', 'dente caindo', 'dificuldade mastigar', 'mastigando de lado', 'salivando muito'],
    30,
  );
  if (hits < 2) return [];

  return [{
    id: `periodontal_${dayKey(ctx.now)}`,
    severity: hits >= 4 ? 'warning' : 'info',
    category: 'medical',
    title: 'Sinais de problema dentário',
    message: `Sinais bucais foram anotados ${hits}x no último mês. Doença periodontal é a condição mais diagnosticada em cães e gatos primary care (~9-14% dos atendimentos) e pode levar a infecção sistêmica.`,
    suggestion: 'Avaliação dentária veterinária — limpeza profissional sob anestesia pode ser necessária.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ─── 21. Arrastar bumbum / problema de glândula anal ─────────────────

function detectAnalSacIssue(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['arrastando bumbum', 'arrastando o bumbum', 'trenzinho', 'trenó', 'esfregando bumbum', 'lambendo bumbum', 'lambendo anus', 'cheiro estranho atras'],
    14,
  );
  if (hits < 1) return [];

  return [{
    id: `anal_sac_${dayKey(ctx.now)}`,
    severity: hits >= 3 ? 'warning' : 'info',
    category: 'medical',
    title: 'Possível desconforto na região anal',
    message: `Anotado ${hits}x nas últimas 2 semanas. Impactação de glândula anal é a terceira queixa mais comum em primary care (~7% dos cães). Causa coceira intensa e, se não tratada, pode infeccionar.`,
    suggestion: 'Veterinário pode esvaziar as glândulas manualmente em consulta — rápido e alivia imediatamente.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ─── 22. Lambida excessiva em local específico ───────────────────────

function detectLocalLicking(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['lambendo muito', 'lambendo a pata', 'lambendo a perna', 'lambendo demais', 'lambendo direto', 'lambida obsessiva', 'lambendo sempre'],
    14,
  );
  if (hits < 2) return [];

  return [{
    id: `local_licking_${dayKey(ctx.now)}`,
    severity: hits >= 3 ? 'warning' : 'info',
    category: 'medical',
    title: 'Lambida excessiva em local específico',
    message: `Comportamento anotado ${hits}x. Lambida focal em um ponto geralmente indica dor (articulação, ferida), alergia (atopia, contato) ou ansiedade.`,
    suggestion: 'Avalie a pele/articulação do local, e se persistir leve ao veterinário pra inspeção.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ─── 23. Intolerância térmica nova ───────────────────────────────────

function detectThermalIntolerance(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['procurando lugar fresco', 'fugindo do calor', 'ofegante demais', 'arfando muito', 'ofegando em repouso', 'lingua de fora'],
    14,
  );
  if (hits < 2) return [];

  const isCat = ctx.pet.tipo === 'gato';
  return [{
    id: `thermal_intolerance_${dayKey(ctx.now)}`,
    severity: hits >= 3 ? 'warning' : 'info',
    category: 'thermal',
    title: 'Intolerância ao calor nova',
    message: `Comportamento anotado ${hits}x nas últimas 2 semanas.${isCat ? ' Em gatos, busca por locais frescos pode indicar hipertireoidismo.' : ' Em cães, pode indicar problema cardíaco, anemia ou disfunção respiratória.'}${isBrachycephalic(ctx) ? ' Atenção redobrada — raça braquicefálica.' : ''}`,
    suggestion: 'Vale avaliação veterinária — descartar problema cardio/respiratório/endócrino.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits, brachycephalic: isBrachycephalic(ctx) },
  }];
}

// ─── 24. Mudança de vocalização (gato sênior → hipertireoidismo) ─────

function detectVocalChange(ctx: Ctx): HealthInsight[] {
  if (ctx.pet.tipo !== 'gato') return [];

  const hits = countNotesWithAny(
    ctx,
    ['miando muito', 'miando direto', 'miando alto', 'vocalizando', 'uivando', 'mais carente', 'mais agitado'],
    21,
  );
  if (hits < 2) return [];

  const sev: InsightSeverity = isSenior(ctx) ? 'warning' : 'info';
  return [{
    id: `vocal_change_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'medical',
    title: 'Mudança no padrão de vocalização',
    message: `Vocalização aumentada anotada ${hits}x nas últimas 3 semanas.${isSenior(ctx) ? ' Em gatos seniores, é sinal frequente de hipertireoidismo, hipertensão ou disfunção cognitiva.' : ' Pode ser dor, ansiedade ou problema sensorial.'}`,
    suggestion: isSenior(ctx)
      ? 'Avaliação veterinária com exames de sangue (T4) é recomendada pra gatos com mudança vocal.'
      : 'Observe contexto. Se persistir, vale check-up veterinário.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits, isSenior: isSenior(ctx) },
  }];
}

// ─── 25. Mudança no padrão de sono ───────────────────────────────────

function detectSleepChange(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['dormindo demais', 'dormindo muito', 'dorme o dia todo', 'mais sono', 'dorme mais', 'desperta noite', 'inquieto noite', 'andando noite'],
    21,
  );
  if (hits < 2) return [];

  return [{
    id: `sleep_change_${dayKey(ctx.now)}`,
    severity: hits >= 3 ? 'warning' : 'info',
    category: 'medical',
    title: 'Mudança no padrão de sono',
    message: `Anotado ${hits}x nas últimas 3 semanas. Sono aumentado pode indicar dor crônica, hipotireoidismo (cães) ou IRC. Inquietude noturna em pet sênior pode ser disfunção cognitiva.`,
    suggestion: 'Vale consulta veterinária pra descartar causa orgânica.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits, isSenior: isSenior(ctx) },
  }];
}

// ─── 26. Dificuldade respiratória em repouso ─────────────────────────

function detectBreathDifficulty(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['respirando rapido', 'respiracao rapida', 'ofegante em repouso', 'falta de ar', 'cansando facil', 'cansando rapido', 'respirando estranho', 'respirando com dificuldade'],
    14,
  );
  if (hits < 1) return [];

  const sev: InsightSeverity = hits >= 2 || hasCardiacPredisposition(ctx) ? 'alert' : 'warning';
  return [{
    id: `breath_difficulty_${dayKey(ctx.now)}`,
    severity: sev,
    category: 'medical',
    title: 'Possível dificuldade respiratória',
    message: `Anotado ${hits}x nas últimas 2 semanas.${hasCardiacPredisposition(ctx) ? ` ${ctx.breedProfile?.displayName} tem predisposição cardíaca, o que aumenta a urgência.` : ''} Frequência respiratória em repouso anormal é sinal cardio/pulmonar importante.`,
    suggestion: 'Avaliação veterinária — pode pedir radiografia torácica ou ultrassom cardíaco. Se piorar agudamente, é emergência.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits, cardiac: hasCardiacPredisposition(ctx) },
  }];
}

// ─── 27. Mancando (nota + evento médico) ─────────────────────────────

function detectLamenessNote(ctx: Ctx): HealthInsight[] {
  const noteHits = countNotesWithAny(
    ctx,
    ['mancando', 'manca', 'sem apoiar', 'patinha', 'pulou e ai', 'doendo perna', 'doendo pata', 'pulando 3 patas'],
    14,
  );
  const eventHits = ctx.events.filter(
    (e) => e.timestamp >= ctx.now - 14 * DAY_MS && e.type === 'mancando',
  ).length;
  const total = noteHits + eventHits;
  if (total < 1) return [];

  return [{
    id: `lameness_${dayKey(ctx.now)}`,
    severity: total >= 3 || hasOrthopedicPredisposition(ctx) ? 'warning' : 'info',
    category: 'medical',
    title: 'Pet mancando ou favorecendo membro',
    message: `Registrado ${total}x nas últimas 2 semanas.${hasOrthopedicPredisposition(ctx) ? ` ${ctx.breedProfile?.displayName} tem predisposição ortopédica.` : ''} Causas comuns: lesão de ligamento, luxação patela, displasia, artrose.`,
    suggestion: total >= 2
      ? 'Avaliação ortopédica veterinária — quanto antes, menor risco de cronificação.'
      : 'Observe nos próximos dias. Se persistir ou piorar, leve ao veterinário.',
    detectedAt: ctx.now,
    evidence: { noteHits, eventHits, orthopedic: hasOrthopedicPredisposition(ctx) },
  }];
}

// ─── 28. Vômito crônico (≥2/sem por 2 semanas) ──────────────────────

function detectChronicVomiting(ctx: Ctx): HealthInsight[] {
  const cutoff = ctx.now - 14 * DAY_MS;
  const vomits = ctx.events.filter(
    (e) => e.type === 'vomito' && e.timestamp >= cutoff,
  );
  if (vomits.length < 4) return [];

  return [{
    id: `chronic_vomiting_${dayKey(ctx.now)}`,
    severity: vomits.length >= 6 ? 'alert' : 'warning',
    category: 'medical',
    title: 'Vômito recorrente',
    message: `${vomits.length} episódios nas últimas 2 semanas. Vômito crônico (≥2x/semana por 2+ semanas) é critério clínico pra investigação — diferenciais incluem gastrite, IBD, parasitas, doença renal e endocrina.`,
    suggestion: 'Avaliação veterinária com possível hemograma/bioquímico. Leve as anotações de frequência e aspecto.',
    detectedAt: ctx.now,
    evidence: { episodes: vomits.length, windowDays: 14 },
  }];
}

// ─── 29. Diarreia com sangue (urgência) ─────────────────────────────

function detectBloodyDiarrhea(ctx: Ctx): HealthInsight[] {
  const cutoff = ctx.now - 7 * DAY_MS;
  // Nota com sangue OU evento diarreia + nota mencionando sangue
  const noteHits = countNotesWithAny(
    ctx,
    ['sangue no coco', 'sangue nas fezes', 'fezes com sangue', 'coco com sangue', 'fezes pretas', 'melena', 'sangramento'],
    7,
  );
  const recentDiarrhea = ctx.events.some(
    (e) => e.type === 'diarreia' && e.timestamp >= cutoff,
  );
  if (noteHits < 1 && !recentDiarrhea) return [];
  if (noteHits < 1) return []; // só diarreia sem nota de sangue, não escalado aqui

  return [{
    id: `bloody_diarrhea_${dayKey(ctx.now)}`,
    severity: 'alert',
    category: 'stool',
    title: 'Fezes com sangue — atenção imediata',
    message: 'Presença de sangue nas fezes é sinal de alarme. Causas vão de parasitas e dieta até parvovirose (filhotes), intussuscepção, doença inflamatória intestinal e tumores.',
    suggestion: 'Avaliação veterinária no MESMO dia. Leve uma amostra recente se possível.',
    detectedAt: ctx.now,
    evidence: { occurrences: noteHits, hasDiarrheaEvent: recentDiarrhea },
  }];
}

// ─── 30. Massa palpável nova ─────────────────────────────────────────

function detectNewLump(ctx: Ctx): HealthInsight[] {
  const hits = countNotesWithAny(
    ctx,
    ['caroco', 'bolinha', 'nodulo', 'nodulinho', 'massa', 'pelota', 'inchaco', 'ferida que nao cura', 'crescimento'],
    30,
  );
  if (hits < 1) return [];

  return [{
    id: `new_lump_${dayKey(ctx.now)}`,
    severity: 'warning',
    category: 'medical',
    title: 'Massa ou caroço novo registrado',
    message: `Nota sobre massa/caroço encontrada ${hits}x no último mês. Nem todo caroço é grave (cistos, lipomas são benignos), mas crescimentos novos precisam de avaliação clínica e, se indicado, citologia.`,
    suggestion: 'Avaliação veterinária com possível punção aspirativa — quanto mais cedo identificar, melhor o prognóstico se for maligno.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ═══════════════════════════════════════════════════════════════════════
// DETECTORES COMPOSTOS — combinam 2-3 sinais pra subir specificity
// ═══════════════════════════════════════════════════════════════════════
//
// Princípio: sinais isolados têm muito false positive. Combinações têm
// poder discriminatório real. Cada composto reflete uma síndrome clínica
// conhecida e referenciada na literatura.

// ─── Helpers compartilhados (reaproveitam lógica dos singulares) ─────

function _polydipsia(ctx: Ctx): boolean {
  return detectPolydipsia(ctx).length > 0;
}
function _polyuria(ctx: Ctx): boolean {
  return detectPolyuria(ctx).length > 0;
}
function _weightLossPct(ctx: Ctx, days = 30): number | null {
  if (ctx.weights.length < 2) return null;
  const sorted = [...ctx.weights].sort((a, b) => dateToMs(a.data) - dateToMs(b.data));
  const latest = sorted[sorted.length - 1];
  const ref = findClosestBefore(sorted, dateToMs(latest.data) - days * DAY_MS, 14 * DAY_MS);
  if (!ref) return null;
  return ((latest.peso - ref.peso) / ref.peso) * 100;
}
function _hasHalitosis(ctx: Ctx): boolean {
  return countNotesWithAny(ctx, ['mau halito', 'halitose', 'boca fedendo', 'halito'], 30) >= 1;
}
function _polyphagia(ctx: Ctx): boolean {
  const food = ctx.logs.filter((l) => l.key === 'comida');
  if (food.length < 14) return false;
  const recent = countDaysWithFood(food, ctx.now - 14 * DAY_MS, ctx.now);
  const base = countDaysWithFood(food, ctx.now - 42 * DAY_MS, ctx.now - 14 * DAY_MS);
  if (base < 14) return false;
  return (recent / 14) / (base / 28) >= 1.2;
}

// ─── 31. Diabetes suspeita ───────────────────────────────────────────

function detectDiabetesSuspicion(ctx: Ctx): HealthInsight[] {
  const pd = _polydipsia(ctx);
  const pu = _polyuria(ctx);
  const pph = _polyphagia(ctx);
  const wl = (_weightLossPct(ctx, 30) ?? 0) <= -3;

  // PD + PU isoladamente já levantam suspeita; somar polifagia OU perda
  // de peso fecha o quadro clássico.
  if (!(pd && pu)) return [];
  if (!(pph || wl)) return [];

  return [{
    id: `diabetes_suspicion_${dayKey(ctx.now)}`,
    severity: 'alert',
    category: 'medical',
    title: 'Padrão compatível com diabetes',
    message: `Combinação detectada: sede aumentada + urina aumentada + ${pph ? 'fome aumentada' : 'perda de peso'}. Esse é o quadro clássico de diabetes mellitus em cães e gatos.`,
    suggestion: 'Avaliação veterinária com glicemia e urinálise é a próxima etapa. Diagnóstico precoce evita cetoacidose.',
    detectedAt: ctx.now,
    evidence: { polydipsia: pd, polyuria: pu, polyphagia: pph, weightLoss: wl },
  }];
}

// ─── 32. Doença renal crônica suspeita ──────────────────────────────

function detectCKDSuspicion(ctx: Ctx): HealthInsight[] {
  if (!isSenior(ctx)) return [];

  const pd = _polydipsia(ctx);
  const halito = _hasHalitosis(ctx);
  const wl = (_weightLossPct(ctx, 60) ?? 0) <= -5;

  // Tríade: polidipsia + halitose urêmica + perda peso em sênior
  let signals = 0;
  if (pd) signals++;
  if (halito) signals++;
  if (wl) signals++;
  if (signals < 2) return [];

  return [{
    id: `ckd_suspicion_${dayKey(ctx.now)}`,
    severity: signals === 3 ? 'alert' : 'warning',
    category: 'medical',
    title: 'Padrão compatível com doença renal',
    message: `Pet sênior com ${signals} sinais convergentes${pd ? ' (sede aumentada)' : ''}${halito ? ' (halitose)' : ''}${wl ? ' (perda de peso ≥5% em 60d)' : ''}. Doença renal crônica é uma das principais causas de morte em pets idosos e progride silenciosa.`,
    suggestion: 'Avaliação veterinária com painel renal (uréia, creatinina, SDMA) e urinálise é importante. Quanto antes detecta, mais opções de manejo.',
    detectedAt: ctx.now,
    evidence: { polydipsia: pd, halitosis: halito, weightLoss: wl, signals },
  }];
}

// ─── 33. Hipertireoidismo felino ─────────────────────────────────────

function detectFelineHyperthyroidism(ctx: Ctx): HealthInsight[] {
  if (ctx.pet.tipo !== 'gato') return [];
  if (!isSenior(ctx)) return [];

  const pph = _polyphagia(ctx);
  const wl = (_weightLossPct(ctx, 60) ?? 0) <= -5;
  const vocal = countNotesWithAny(ctx, ['miando muito', 'miando alto', 'vocalizando', 'mais agitado'], 21) >= 2;
  const thermal = countNotesWithAny(ctx, ['procurando lugar fresco', 'ofegante', 'arfando'], 21) >= 1;

  // Polifagia + perda de peso = quase patognomônico em gato sênior
  if (!(pph && wl)) return [];

  const extras = (vocal ? 1 : 0) + (thermal ? 1 : 0);
  return [{
    id: `hyperthyroid_${dayKey(ctx.now)}`,
    severity: 'alert',
    category: 'medical',
    title: 'Padrão compatível com hipertireoidismo (gato)',
    message: `Gato sênior comendo mais e perdendo peso${extras > 0 ? ` + ${extras === 2 ? 'vocalização aumentada e intolerância ao calor' : vocal ? 'vocalização aumentada' : 'intolerância ao calor'}` : ''}. Hipertireoidismo é a endocrinopatia mais comum em gatos com 10+ anos.`,
    suggestion: 'Exame de T4 total é o teste de triagem. Diagnóstico precoce evita complicações cardíacas e renais.',
    detectedAt: ctx.now,
    evidence: { polyphagia: pph, weightLoss: wl, vocalChange: vocal, thermalIntol: thermal },
  }];
}

// ─── 34. Padrão de artrose ──────────────────────────────────────────

function detectArthritisPattern(ctx: Ctx): HealthInsight[] {
  const noteHits = countNotesWithAny(
    ctx,
    ['mancando', 'manca', 'dificuldade levantar', 'dificuldade subir', 'rigidez', 'patinha dura', 'doendo perna', 'andando devagar'],
    21,
  );
  const sleepChange = countNotesWithAny(
    ctx,
    ['dormindo mais', 'dorme demais', 'sem energia', 'menos brincalhao', 'menos animado'],
    21,
  ) >= 1;
  const eventLame = ctx.events.filter(
    (e) => e.type === 'mancando' && e.timestamp >= ctx.now - 30 * DAY_MS,
  ).length;

  if (noteHits + eventLame < 2) return [];

  const orth = hasOrthopedicPredisposition(ctx);
  const senior = isSenior(ctx);
  // Requer pelo menos 1 fator de risco (raça ou idade)
  if (!orth && !senior) return [];

  return [{
    id: `arthritis_pattern_${dayKey(ctx.now)}`,
    severity: noteHits + eventLame >= 4 ? 'warning' : 'info',
    category: 'medical',
    title: 'Padrão compatível com artrose / problema articular',
    message: `Sinais de mancada/rigidez registrados ${noteHits + eventLame}x${sleepChange ? ' + queda de atividade' : ''}.${orth ? ` ${ctx.breedProfile?.displayName} tem predisposição ortopédica.` : ''}${senior ? ' Pet sênior = risco ↑.' : ''} Artrose é progressiva mas manejável com tratamento precoce.`,
    suggestion: 'Avaliação ortopédica veterinária. Existem opções modernas de manejo (anti-inflamatórios seguros, suplementos, fisioterapia).',
    detectedAt: ctx.now,
    evidence: { noteHits, eventLame, sleepChange, orthopedic: orth, senior },
  }];
}

// ─── 35. Otite externa por raça predisposta ──────────────────────────

function detectOtitisByBreed(ctx: Ctx): HealthInsight[] {
  if (!hasPendantEars(ctx)) return [];

  const hits = countNotesWithAny(
    ctx,
    ['cocando orelha', 'balancando cabeca', 'sacudindo cabeca', 'orelha fedendo', 'cera escura'],
    21,
  );
  const eventScratch = ctx.events.filter(
    (e) => e.type === 'coceira' && e.timestamp >= ctx.now - 21 * DAY_MS,
  ).length;

  if (hits + eventScratch < 2) return [];

  return [{
    id: `otitis_by_breed_${dayKey(ctx.now)}`,
    severity: 'warning',
    category: 'breed',
    title: 'Risco aumentado de otite (raça com orelha pendular)',
    message: `${ctx.breedProfile?.displayName} tem orelha pendular = umidade retida = ambiente propício pra otite. Sinais registrados ${hits + eventScratch}x nas últimas 3 semanas.`,
    suggestion: 'Consulta com otoscopia + provavelmente citologia da cera. Limpeza preventiva regular previne recidiva.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits + eventScratch },
  }];
}

// ─── 36. Atopia (alergia ambiental) em raça predisposta ──────────────

function detectAtopyByBreed(ctx: Ctx): HealthInsight[] {
  if (!hasAtopyPredisposition(ctx)) return [];

  const hits = countNotesWithAny(
    ctx,
    ['cocando muito', 'lambendo pata', 'pele vermelha', 'manchas pele', 'alergia', 'cocando direto', 'pelo caindo'],
    30,
  );
  const eventScratch = ctx.events.filter(
    (e) => e.type === 'coceira' && e.timestamp >= ctx.now - 30 * DAY_MS,
  ).length;

  if (hits + eventScratch < 3) return [];

  return [{
    id: `atopy_pattern_${dayKey(ctx.now)}`,
    severity: 'warning',
    category: 'breed',
    title: 'Padrão compatível com dermatite atópica',
    message: `${ctx.breedProfile?.displayName} tem predisposição a alergias. Coceira/sinais cutâneos registrados ${hits + eventScratch}x no último mês. Atopia geralmente começa entre 1-3 anos.`,
    suggestion: 'Avaliação dermatológica veterinária. Manejo bem feito (banhos, dieta, controle ambiental, medicação se necessário) controla muito bem.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits + eventScratch },
  }];
}

// ─── 37. Risco de GDV (torção gástrica) ──────────────────────────────

function detectGDVRisk(ctx: Ctx): HealthInsight[] {
  if (!isLargeDeepChest(ctx)) return [];

  const hits = countNotesWithAny(
    ctx,
    ['regurgitou', 'regurgitando', 'vomitou apos comer', 'abdomen inchado', 'barriga inchada', 'tentando vomitar sem sair'],
    14,
  );
  if (hits < 1) return [];

  return [{
    id: `gdv_risk_${dayKey(ctx.now)}`,
    severity: hits >= 2 ? 'alert' : 'warning',
    category: 'breed',
    title: 'Atenção: risco de torção gástrica (raça de peito profundo)',
    message: `${ctx.breedProfile?.displayName} tem alto risco anatômico de GDV (dilatação-vólvulo gástrico). Sinais relacionados foram anotados ${hits}x. GDV é EMERGÊNCIA — letal sem cirurgia em horas.`,
    suggestion: 'Se aparecer barriga muito inchada, tentativas improdutivas de vomitar ou agitação extrema: emergência IMEDIATA. Discuta gastropexia preventiva com o vet.',
    detectedAt: ctx.now,
    evidence: { occurrences: hits },
  }];
}

// ─── 38. Padrão compatível com pancreatite ──────────────────────────

function detectPancreatitisPattern(ctx: Ctx): HealthInsight[] {
  const vomitYellow = countNotesWithAny(
    ctx,
    ['vomito amarelo', 'vomitou amarelo', 'vomito bile', 'vomito amargo'],
    14,
  );
  const abdomenPain = countNotesWithAny(
    ctx,
    ['dor barriga', 'barriga dolorida', 'arqueando', 'postura rezando', 'sensivel toque'],
    14,
  );
  const fattyMeal = countNotesWithAny(
    ctx,
    ['comeu gordura', 'comida gordurosa', 'sobra de carne', 'osso de churrasco', 'roubou comida'],
    14,
  );

  const score = vomitYellow * 2 + abdomenPain * 2 + fattyMeal;
  if (score < 2) return [];

  return [{
    id: `pancreatitis_pattern_${dayKey(ctx.now)}`,
    severity: score >= 4 ? 'alert' : 'warning',
    category: 'medical',
    title: 'Sinais compatíveis com pancreatite',
    message: `Combinação detectada${vomitYellow > 0 ? ` (vômito biliar ${vomitYellow}x)` : ''}${abdomenPain > 0 ? ` (sinais de dor abdominal ${abdomenPain}x)` : ''}${fattyMeal > 0 ? ' + ingestão recente de alimento gorduroso' : ''}. Pancreatite é uma das emergências GI mais comuns.`,
    suggestion: 'Avaliação veterinária com exames (lipase, amilase, ultrassom). Pancreatite leve trata em casa, severa precisa internação.',
    detectedAt: ctx.now,
    evidence: { vomitYellow, abdomenPain, fattyMeal, score },
  }];
}

// ─── 39. Cardiomiopatia / insuficiência cardíaca ────────────────────

function detectCardiomyopathyPattern(ctx: Ctx): HealthInsight[] {
  if (!hasCardiacPredisposition(ctx)) return [];

  const cough = countNotesWithAny(
    ctx,
    ['tossindo', 'tosse seca', 'tosse a noite', 'engasgando', 'tosse depois exercicio'],
    30,
  );
  const fatigue = countNotesWithAny(
    ctx,
    ['cansando rapido', 'cansando facil', 'sem folego', 'parando no passeio', 'nao quer passear', 'desmaiou', 'sincope'],
    30,
  );
  const breathDiff = detectBreathDifficulty(ctx).length > 0;

  let signals = 0;
  if (cough >= 1) signals++;
  if (fatigue >= 1) signals++;
  if (breathDiff) signals++;
  if (signals < 2) return [];

  return [{
    id: `cardiomyopathy_${dayKey(ctx.now)}`,
    severity: signals === 3 || fatigue >= 2 ? 'alert' : 'warning',
    category: 'breed',
    title: 'Sinais compatíveis com problema cardíaco',
    message: `${ctx.breedProfile?.displayName} tem predisposição cardíaca conhecida. Sinais registrados${cough > 0 ? ` (tosse ${cough}x)` : ''}${fatigue > 0 ? ` (cansaço ${fatigue}x)` : ''}${breathDiff ? ' + dificuldade respiratória' : ''}. Insuficiência cardíaca em pets é silenciosa até estágio avançado.`,
    suggestion: 'Avaliação cardiológica veterinária (auscultação, ecocardiograma). Tratamento precoce duplica expectativa de vida.',
    detectedAt: ctx.now,
    evidence: { cough, fatigue, breathDifficulty: breathDiff, signals },
  }];
}

// ─── 40. Emergência GI (combinação severa) ──────────────────────────

function detectGIEmergency(ctx: Ctx): HealthInsight[] {
  const cutoff48 = ctx.now - 2 * DAY_MS;
  const cutoffWater = ctx.now - 12 * HOUR_MS;

  const vomits = ctx.events.filter(
    (e) => e.type === 'vomito' && e.timestamp >= cutoff48,
  ).length;
  const diarrhea = ctx.events.filter(
    (e) => e.type === 'diarreia' && e.timestamp >= cutoff48,
  ).length;
  const waterRefused = ctx.logs.filter(
    (l) => l.key === 'agua' && l.timestamp >= cutoffWater,
  ).length === 0;

  // Critério: vômito + diarreia em 48h + sem água há 12h
  if (vomits < 1 || diarrhea < 1 || !waterRefused) return [];

  return [{
    id: `gi_emergency_${dayKey(ctx.now)}`,
    severity: 'alert',
    category: 'medical',
    title: 'Possível emergência gastrointestinal',
    message: `Vômito (${vomits}x) + diarreia (${diarrhea}x) nas últimas 48h, sem registro de água nas últimas 12h. Risco de desidratação severa.`,
    suggestion: 'Atendimento veterinário HOJE. Desidratação em pet pequeno ou filhote evolui rapidamente. Se sintomas piorarem (apatia extrema, gengiva pálida, vômito com sangue): emergência imediata.',
    detectedAt: ctx.now,
    evidence: { vomits, diarrhea, waterRefused },
  }];
}
