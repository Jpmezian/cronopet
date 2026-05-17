/**
 * services/pdfReportHelpers.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Helpers puros do PdfReportService extraídos pra ficarem testáveis sem
 * mock de `expo-print`/`expo-file-system`. A geração de PDF em si
 * continua no PdfReportService.ts — aqui só fica a aritmética/format.
 */

import type { ActionLog, Appointment, WeightEntry } from '@/types/pet';

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Formatters de data ───────────────────────────────────────────────

/** Formata timestamp em data/hora pt-BR (DD/MM/YYYY HH:MM). */
export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Formata YYYY-MM-DD → DD/MM/YYYY sem bug de timezone. */
export function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Calcula idade legível a partir de ISO YYYY-MM-DD.
 * `now` injetável pra testes determinísticos (default Date.now()).
 *
 *   < 1 mês  → "Recém-nascido"
 *   < 1 ano  → "N meses" (ou "1 mês")
 *   >= 1 ano → "N anos" (ou "1 ano")
 */
export function calcAge(iso: string, now: number = Date.now()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const nowDate = new Date(now);
  const months =
    (nowDate.getFullYear() - birth.getFullYear()) * 12 +
    (nowDate.getMonth() - birth.getMonth());
  if (months < 1)  return 'Recém-nascido';
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

// ─── Conversores de enums em palavras (para PDF) ──────────────────────

export function tolWord(t: 'low' | 'medium' | 'high'): string {
  return t === 'low' ? 'baixa' : t === 'medium' ? 'média' : 'alta';
}

export function riskWord(r: 'low' | 'medium' | 'high'): string {
  return r === 'low' ? 'baixo' : r === 'medium' ? 'médio' : 'alto';
}

// ─── Agregações sobre o histórico ─────────────────────────────────────

export interface ReportStats {
  /** Logs dentro da janela (default 30d). */
  recentLogs: ActionLog[];
  /** Contagem por ActionKey nos recentLogs. */
  counts: Record<string, number>;
  /** Soma de `quantity` dos logs de comida em gramas. */
  totalFoodGrams: number;
  /** Soma de `duration` dos logs de passeio em minutos. */
  totalWalkMinutes: number;
  /** Quantos logs têm `appearance: 'abnormal'`. */
  abnormalCount: number;
  /** Logs agrupados por dia (key = DD/MM/YYYY pt-BR). */
  byDay: Record<string, ActionLog[]>;
  /** Pesos ordenados crescente por data ISO (mais antigo primeiro). */
  weightSorted: WeightEntry[];
  /** Consultas ordenadas DESC por data (mais recente primeiro). */
  apptSorted: Appointment[];
}

/**
 * Computa todas as estatísticas que vão pro PDF a partir do histórico
 * cru. Função pura — recebe `now` injetável pra reprodutibilidade.
 *
 * Janela padrão: últimos 30 dias.
 */
export function computeReportStats(input: {
  actionHistory: ActionLog[];
  weightHistory?: WeightEntry[];
  appointments?: Appointment[];
  now?: number;
  /** Janela em dias (default 30). */
  windowDays?: number;
}): ReportStats {
  const now = input.now ?? Date.now();
  const windowDays = input.windowDays ?? 30;
  const cutoff = now - windowDays * DAY_MS;

  const recentLogs = input.actionHistory.filter((l) => l.timestamp >= cutoff);

  const counts: Record<string, number> = {};
  let totalFoodGrams = 0;
  let totalWalkMinutes = 0;
  for (const l of recentLogs) {
    counts[l.key] = (counts[l.key] ?? 0) + 1;
    if (l.key === 'comida' && l.quantity) totalFoodGrams += l.quantity;
    if (l.key === 'passeio' && l.duration) totalWalkMinutes += l.duration;
  }

  const abnormalCount = recentLogs.filter((l) => l.appearance === 'abnormal').length;

  const byDay: Record<string, ActionLog[]> = {};
  for (const l of recentLogs) {
    const d = new Date(l.timestamp).toLocaleDateString('pt-BR');
    (byDay[d] ??= []).push(l);
  }

  const weightSorted = [...(input.weightHistory ?? [])].sort(
    (a, b) => a.data.localeCompare(b.data),
  );
  const apptSorted = [...(input.appointments ?? [])].sort(
    (a, b) => b.data.localeCompare(a.data),
  );

  return {
    recentLogs, counts, totalFoodGrams, totalWalkMinutes,
    abnormalCount, byDay, weightSorted, apptSorted,
  };
}
