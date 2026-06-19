// ═══════════════════════════════════════════════════════════════
// ═══ useNutritionData — derivações pro Nutrição Bold v3      ═══
// ═══════════════════════════════════════════════════════════════
//
// Centraliza cálculos da tela analítica /nutrition (briefing 09):
//   • Target kcal do dia + intake estimado
//   • Lista de refeições de hoje (ActionLog comida) com slot derivado
//   • Distribuição por slot do dia (manhã/almoço/lanche/jantar)
//
// Slot derivado do horário (4-11h = manhã, 11-15h = almoço, etc.).
// Sem `mealType` salvo no log — verdade-do-código: app só registra
// `quantity` e `timestamp`. Briefing 09 pede macros, mas app não tem
// dados pra populá-los (R-fase-5-2 da investigação).

import { useMemo } from 'react';
import type { ActionLog, PetProfile, WeightEntry } from '@/types/pet';
import {
  calculateGoalCalories,
  kcalForGoal,
  estimateLifeStage,
  ageFromBirth,
  petTypeToSpecies,
  DEFAULT_FOOD_KCAL_PER_GRAM,
} from '@/data/calories';
import { getBreedSize } from '@/data/breed-meta';
import { getLocalToday, tsToLocalYMD } from '@/lib/dateLocal';

export type MealSlot = 'manha' | 'almoco' | 'lanche' | 'jantar';

export const SLOT_LABEL: Record<MealSlot, string> = {
  manha:  'Manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
};

const SLOT_RANGES: { slot: MealSlot; from: number; to: number }[] = [
  { slot: 'manha',  from: 4,  to: 11 },
  { slot: 'almoco', from: 11, to: 15 },
  { slot: 'lanche', from: 15, to: 19 },
  { slot: 'jantar', from: 19, to: 28 }, // 19h–4h dia seguinte (wrap)
];

export interface Meal {
  id:        string;
  timestamp: number;
  hora:      string; // "HH:MM"
  slot:      MealSlot;
  slotLabel: string;
  grams:     number;
  kcal:      number;
  note?:     string;
}

export interface SlotShare {
  slot:      MealSlot;
  label:     string;
  kcal:      number;
  ratio:     number; // 0..1 — share do total do dia
  count:     number;
}

export interface NutritionData {
  /** Calorias-alvo do dia (null = falta peso/idade pra calcular). */
  targetKcal:   number | null;
  /** Calorias estimadas ingeridas (gramas × densidade). */
  intakeKcal:   number;
  /** Razão intake/target em [0..1.5] (clampado pro ring visual). */
  ratio:        number;
  /** kcal restantes (positivo) ou excedidos (negativo). */
  remainingKcal:number;
  /** Refeições do dia, ordenadas por horário crescente. */
  meals:        Meal[];
  /** Distribuição agregada por slot (sempre 4 entries). */
  distribution: SlotShare[];
  /** Tem peso pra fazer estimativa de target? */
  hasWeight:    boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function slotFor(hour: number): MealSlot {
  // Jantar wraps 19h–4h
  if (hour >= 19 || hour < 4) return 'jantar';
  for (const r of SLOT_RANGES) {
    if (r.slot === 'jantar') continue;
    if (hour >= r.from && hour < r.to) return r.slot;
  }
  return 'lanche';
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtHora(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ─── Hook ────────────────────────────────────────────────────

export function useNutritionData(
  pet:           PetProfile,
  actionHistory: ActionLog[],
  weightHistory: WeightEntry[],
): NutritionData {
  return useMemo(() => {
    const today = getLocalToday();

    // ── Peso mais recente ──────────────────────────────────
    const sortedWeights = [...weightHistory].sort((a, b) =>
      a.data.localeCompare(b.data),
    );
    const latest = sortedWeights[sortedWeights.length - 1] ?? null;
    const hasWeight = latest !== null;

    // ── Target ─────────────────────────────────────────────
    let targetKcal: number | null = null;
    if (latest?.peso) {
      const species   = petTypeToSpecies(pet.tipo);
      const size      = pet.petSize ?? getBreedSize(pet.raca, pet.tipo);
      const ageYears  = ageFromBirth(pet.nascimento);
      const lifeStage = estimateLifeStage(ageYears, species, size);
      const goals = calculateGoalCalories({
        currentKg: latest.peso,
        idealKg:   pet.idealWeightKg,
        species,
        lifeStage,
        neutered:  pet.neutered ?? false,
        activity:  pet.baselineActivity ?? 'moderate',
      });
      targetKcal = kcalForGoal(goals, pet.nutritionGoal ?? 'maintain');
    }

    // ── Refeições do dia ───────────────────────────────────
    const todayMeals = actionHistory
      .filter((l) => l.key === 'comida' && tsToLocalYMD(l.timestamp) === today)
      .sort((a, b) => a.timestamp - b.timestamp);

    const meals: Meal[] = todayMeals.map((l): Meal => {
      const grams = l.quantity ?? 0;
      const kcal  = Math.round(grams * DEFAULT_FOOD_KCAL_PER_GRAM);
      const slot  = slotFor(new Date(l.timestamp).getHours());
      return {
        id:        l.id,
        timestamp: l.timestamp,
        hora:      fmtHora(l.timestamp),
        slot,
        slotLabel: SLOT_LABEL[slot],
        grams,
        kcal,
        note:      l.note,
      };
    });

    const intakeKcal = meals.reduce((sum, m) => sum + m.kcal, 0);

    // ── Distribuição por slot ──────────────────────────────
    const totals: Record<MealSlot, { kcal: number; count: number }> = {
      manha:  { kcal: 0, count: 0 },
      almoco: { kcal: 0, count: 0 },
      lanche: { kcal: 0, count: 0 },
      jantar: { kcal: 0, count: 0 },
    };
    for (const m of meals) {
      totals[m.slot].kcal  += m.kcal;
      totals[m.slot].count += 1;
    }
    const totalKcal = Math.max(intakeKcal, 1);
    const distribution: SlotShare[] = (['manha', 'almoco', 'lanche', 'jantar'] as MealSlot[]).map((slot) => ({
      slot,
      label: SLOT_LABEL[slot],
      kcal:  totals[slot].kcal,
      ratio: totals[slot].kcal / totalKcal,
      count: totals[slot].count,
    }));

    // ── Ratio + remaining ──────────────────────────────────
    const ratio = targetKcal && targetKcal > 0
      ? Math.min(1.5, intakeKcal / targetKcal)
      : 0;
    const remainingKcal = targetKcal !== null
      ? targetKcal - intakeKcal
      : 0;

    return {
      targetKcal,
      intakeKcal,
      ratio,
      remainingKcal,
      meals,
      distribution,
      hasWeight,
    };
  }, [pet, actionHistory, weightHistory]);
}
