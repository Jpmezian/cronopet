// ═══════════════════════════════════════════════════════════════
// ═══ useHealthData — derivações pro Saúde Bold v3            ═══
// ═══════════════════════════════════════════════════════════════
//
// Centraliza cálculos do health screen (briefing 08):
//   • Peso atual + Δ vs anterior + série pro chart
//   • Vacinas com status derivado (data/proxima vs hoje)
//   • Próxima consulta (futura primeira da fila)
//   • Nutrição: target kcal + intake hoje (mesma fórmula do Home)
//
// Memo agressivo: re-roda só quando inputs mudam. Pet trocado força
// recálculo via deps explícitas (já filtrados upstream em medical.tsx).

import { useMemo } from 'react';
import type { ActionLog, Vaccine, Appointment, WeightEntry, PetProfile } from '@/types/pet';
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

export type VaccineStatus = 'applied' | 'due_soon' | 'overdue' | 'no_next';

export interface VaccineWithStatus extends Vaccine {
  status:        VaccineStatus;
  nextDueLabel?: string;
}

export interface HealthData {
  /** Peso mais recente (kg) — null se sem registros. */
  latestKg:        number | null;
  /** Δ vs medição anterior (kg, sinal). 0 se único registro / vazio. */
  weightDelta:     number;
  /** Última data registrada de peso. */
  latestWeightDate: string | null;
  /** Série pro chart (cronológica, máx 12). */
  weightSeries:    WeightEntry[];

  /** Calorias-alvo do dia (null = falta dados). */
  targetKcal:    number | null;
  /** Calorias ingeridas hoje (estimado por gramas × densidade). */
  intakeKcal:    number;
  /** Goal kcal / 0..1 progress. */
  intakeRatio:   number;

  /** Próxima consulta (data ≥ hoje). null se vazia. */
  nextAppointment: Appointment | null;
  /** Consultas futuras (cronológicas), exclui passadas. */
  upcomingAppointments: Appointment[];

  /** Vacinas com status, ordenadas: atrasadas → próximas → aplicadas. */
  vaccinesWithStatus: VaccineWithStatus[];
}

// ─── Helpers ─────────────────────────────────────────────────

function daysBetween(fromYMD: string, toYMD: string): number {
  const [fy, fm, fd] = fromYMD.split('-').map(Number);
  const [ty, tm, td] = toYMD.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd).getTime();
  const to   = new Date(ty, tm - 1, td).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function deriveVaccineStatus(v: Vaccine, today: string): VaccineWithStatus {
  if (!v.proxima) {
    return { ...v, status: 'no_next' };
  }
  const days = daysBetween(today, v.proxima);
  if (days < 0) {
    return { ...v, status: 'overdue', nextDueLabel: v.proxima };
  }
  if (days <= 30) {
    return { ...v, status: 'due_soon', nextDueLabel: v.proxima };
  }
  return { ...v, status: 'applied', nextDueLabel: v.proxima };
}

const STATUS_ORDER: Record<VaccineStatus, number> = {
  overdue:  0,
  due_soon: 1,
  applied:  2,
  no_next:  3,
};

function todayFoodGramsFromLogs(logs: ActionLog[], today: string): number {
  let g = 0;
  for (const log of logs) {
    if (log.key !== 'comida') continue;
    // R4-2: usa fuso local — toISOString() em UTC dava mismatch noturno.
    if (tsToLocalYMD(log.timestamp) !== today) continue;
    if (typeof log.quantity === 'number') g += log.quantity;
  }
  return g;
}

// ─── Hook ────────────────────────────────────────────────────

export function useHealthData(
  pet:           PetProfile,
  actionHistory: ActionLog[],
  vaccines:      Vaccine[],
  appointments:  Appointment[],
  weightHistory: WeightEntry[],
): HealthData {
  return useMemo(() => {
    const today = getLocalToday();

    // ── Peso ──────────────────────────────────────────────
    const sorted = [...weightHistory].sort((a, b) => a.data.localeCompare(b.data));
    const latest = sorted[sorted.length - 1] ?? null;
    const previous = sorted[sorted.length - 2] ?? null;
    const weightDelta = latest && previous
      ? +(latest.peso - previous.peso).toFixed(2)
      : 0;

    // Série pro chart: últimos 12 pontos (cronológicos)
    const weightSeries = sorted.slice(-12);

    // ── Nutrição ───────────────────────────────────────────
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

    const todayGrams = todayFoodGramsFromLogs(actionHistory, today);
    const intakeKcal = Math.round(todayGrams * DEFAULT_FOOD_KCAL_PER_GRAM);
    const intakeRatio = targetKcal && targetKcal > 0
      ? Math.min(1, intakeKcal / targetKcal)
      : 0;

    // ── Consultas ──────────────────────────────────────────
    const upcoming = appointments
      .filter((a) => a.data >= today)
      .sort((a, b) => {
        const ka = a.data + (a.hora ?? '00:00');
        const kb = b.data + (b.hora ?? '00:00');
        return ka.localeCompare(kb);
      });
    const nextAppointment = upcoming[0] ?? null;

    // ── Vacinas ────────────────────────────────────────────
    const vaccinesWithStatus = vaccines
      .map((v) => deriveVaccineStatus(v, today))
      .sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        return (a.proxima ?? a.data).localeCompare(b.proxima ?? b.data);
      });

    return {
      latestKg:         latest?.peso ?? null,
      weightDelta,
      latestWeightDate: latest?.data ?? null,
      weightSeries,
      targetKcal,
      intakeKcal,
      intakeRatio,
      nextAppointment,
      upcomingAppointments: upcoming,
      vaccinesWithStatus,
    };
  }, [pet, actionHistory, vaccines, appointments, weightHistory]);
}
