// ─── Estimativas calóricas para pets ──────────────────────────
// Baseado nas diretrizes NRC (National Research Council) e
// WSAVA (World Small Animal Veterinary Association).
// Valores são estimativas — disclaimer obrigatório na UI.

import type {
  PetType, LifeStage, NutritionGoal, BodyCondition,
  BaselineActivity, PetSize,
} from '@/types/pet';

// Mapeia PetType ('cachorro'|'gato'|'outro') → espécie canônica
// ('dog'|'cat') usada pelas fórmulas. 'outro' cai em dog por padrão.
export type Species = 'dog' | 'cat';
export function petTypeToSpecies(tipo: PetType): Species {
  return tipo === 'gato' ? 'cat' : 'dog';
}

/**
 * Resting Energy Requirement (RER) — kcal/dia
 * Fórmula NRC: 70 × (peso em kg) ^ 0.75
 */
export function calculateRER(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return 70 * Math.pow(weightKg, 0.75);
}

/**
 * Fator de atividade baseado em minutos de passeio no dia.
 * Sedentário (1.2) → Muito ativo (1.8)
 */
export function getActivityFactor(totalWalkMinutes: number): number {
  if (totalWalkMinutes <= 0) return 1.2;
  if (totalWalkMinutes <= 30) return 1.4;
  if (totalWalkMinutes <= 60) return 1.6;
  return 1.8;
}

/**
 * Daily Energy Requirement (DER) — kcal/dia
 * RER × fator de atividade
 */
export function calculateDER(weightKg: number, totalWalkMinutes: number): number {
  return calculateRER(weightKg) * getActivityFactor(totalWalkMinutes);
}

/**
 * Densidade calórica padrão de ração seca (kcal/g).
 * Varia por marca (2.5–4.5), mas 3.5 é uma média segura.
 */
export const DEFAULT_FOOD_KCAL_PER_GRAM = 3.5;

/**
 * Calorias ingeridas com base na quantidade de comida em gramas.
 */
export function foodCalories(
  totalGrams: number,
  kcalPerGram: number = DEFAULT_FOOD_KCAL_PER_GRAM,
): number {
  return totalGrams * kcalPerGram;
}

/**
 * Calorias estimadas queimadas durante passeios.
 * ~0.067 kcal/min/kg é uma aproximação para caminhada canina.
 */
export function walkCaloriesBurned(durationMinutes: number, weightKg: number): number {
  return durationMinutes * 0.067 * weightKg;
}

// ─── Resultado consolidado ────────────────────────────────────

export interface WellnessEstimate {
  intake: number;       // kcal consumidas
  recommended: number;  // DER kcal/dia
  burned: number;       // kcal queimadas em passeio
  balance: number;      // intake - recommended (positivo = excesso)
}

export function calculateWellnessEstimate(
  foodGrams: number,
  walkMinutes: number,
  weightKg: number,
  kcalPerGram: number = DEFAULT_FOOD_KCAL_PER_GRAM,
): WellnessEstimate {
  const intake      = foodCalories(foodGrams, kcalPerGram);
  const recommended = calculateDER(weightKg, walkMinutes);
  const burned      = walkCaloriesBurned(walkMinutes, weightKg);
  return {
    intake:      Math.round(intake),
    recommended: Math.round(recommended),
    burned:      Math.round(burned),
    balance:     Math.round(intake - recommended),
  };
}

// ═══════════════════════════════════════════════════════════════
// ═══ PLANO NUTRICIONAL COMPLETO (Fase 11)                    ═══
// ═══════════════════════════════════════════════════════════════
//
// As funções abaixo implementam o cálculo nutricional "sério"
// usado na tela `app/nutrition.tsx`. NÃO substituem o módulo
// simples acima (WellnessCard) que usa atividade comportamental
// baseada em minutos de passeio do dia.
// Aqui trabalhamos com atividade BASELINE declarada pelo usuário.
//
// Referências:
// - NRC 2006 (National Research Council)
// - WSAVA Nutrition Toolkit
// - https://wsava.org/global-guidelines/global-nutrition-guidelines

// ─── Helpers de idade ─────────────────────────────────────────

/**
 * Calcula idade em anos a partir da data de nascimento ISO (YYYY-MM-DD).
 * Retorna null se não houver nascimento registrado ou formato inválido.
 */
export function ageFromBirth(nascimento?: string): number | null {
  if (!nascimento) return null;
  const [y, m, d] = nascimento.split('-').map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d).getTime();
  if (isNaN(birth)) return null;
  const diff = Date.now() - birth;
  const years = diff / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, years);
}

/**
 * Estima life stage a partir da idade, espécie e porte.
 * - Puppy: < 1 ano
 * - Senior (cão): varia por porte (small 10y / medium 8y / large 7y / giant 6y)
 * - Senior (gato): ≥ 10 anos
 * - Adult: caso contrário
 * - Fallback: adult quando idade é null
 */
export function estimateLifeStage(
  ageYears: number | null,
  species: Species,
  size?: PetSize,
): LifeStage {
  if (ageYears === null) return 'adult';
  if (ageYears < 1) return 'puppy';

  if (species === 'cat') {
    return ageYears >= 10 ? 'senior' : 'adult';
  }

  // dog — senior threshold varia por porte
  const seniorThreshold: Record<PetSize, number> = {
    small:  10,
    medium:  8,
    large:   7,
    giant:   6,
  };
  const threshold = size ? seniorThreshold[size] : 8;
  return ageYears >= threshold ? 'senior' : 'adult';
}

// ─── Fator de atividade baseline (MER) ────────────────────────

interface MealFactorParams {
  species:   Species;
  lifeStage: LifeStage;
  neutered:  boolean;
  activity:  BaselineActivity;
}

/**
 * Fator "k" para MER = RER × k.
 * Diretrizes WSAVA/NRC. Adult/senior ajustam por castração e atividade.
 * Puppy é fixo (crescimento domina).
 */
export function mealFactor(params: MealFactorParams): number {
  const { species, lifeStage, neutered, activity } = params;

  if (species === 'dog') {
    if (lifeStage === 'puppy') return 3.0;

    // adult/senior dog
    let k = neutered ? 1.6 : 1.8;
    if (activity === 'low')  k -= 0.2;
    if (activity === 'high') k += 0.2;
    if (lifeStage === 'senior') k -= 0.4;
    return Math.max(1.0, k);
  }

  // cat
  if (lifeStage === 'puppy') return 2.5;

  // adult/senior cat
  let k = neutered ? 1.2 : 1.4;
  if (activity === 'low')  k -= 0.1;
  if (activity === 'high') k += 0.1;
  if (lifeStage === 'senior') k -= 0.2;
  return Math.max(1.0, k);
}

/**
 * Maintenance Energy Requirement — kcal/dia para MANTER o peso.
 * MER = RER(peso) × meal factor.
 */
export function calculateMER(params: {
  weightKg:  number;
  species:   Species;
  lifeStage: LifeStage;
  neutered:  boolean;
  activity:  BaselineActivity;
}): number {
  const rer = calculateRER(params.weightKg);
  const k = mealFactor({
    species:   params.species,
    lifeStage: params.lifeStage,
    neutered:  params.neutered,
    activity:  params.activity,
  });
  return rer * k;
}

// ─── Peso ideal a partir da condição corporal ────────────────

/**
 * Estima peso ideal quando usuário não sabe.
 * Baseado em Body Condition Score (WSAVA 1-9):
 * - Magro (BCS 1-3):    +10% (precisa ganhar)
 * - Ideal (BCS 4-5):    peso atual
 * - Sobrepeso (BCS 6-7): −15% (precisa perder ~15%)
 * - Obeso (BCS 8-9):   −30% (perda significativa)
 */
export function estimateIdealWeight(currentKg: number, condition: BodyCondition): number {
  switch (condition) {
    case 'thin':       return +(currentKg * 1.10).toFixed(1);
    case 'ideal':      return currentKg;
    case 'overweight': return +(currentKg * 0.85).toFixed(1);
    case 'obese':      return +(currentKg * 0.70).toFixed(1);
  }
}

// ─── Metas calóricas por objetivo ─────────────────────────────

export interface GoalCaloriesParams {
  currentKg: number;
  idealKg?:  number;            // explicitamente fornecido pelo user
  species:   Species;
  lifeStage: LifeStage;
  neutered:  boolean;
  activity:  BaselineActivity;
}

export interface GoalCalories {
  maintain: number;  // kcal/dia para manter peso
  lose:     number;  // kcal/dia para emagrecer (com clamp de segurança)
  gain:     number;  // kcal/dia para engordar
}

/**
 * Calcula as 3 metas calóricas (manter/emagrecer/engordar).
 * - maintain: MER no peso alvo (ideal se fornecido, senão atual)
 * - lose:     RER no peso IDEAL × 1.0, com floor em 80% do MER atual
 *             (protege contra déficit perigoso)
 * - gain:     MER atual × 1.3 (superávit moderado)
 */
export function calculateGoalCalories(params: GoalCaloriesParams): GoalCalories {
  const targetKg = params.idealKg && params.idealKg > 0 ? params.idealKg : params.currentKg;

  // Manter: MER no peso alvo
  const maintain = calculateMER({
    weightKg:  targetKg,
    species:   params.species,
    lifeStage: params.lifeStage,
    neutered:  params.neutered,
    activity:  params.activity,
  });

  // Emagrecer: RER no peso ideal × 1.0, clampado a 80% do MER atual
  const merCurrent = calculateMER({
    weightKg:  params.currentKg,
    species:   params.species,
    lifeStage: params.lifeStage,
    neutered:  params.neutered,
    activity:  params.activity,
  });
  const rerTarget = calculateRER(targetKg);
  const loseFloor = merCurrent * 0.80;
  const lose = Math.max(rerTarget * 1.0, loseFloor);

  // Engordar: MER atual × 1.3
  const gain = merCurrent * 1.3;

  return {
    maintain: Math.round(maintain),
    lose:     Math.round(lose),
    gain:     Math.round(gain),
  };
}

/**
 * Retorna a kcal do objetivo atual selecionado.
 */
export function kcalForGoal(goals: GoalCalories, goal: NutritionGoal): number {
  if (goal === 'lose') return goals.lose;
  if (goal === 'gain') return goals.gain;
  return goals.maintain;
}
