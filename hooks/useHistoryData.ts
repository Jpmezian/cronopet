// ═══════════════════════════════════════════════════════════════
// ═══ useHistoryData — derivações de stats pro Histórico Bold v3 ═
// ═══════════════════════════════════════════════════════════════
//
// Centraliza todos os cálculos da tela de Histórico (briefing 07):
//   • Semana corrente (Dom→Sáb): done/total/isFuture por dia
//   • Streak record (maior streak histórico no actionHistory)
//   • Trends por ação tracked: count semana, média diária, miniBars[7],
//     delta vs semana anterior
//
// Cálculo puro derivado de `actionHistory` — não persiste nada. Memo
// agressivo: re-roda só quando `actionHistory.length` ou `petTipo` mudam
// (slot `[len, type]` na dep array — comparação shallow do array
// completo seria O(N) a cada render).
//
// Goals canônicos vêm de constants/dailyGoals.ts (centralizado na
// Fase 9a — antes triplicado em DailyProgress/TodayPanel/aqui).

import { useMemo } from 'react';
import type { ActionKey, ActionLog, PetType } from '@/types/pet';
import { tsToLocalYMD, getLocalToday } from '@/lib/dateLocal';

import { dailyGoalsFor } from '@/constants/dailyGoals';

const TRACKED_ACTIONS: ActionKey[] = ['comida', 'agua', 'passeio'];

const UNIT_LABELS: Record<ActionKey, { singular: string; plural: string }> = {
  comida:  { singular: 'refeição',   plural: 'refeições' },
  agua:    { singular: 'hidratação', plural: 'hidratações' },
  passeio: { singular: 'passeio',    plural: 'passeios' },
  xixi:    { singular: 'xixi',       plural: 'xixis' },
  coco:    { singular: 'cocô',       plural: 'cocôs' },
  banho:   { singular: 'banho',      plural: 'banhos' },
  tosa:    { singular: 'tosa',       plural: 'tosas' },
};

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export interface WeekDay {
  /** Label curto (D|S|T|Q|Q|S|S). */
  dia: string;
  /** Date YYYY-MM-DD desse dia (Dom da semana atual = índice 0). */
  date: string;
  /** Metas batidas nesse dia. */
  done: number;
  /** Total de metas (3 cachorro / 2 gato). */
  total: number;
  /** Dia ainda não chegou (índice > weekday hoje). Render vazio. */
  isFuture: boolean;
  /** É o dia de hoje. Highlight no label. */
  isToday: boolean;
}

export interface Trend {
  key:      ActionKey;
  /** "Refeições por dia" — copy para o label superior. */
  title:    string;
  /** Média diária formatada ("3" inteiro ou "2,7" decimal). */
  avg:      string;
  /** Unidade ("refeições", "hidratações", "passeios"). */
  unit:     string;
  /** Counts dia-a-dia Dom→Sáb (7 elementos). Alimenta MiniBars. */
  miniBars: number[];
  /** Delta vs semana anterior (count corrente - count anterior). */
  delta:    number;
}

export interface HistoryData {
  /** 7 dias Dom→Sáb da semana atual. */
  week:         WeekDay[];
  /** Maior streak histórico já alcançado (>= streak atual). */
  streakRecord: number;
  /** Stats agregados da semana corrente (numerador/denominador de Pill). */
  weekGoalsDone:  number;
  weekGoalsTotal: number;
  /** Trends das 3 ações tracked (comida, agua, passeio). */
  trends: Trend[];
}

// ─── Helpers de data ─────────────────────────────────────────

/**
 * Domingo da semana corrente em YYYY-MM-DD (fuso local).
 * Semana brasileira começa domingo (`getDay()===0`).
 */
function getSundayOfThisWeek(): Date {
  const now = new Date();
  const dow = now.getDay(); // 0=Dom
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(now.getDate() - dow);
  return sunday;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
}

// ─── Cálculo de streak record ────────────────────────────────

function computeStreakRecord(
  actionHistory: ActionLog[],
  goals:         ActionKey[],
  todayYMD:      string,
): number {
  if (actionHistory.length === 0) return 0;

  // Agrupa por dia
  const byDay = new Map<string, Set<ActionKey>>();
  for (const log of actionHistory) {
    const ymd = tsToLocalYMD(log.timestamp);
    let s = byDay.get(ymd);
    if (!s) { s = new Set(); byDay.set(ymd, s); }
    s.add(log.key);
  }

  // Sorted ascending dates
  const dates = [...byDay.keys()].sort();

  let max = 0;
  let curr = 0;
  let prevDate: string | null = null;

  for (const ymd of dates) {
    if (ymd > todayYMD) break; // ignora datas futuras (clock skew defensive)
    const dayGoals = byDay.get(ymd);
    const complete = dayGoals && goals.every((g) => dayGoals.has(g));

    if (complete) {
      if (prevDate && isConsecutive(prevDate, ymd)) {
        curr += 1;
      } else {
        curr = 1;
      }
      if (curr > max) max = curr;
      prevDate = ymd;
    } else {
      curr = 0;
      prevDate = null;
    }
  }
  return max;
}

function isConsecutive(prev: string, curr: string): boolean {
  const [py, pm, pd] = prev.split('-').map(Number);
  const prevD = new Date(py, pm - 1, pd);
  const nextExpected = addDays(prevD, 1);
  return tsToLocalYMD(nextExpected.getTime()) === curr;
}

// ─── Hook ────────────────────────────────────────────────────

export function useHistoryData(
  actionHistory: ActionLog[],
  petTipo:       PetType | undefined,
  currentStreak: number,
): HistoryData {
  const memoKey = `${actionHistory.length}-${petTipo}-${currentStreak}`;

  return useMemo(() => {
    const goals = dailyGoalsFor(petTipo);
    const goalsTotalPerDay = goals.length;
    const todayYMD = getLocalToday();
    const sunday   = getSundayOfThisWeek();

    // ── Counts por dia × ação (semana corrente) ─────────────
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(tsToLocalYMD(addDays(sunday, i).getTime()));
    }

    const dayActions: Record<string, Record<ActionKey, number>> = {};
    for (const ymd of weekDates) {
      dayActions[ymd] = { comida: 0, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0, tosa: 0 };
    }

    // Previous week (pro delta)
    const prevSunday = addDays(sunday, -7);
    const prevWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      prevWeekDates.push(tsToLocalYMD(addDays(prevSunday, i).getTime()));
    }
    const prevWeekCounts: Record<ActionKey, number> = {
      comida: 0, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0, tosa: 0,
    };
    const prevWeekSet = new Set(prevWeekDates);

    for (const log of actionHistory) {
      const ymd = tsToLocalYMD(log.timestamp);
      if (dayActions[ymd]) dayActions[ymd][log.key] += 1;
      else if (prevWeekSet.has(ymd)) prevWeekCounts[log.key] += 1;
    }

    // ── WeekDay[] ─────────────────────────────────────────────
    const todayDow = new Date().getDay();
    const week: WeekDay[] = weekDates.map((date, i) => {
      const counts = dayActions[date];
      const done   = goals.filter((g) => counts[g] > 0).length;
      const isFuture = i > todayDow;
      return {
        dia:      DAY_LABELS[i],
        date,
        done,
        total:    goalsTotalPerDay,
        isFuture,
        isToday:  i === todayDow,
      };
    });

    // ── Goals agregados (pill "X de Y") ──────────────────────
    // Total = só dias passados + hoje, pra não inflar com futuro.
    let weekGoalsDone = 0;
    let weekGoalsTotal = 0;
    for (const d of week) {
      if (d.isFuture) continue;
      weekGoalsDone  += d.done;
      weekGoalsTotal += d.total;
    }

    // ── Trends (3 ações tracked) ──────────────────────────────
    // Para média/delta, divide por dias decorridos da semana (todayDow+1).
    const daysElapsed = todayDow + 1;

    const trends: Trend[] = TRACKED_ACTIONS.map((key): Trend => {
      const miniBars = week.map((d) => dayActions[d.date][key]);
      const weekCount = miniBars.reduce((s, n) => s + n, 0);
      const prevCount = prevWeekCounts[key];
      const avgNum    = weekCount / daysElapsed;
      const avg = avgNum >= 10 || Number.isInteger(avgNum)
        ? String(Math.round(avgNum))
        : avgNum.toFixed(1).replace('.', ',');
      const unit = weekCount === 1
        ? UNIT_LABELS[key].singular
        : UNIT_LABELS[key].plural;
      return {
        key,
        title:    titleForAction(key),
        avg,
        unit,
        miniBars,
        delta:    weekCount - prevCount,
      };
    });

    // ── Streak record ─────────────────────────────────────────
    const computedRecord = computeStreakRecord(actionHistory, goals, todayYMD);
    // Record nunca menor que streak corrente (defensive caso o store
    // tenha streak migrado e history limpo).
    const streakRecord = Math.max(computedRecord, currentStreak);

    return { week, streakRecord, weekGoalsDone, weekGoalsTotal, trends };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoKey]);
}

function titleForAction(k: ActionKey): string {
  switch (k) {
    case 'comida':  return 'Refeições por dia';
    case 'agua':    return 'Hidratação por dia';
    case 'passeio': return 'Passeios por dia';
    default:        return UNIT_LABELS[k].plural;
  }
}
