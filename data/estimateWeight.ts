// ─── Estimativa de peso baseada em raça + idade ────────────────
//
// Feedback TestFlight R2-4: muitos tutores não sabem o peso exato do
// pet, especialmente filhotes ou pets adotados. Em vez de exigir o
// número antes de calcular calorias/recomendações, usamos a faixa
// de peso da raça (data/breed-conditions.ts) modulada por idade
// (filhote → fração do peso adulto via curva crescimento aproximada).
//
// Resultado é uma SUGESTÃO INFORMATIVA — não substitui pesar de
// verdade. UI deve deixar isso explícito ao tutor.

import type { PetType, PetSize } from '@/types/pet';
import { getBreedHealthProfile } from '@/data/breed-conditions';
import { ageFromBirth } from '@/data/calories';
import { getBreedSize } from '@/data/breed-meta';

export interface WeightEstimate {
  /** Peso central estimado em kg (média da faixa, ajustada por idade) */
  estimateKg: number;
  /** Faixa min/max em kg (raça adulta, antes do ajuste de idade) */
  rangeKg: { min: number; max: number };
  /** Fração do peso adulto que filhotes/jovens devem ter agora (1 = adulto) */
  ageFactor: number;
  /** Indicador de qual fonte usamos pra mostrar transparência */
  source: 'breed-profile' | 'breed-size-fallback';
}

// Curva de crescimento simplificada cão (% do peso adulto por idade).
// Baseada em FEDIAF growth charts (cães porte médio). Não é exato,
// mas é melhor do que assumir adulto. Pontos:
//   2 meses → 25%, 4 → 50%, 6 → 70%, 9 → 85%, 12 → 95%, 18+ → 100%
function dogGrowthFactor(ageYears: number): number {
  if (ageYears >= 1.5) return 1;
  if (ageYears >= 1.0) return 0.95;
  if (ageYears >= 0.75) return 0.85;
  if (ageYears >= 0.5)  return 0.70;
  if (ageYears >= 0.33) return 0.50;
  if (ageYears >= 0.16) return 0.25;
  return 0.10; // recém-nascido
}

// Gatos atingem peso adulto entre 10-12 meses.
function catGrowthFactor(ageYears: number): number {
  if (ageYears >= 1.0) return 1;
  if (ageYears >= 0.75) return 0.90;
  if (ageYears >= 0.5)  return 0.70;
  if (ageYears >= 0.33) return 0.50;
  if (ageYears >= 0.16) return 0.30;
  return 0.12;
}

// Fallback de faixas por porte quando raça não está mapeada.
const SIZE_RANGES: Record<PetSize, { min: number; max: number }> = {
  small:  { min: 3,  max: 10 },
  medium: { min: 10, max: 25 },
  large:  { min: 25, max: 45 },
  giant:  { min: 45, max: 80 },
};

// Faixas razoáveis pra gatos (não temos breed profiles felinos hoje).
const CAT_DEFAULT_RANGE = { min: 3.5, max: 5.5 };

/**
 * Estima o peso atual do pet baseado em raça, idade e tipo.
 * Retorna null se não houver informação suficiente (sem raça nem porte).
 */
export function estimateWeight(
  raca: string | undefined,
  tipo: PetType,
  nascimento?: string,
): WeightEstimate | null {
  const ageYears = ageFromBirth(nascimento) ?? 3; // adulto típico se não souber

  // 1) Tenta breed profile (mais preciso)
  let range: { min: number; max: number } | null = null;
  let source: WeightEstimate['source'] = 'breed-size-fallback';

  if (raca && tipo === 'cachorro') {
    const profile = getBreedHealthProfile(raca, tipo);
    if (profile?.weightRange) {
      range = profile.weightRange;
      source = 'breed-profile';
    }
  }

  // 2) Fallback: porte derivado da raça → faixa do porte
  if (!range) {
    if (tipo === 'gato' || tipo === 'outro') {
      range = CAT_DEFAULT_RANGE;
    } else {
      const size = getBreedSize(raca ?? '', tipo);
      range = SIZE_RANGES[size];
    }
  }

  if (!range) return null;

  const center = (range.min + range.max) / 2;
  const factor =
    tipo === 'cachorro' ? dogGrowthFactor(ageYears) :
    tipo === 'gato'     ? catGrowthFactor(ageYears) :
    1;

  return {
    estimateKg: Number((center * factor).toFixed(1)),
    rangeKg: range,
    ageFactor: factor,
    source,
  };
}
