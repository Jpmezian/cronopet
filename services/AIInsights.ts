/**
 * services/AIInsights.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Análise opt-in via IA (Claude / OpenAI / Gemini — backend agnóstico).
 *
 * Funciona em camadas com HealthInsights.ts (heurístico):
 *   - HealthInsights = sempre roda, regras determinísticas, free-tier
 *   - AIInsights     = opt-in do usuário, roda 1x/dia, premium feature
 *
 * Quando habilitar:
 *   1. Cria conta no provider (Anthropic recomendado pra contexto longo)
 *   2. Cria Edge Function no Supabase que recebe payload anonimizado e
 *      chama o provider (NÃO bote a chave da API no app — vaza no bundle)
 *   3. Põe a URL da Edge Function em EXPO_PUBLIC_AI_ENDPOINT
 *   4. Substitui o stub abaixo por fetch da Edge Function
 *
 * PRIVACIDADE — REGRAS NÃO-NEGOCIÁVEIS:
 *   • NUNCA enviar: nome do pet, foto, email, user_id, geolocalização
 *   • SOMENTE enviar: tipo do animal, raça, idade, peso, sexo,
 *     histórico recente de ações em formato AGREGADO (médias, contagens)
 *   • Resposta da IA é cacheada localmente — não chamamos toda vez
 *   • Se Edge Function não estiver configurada, esta feature fica indisponível
 *     graciosamente (sem quebrar UI)
 *
 * O QUE A IA FAZ:
 *   Cruza o histórico do pet com padrões clínicos comuns e sugere se
 *   determinada combinação de sinais merece atenção. NUNCA diagnostica.
 *   Sempre fecha com "consulte o veterinário".
 */

import * as Sentry from '@sentry/react-native';
import type {
  ActionLog, WeightEntry, MedicalEvent, PetProfile,
} from '@/types/pet';

// ─── Tipos públicos ────────────────────────────────────────────────────

export interface AIHealthAnalysis {
  /** Resumo curto (2-3 frases) — o que a IA notou */
  summary: string;
  /** Pontos específicos — bullets curtos */
  observations: string[];
  /** Sugestões de coisas pra observar / perguntar ao veterinário */
  suggestions: string[];
  /** Severidade geral percebida pela IA */
  overallSeverity: 'low' | 'medium' | 'high';
  /** Modelo usado (pra debug e auditoria) */
  model: string;
  /** Quando a análise foi gerada */
  generatedAt: number;
}

export interface AnalyzeRequest {
  pet: Pick<PetProfile, 'tipo' | 'raca' | 'nascimento' | 'idealWeightKg' | 'neutered' | 'petSize'>;
  actionHistory: ActionLog[];
  weightHistory: WeightEntry[];
  medicalEvents: MedicalEvent[];
}

export type AIAnalyzeResult =
  | { ok: true; analysis: AIHealthAnalysis }
  | { ok: false; reason: 'not_configured' | 'rate_limited' | 'network' | 'invalid_response' | 'unknown' };

// ─── Estado interno ────────────────────────────────────────────────────

const ENDPOINT = process.env.EXPO_PUBLIC_AI_ENDPOINT ?? '';
/** Cache de 24h pra evitar chamadas repetidas */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cache: { result: AIHealthAnalysis; signature: string; cachedAt: number } | null = null;

// ─── API pública ───────────────────────────────────────────────────────

/**
 * Verifica se a feature está disponível (configurada).
 * Use no UI pra mostrar/esconder o botão "Analisar com IA".
 */
export function isAIAvailable(): boolean {
  return ENDPOINT.length > 0;
}

/**
 * Roda a análise. Anonimiza tudo antes de enviar. Cacheia 24h.
 */
export async function analyzeWithAI(req: AnalyzeRequest): Promise<AIAnalyzeResult> {
  if (!ENDPOINT) {
    if (__DEV__) {
      // Em DEV retornamos um stub útil pra ver UI funcionando
      return { ok: true, analysis: stubAnalysis(req) };
    }
    return { ok: false, reason: 'not_configured' };
  }

  const payload = anonymizePayload(req);
  const signature = JSON.stringify(payload);

  // Cache: mesmo input + < 24h = retorna cache
  if (cache && cache.signature === signature && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return { ok: true, analysis: cache.result };
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    if (res.status === 429) return { ok: false, reason: 'rate_limited' };
    if (!res.ok) return { ok: false, reason: 'network' };

    const data = await res.json();
    if (!isValidAnalysis(data)) {
      return { ok: false, reason: 'invalid_response' };
    }
    const analysis: AIHealthAnalysis = {
      ...data,
      generatedAt: Date.now(),
    };
    cache = { result: analysis, signature, cachedAt: Date.now() };
    return { ok: true, analysis };
  } catch (err) {
    Sentry.captureException(err, { tags: { source: 'ai_insights' } });
    return { ok: false, reason: 'unknown' };
  }
}

/** Limpa cache (chamar no logout / account deletion) */
export function clearAICache() { cache = null; }

// ─── Internals ─────────────────────────────────────────────────────────

/**
 * Reduz o payload a metadados ANÔNIMOS antes de mandar pro provider.
 * Sem nome, foto, email, ID, localização. Só agregados clínicos.
 */
function anonymizePayload(req: AnalyzeRequest) {
  const ageMonths = req.pet.nascimento
    ? Math.floor((Date.now() - new Date(req.pet.nascimento).getTime()) / (30 * 86_400_000))
    : null;

  // Agrega ações dos últimos 30d em contagens, não em logs individuais
  const cutoff = Date.now() - 30 * 86_400_000;
  const recentLogs = req.actionHistory.filter((l) => l.timestamp >= cutoff);

  const counts = {
    comida: recentLogs.filter((l) => l.key === 'comida').length,
    agua: recentLogs.filter((l) => l.key === 'agua').length,
    passeio: recentLogs.filter((l) => l.key === 'passeio').length,
    xixi: recentLogs.filter((l) => l.key === 'xixi').length,
    coco: recentLogs.filter((l) => l.key === 'coco').length,
    banho: recentLogs.filter((l) => l.key === 'banho').length,
  };

  const stoolBreakdown = {
    normal:  recentLogs.filter((l) => l.key === 'coco' && l.consistency === 'normal').length,
    soft:    recentLogs.filter((l) => l.key === 'coco' && l.consistency === 'soft').length,
    liquid:  recentLogs.filter((l) => l.key === 'coco' && l.consistency === 'liquid').length,
    hard:    recentLogs.filter((l) => l.key === 'coco' && l.consistency === 'hard').length,
    abnormalAppearance: recentLogs.filter(
      (l) => (l.key === 'coco' || l.key === 'xixi') && l.appearance === 'abnormal',
    ).length,
  };

  const foodAcceptance = {
    full:     recentLogs.filter((l) => l.key === 'comida' && l.acceptance === 'full').length,
    partial:  recentLogs.filter((l) => l.key === 'comida' && l.acceptance === 'partial').length,
    refused:  recentLogs.filter((l) => l.key === 'comida' && l.acceptance === 'refused').length,
  };

  // Pesagens — só os números, não datas exatas, ordenados por idade
  const weights = [...req.weightHistory]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-10) // últimas 10
    .map((w, i, arr) => ({
      kg: w.peso,
      daysAgo: i === arr.length - 1 ? 0 : Math.round(
        (new Date(arr[arr.length - 1].data).getTime() - new Date(w.data).getTime()) / 86_400_000,
      ),
    }));

  // Eventos médicos só por tipo + contagem, sem notas (notas podem ter PII)
  const medicalEventsByType: Record<string, number> = {};
  for (const e of req.medicalEvents.filter((e) => e.timestamp >= cutoff)) {
    medicalEventsByType[e.type] = (medicalEventsByType[e.type] ?? 0) + 1;
  }

  return {
    pet: {
      tipo: req.pet.tipo,
      raca: req.pet.raca || null, // raça pode ser empty string
      ageMonths,
      idealWeightKg: req.pet.idealWeightKg ?? null,
      neutered: req.pet.neutered ?? null,
      size: req.pet.petSize ?? null,
    },
    last30Days: {
      counts,
      stoolBreakdown,
      foodAcceptance,
      medicalEventsByType,
    },
    weights,
  };
}

function isValidAnalysis(x: any): x is Omit<AIHealthAnalysis, 'generatedAt'> {
  return x
    && typeof x.summary === 'string'
    && Array.isArray(x.observations)
    && Array.isArray(x.suggestions)
    && ['low', 'medium', 'high'].includes(x.overallSeverity)
    && typeof x.model === 'string';
}

/** Stub usado em DEV pra desenvolver UI sem ter Edge Function rodando */
function stubAnalysis(req: AnalyzeRequest): AIHealthAnalysis {
  return {
    summary: 'Análise simulada (modo DEV) — dados gerais parecem dentro da normalidade. Esta análise não substitui avaliação veterinária.',
    observations: [
      `Pet ${req.pet.tipo} com ${req.actionHistory.length} registros nos últimos meses`,
      req.weightHistory.length > 0
        ? `${req.weightHistory.length} pesagem(ns) registrada(s)`
        : 'Sem pesagens registradas — recomendado pesar mensalmente',
    ],
    suggestions: [
      'Continue acompanhando peso e apetite',
      'Mantenha vacinas em dia',
      'Procure o veterinário para avaliações periódicas',
    ],
    overallSeverity: 'low',
    model: 'stub-dev',
    generatedAt: Date.now(),
  };
}
