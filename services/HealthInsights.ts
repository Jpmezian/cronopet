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

// ─── Tipos públicos ────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'alert';

export type InsightCategory =
  | 'weight'
  | 'appetite'
  | 'hydration'
  | 'stool'
  | 'urine'
  | 'medical';

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
  pet: Pick<PetProfile, 'tipo' | 'idealWeightKg'>;
  actionHistory: ActionLog[];
  weightHistory: WeightEntry[];
  medicalEvents: MedicalEvent[];
  /** Timestamp "agora" — injetável pra teste */
  now?: number;
  /** IDs já dismissados — não retorna eles */
  dismissedIds?: string[];
}

// ─── API pública ───────────────────────────────────────────────────────

/**
 * Analisa o estado e retorna insights priorizados.
 * Limite implícito de N insights — o caller decide quantos mostrar.
 */
export function analyzeHealth(input: AnalyzeInput): HealthInsight[] {
  const now = input.now ?? Date.now();
  const ctx: Ctx = {
    now,
    pet: input.pet,
    logs: input.actionHistory,
    weights: input.weightHistory,
    events: input.medicalEvents,
  };

  const all: HealthInsight[] = [
    ...detectWeightVariation(ctx),
    ...detectWeightTrend(ctx),
    ...detectAppetiteDrop(ctx),
    ...detectFoodRefusals(ctx),
    ...detectHydrationGap(ctx),
    ...detectDiarrhea(ctx),
    ...detectConstipation(ctx),
    ...detectAbnormalAppearance(ctx),
    ...detectRecurrentMedicalEvents(ctx),
  ];

  const dismissed = new Set(input.dismissedIds ?? []);

  return all
    .filter((i) => !dismissed.has(i.id))
    .sort(bySeverityDesc);
}

// ═══════════════════════════════════════════════════════════════════════
// Internals
// ═══════════════════════════════════════════════════════════════════════

interface Ctx {
  now: number;
  pet: Pick<PetProfile, 'tipo' | 'idealWeightKg'>;
  logs: ActionLog[];
  weights: WeightEntry[];
  events: MedicalEvent[];
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
