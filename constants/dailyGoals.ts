// ─── Metas diárias canônicas por tipo de pet ─────────────────
//
// Antes da Fase 9a, estava triplicado em DailyProgress, TodayPanel
// e useHistoryData (3 cópias idênticas). Centralizado aqui.
//
// Definição: o conjunto MÍNIMO de ações que precisam ser registradas
// num dia pra ele contar como "dia completo" — alimenta streak,
// WeekStrip, WeekGoalsCard, celebration onFirstComplete.
//
// • Cachorro: comida + água + passeio
// • Gato:     comida + água
// • Outro:    cai no fallback de cachorro (mesmas 3 metas)

import type { ActionKey, PetType } from '@/types/pet';

export const GOALS_CACHORRO: ActionKey[] = ['comida', 'agua', 'passeio'];
export const GOALS_GATO:     ActionKey[] = ['comida', 'agua'];

/**
 * Retorna o array de metas canônicas pro tipo de pet.
 *
 * Pet `undefined` cai no default cachorro — early-mount edge case
 * onde o store ainda não hidratou. Coerente com os 3 sites legacy
 * que tinham `petTipo === 'gato' ? GOALS_GATO : GOALS_CACHORRO`.
 */
export function dailyGoalsFor(petTipo: PetType | undefined): ActionKey[] {
  return petTipo === 'gato' ? GOALS_GATO : GOALS_CACHORRO;
}
