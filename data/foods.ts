// ═══════════════════════════════════════════════════════════════
// ═══ Catálogo de Rações do Mercado Brasileiro                ═══
// ═══════════════════════════════════════════════════════════════
//
// ATENÇÃO — COMPLIANCE:
// - Sugestões informativas. CronoPet NÃO é afiliado aos fabricantes.
// - Nenhuma comissão ou patrocínio envolvido.
// - Preços são APROXIMADOS e variam por região, promoção e ponto de venda.
// - Dados de kcal/100g baseados em informações públicas dos fabricantes.
// - Consulte um médico veterinário antes de mudar a dieta do pet.
// - Dados atualizados em `FOODS_DB_UPDATED_AT`.
//
// Ordem dentro do array não implica preferência — o scoring em
// `recommendFoods` determina a ordem apresentada ao usuário.

import type { LifeStage, NutritionGoal, PetSize } from '@/types/pet';

const FOODS_DB_UPDATED_AT = '2026-04';

export type FoodTier = 'economic' | 'standard' | 'premium' | 'superpremium';

type FoodPurpose =
  | 'maintenance'
  | 'weight_loss'
  | 'weight_gain'
  | 'sensitive'
  | 'active';

export interface FoodProduct {
  id:          string;
  brand:       string;
  line:        string;
  species:     'dog' | 'cat';
  tier:        FoodTier;
  lifeStage:   LifeStage | 'all';
  size:        PetSize | 'all';
  purposes:    FoodPurpose[];
  kcalPer100g: number;    // fonte: rótulo oficial do fabricante
  priceBRLMin: number;    // R$/kg — estimativa mínima no varejo BR
  priceBRLMax: number;    // R$/kg — estimativa máxima no varejo BR
  features:    string[];  // tags curtas (3-4 max)
  description: string;    // 1-2 linhas para justificar a escolha
  mealsPerDay: 2 | 3;     // refeições diárias sugeridas (padrão adulto=2, puppy=3)
}

// ─── Catálogo ──────────────────────────────────────────────

const FOODS_DB: FoodProduct[] = [
  // ══════════ CÃES ADULTOS — PREMIUM ══════════

  {
    id:          'rc-medium-adult',
    brand:       'Royal Canin',
    line:        'Medium Adult',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'medium',
    purposes:    ['maintenance'],
    kcalPer100g: 375,
    priceBRLMin: 42,
    priceBRLMax: 62,
    features:    ['Premium', 'Frango + arroz', 'Pele e pelagem'],
    description: 'Linha clássica para cães adultos de raças médias (11-25kg). Saúde digestiva e pelagem brilhante.',
    mealsPerDay: 2,
  },
  {
    id:          'rc-maxi-adult',
    brand:       'Royal Canin',
    line:        'Maxi Adult',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'large',
    purposes:    ['maintenance'],
    kcalPer100g: 370,
    priceBRLMin: 40,
    priceBRLMax: 58,
    features:    ['Proteção articular', 'Cães 26-44kg', 'Digestão'],
    description: 'Formulada para raças grandes. Glucosamina e condroitina para articulações.',
    mealsPerDay: 2,
  },
  {
    id:          'rc-mini-adult',
    brand:       'Royal Canin',
    line:        'Mini Adult',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'small',
    purposes:    ['maintenance'],
    kcalPer100g: 395,
    priceBRLMin: 48,
    priceBRLMax: 68,
    features:    ['Raças pequenas', 'Croquete pequeno', 'Saúde oral'],
    description: 'Para cães adultos de raças pequenas (até 10kg). Croquetes adaptados a mandíbulas pequenas.',
    mealsPerDay: 2,
  },
  {
    id:          'premier-raca-medias',
    brand:       'Premier',
    line:        'Fórmula Raças Médias Adulto',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'medium',
    purposes:    ['maintenance'],
    kcalPer100g: 380,
    priceBRLMin: 28,
    priceBRLMax: 42,
    features:    ['Nacional premium', 'Frango real', 'Sem corantes'],
    description: 'Excelente custo-benefício nacional. Proteína de qualidade e fibras solúveis.',
    mealsPerDay: 2,
  },
  {
    id:          'premier-raca-pequenas',
    brand:       'Premier',
    line:        'Fórmula Raças Pequenas Adulto',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'small',
    purposes:    ['maintenance'],
    kcalPer100g: 395,
    priceBRLMin: 32,
    priceBRLMax: 46,
    features:    ['Nacional premium', 'Para pequenos', 'Palatável'],
    description: 'Versão para cães de raças pequenas. Boa alternativa ao Royal Canin Mini.',
    mealsPerDay: 2,
  },
  {
    id:          'hills-adult-medium',
    brand:       "Hill's Science Diet",
    line:        'Adult Advanced Fitness',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 368,
    priceBRLMin: 38,
    priceBRLMax: 54,
    features:    ['Antioxidantes', 'L-carnitina', 'Clinicamente testado'],
    description: 'Nutrição científica com L-carnitina para preservar massa magra. Endossada por veterinários.',
    mealsPerDay: 2,
  },
  {
    id:          'proplan-adult-medium',
    brand:       'Pro Plan',
    line:        'Adulto Raças Médias',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'medium',
    purposes:    ['maintenance', 'active'],
    kcalPer100g: 385,
    priceBRLMin: 32,
    priceBRLMax: 46,
    features:    ['Probióticos vivos', 'Frango', 'Cães ativos'],
    description: 'Formulada para cães com alta demanda energética. Probióticos para saúde intestinal.',
    mealsPerDay: 2,
  },

  // ══════════ CÃES — WEIGHT LOSS ══════════

  {
    id:          'rc-light-weight',
    brand:       'Royal Canin',
    line:        'Light Weight Care',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['weight_loss'],
    kcalPer100g: 289,
    priceBRLMin: 48,
    priceBRLMax: 68,
    features:    ['-20% calorias', 'L-carnitina', 'Saciedade'],
    description: 'Fórmula reduzida em calorias para cães em processo de emagrecimento. Fibras que aumentam saciedade.',
    mealsPerDay: 2,
  },
  {
    id:          'hills-perfect-weight-dog',
    brand:       "Hill's Science Diet",
    line:        'Perfect Weight',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['weight_loss'],
    kcalPer100g: 285,
    priceBRLMin: 44,
    priceBRLMax: 62,
    features:    ['Baixa caloria', 'Estudos clínicos', 'Saboroso'],
    description: '70% dos cães perdem peso em 10 semanas segundo estudo da Hill\'s. Mantém palatabilidade.',
    mealsPerDay: 2,
  },

  // ══════════ CÃES — SUPER PREMIUM ══════════

  {
    id:          'orijen-original-dog',
    brand:       'Orijen',
    line:        'Original',
    species:     'dog',
    tier:        'superpremium',
    lifeStage:   'all',
    size:        'all',
    purposes:    ['maintenance', 'active'],
    kcalPer100g: 410,
    priceBRLMin: 75,
    priceBRLMax: 105,
    features:    ['85% ingredientes animais', 'Sem grãos', 'Biologicamente apropriado'],
    description: 'Rica em proteína animal fresca. Inspirada na dieta ancestral canina. Alta densidade energética.',
    mealsPerDay: 2,
  },
  {
    id:          'acana-heritage-adult',
    brand:       'Acana',
    line:        'Heritage Adult',
    species:     'dog',
    tier:        'superpremium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 380,
    priceBRLMin: 62,
    priceBRLMax: 88,
    features:    ['60% proteína animal', 'Frutas frescas', 'Low-glycemic'],
    description: 'Ingredientes regionais frescos do Canadá. Baixo índice glicêmico para energia sustentada.',
    mealsPerDay: 2,
  },

  // ══════════ CÃES — STANDARD ══════════

  {
    id:          'golden-adulto',
    brand:       'Golden',
    line:        'Fórmula Adulto',
    species:     'dog',
    tier:        'standard',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 350,
    priceBRLMin: 16,
    priceBRLMax: 26,
    features:    ['Nacional', 'Ômega 6', 'Bom custo-benefício'],
    description: 'Ração nacional popular. Escolha consistente para orçamento moderado sem comprometer qualidade básica.',
    mealsPerDay: 2,
  },
  {
    id:          'magnus-todo-dia',
    brand:       'Magnus',
    line:        'Premium Todo Dia Adulto',
    species:     'dog',
    tier:        'standard',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 345,
    priceBRLMin: 14,
    priceBRLMax: 22,
    features:    ['Nacional', 'Carne + frango', 'Acessível'],
    description: 'Entrada premium brasileira. Ideal para manutenção econômica em cães saudáveis.',
    mealsPerDay: 2,
  },
  {
    id:          'pedigree-adulto',
    brand:       'Pedigree',
    line:        'Adulto Nutrição Essencial',
    species:     'dog',
    tier:        'standard',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 340,
    priceBRLMin: 13,
    priceBRLMax: 20,
    features:    ['Popular', 'Palatável', 'Preço baixo'],
    description: 'Marca massificada. Aceitação alta e disponível em quase todo supermercado.',
    mealsPerDay: 2,
  },

  // ══════════ CÃES — PUPPY ══════════

  {
    id:          'rc-medium-puppy',
    brand:       'Royal Canin',
    line:        'Medium Puppy',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'puppy',
    size:        'medium',
    purposes:    ['maintenance'],
    kcalPer100g: 410,
    priceBRLMin: 46,
    priceBRLMax: 68,
    features:    ['Alta energia', 'Desenvolvimento ósseo', 'Imunidade'],
    description: 'Para filhotes de raças médias em fase de crescimento (2-12 meses). Antioxidantes para imunidade.',
    mealsPerDay: 3,
  },
  {
    id:          'premier-filhote-medias',
    brand:       'Premier',
    line:        'Fórmula Filhotes Raças Médias',
    species:     'dog',
    tier:        'premium',
    lifeStage:   'puppy',
    size:        'medium',
    purposes:    ['maintenance'],
    kcalPer100g: 405,
    priceBRLMin: 34,
    priceBRLMax: 50,
    features:    ['Nacional', 'Crescimento', 'Frango real'],
    description: 'Opção premium nacional para filhotes. Proteína de alta biodisponibilidade.',
    mealsPerDay: 3,
  },

  // ══════════ GATOS — PREMIUM ══════════

  {
    id:          'rc-feline-indoor',
    brand:       'Royal Canin',
    line:        'Feline Indoor',
    species:     'cat',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 390,
    priceBRLMin: 50,
    priceBRLMax: 72,
    features:    ['Gatos de apartamento', 'Controle de fezes', 'Bolas de pelo'],
    description: 'Para gatos adultos com vida sedentária em ambientes fechados. Reduz odor de fezes.',
    mealsPerDay: 2,
  },
  {
    id:          'hills-adult-cat',
    brand:       "Hill's Science Diet",
    line:        'Adult Cat',
    species:     'cat',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 380,
    priceBRLMin: 44,
    priceBRLMax: 62,
    features:    ['Antioxidantes', 'Taurina', 'Digestibilidade'],
    description: 'Nutrição completa com 50 nutrientes essenciais. Aprovada por nutricionistas veterinários.',
    mealsPerDay: 2,
  },
  {
    id:          'premier-gatos-castrados',
    brand:       'Premier',
    line:        'Gatos Castrados',
    species:     'cat',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance', 'weight_loss'],
    kcalPer100g: 370,
    priceBRLMin: 34,
    priceBRLMax: 48,
    features:    ['Castrados', 'Menos gordura', 'Trato urinário'],
    description: 'Específica para gatos castrados — tendem ao sobrepeso. pH urinário controlado.',
    mealsPerDay: 2,
  },
  {
    id:          'proplan-gatos-adulto',
    brand:       'Pro Plan',
    line:        'Adulto Gatos',
    species:     'cat',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 395,
    priceBRLMin: 38,
    priceBRLMax: 55,
    features:    ['Probióticos', 'Saúde imunológica', 'Palatável'],
    description: 'Alta palatabilidade. Probióticos vivos na bricoletta para saúde intestinal.',
    mealsPerDay: 2,
  },

  // ══════════ GATOS — WEIGHT LOSS ══════════

  {
    id:          'rc-feline-light',
    brand:       'Royal Canin',
    line:        'Feline Light Weight Care',
    species:     'cat',
    tier:        'premium',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['weight_loss'],
    kcalPer100g: 340,
    priceBRLMin: 54,
    priceBRLMax: 74,
    features:    ['-15% gordura', 'Saciedade', 'L-carnitina'],
    description: 'Para gatos com sobrepeso. Ajuda na perda gradual e segura sem sacrificar a palatabilidade.',
    mealsPerDay: 2,
  },

  // ══════════ GATOS — STANDARD ══════════

  {
    id:          'whiskas-adulto',
    brand:       'Whiskas',
    line:        'Adulto Sabor Carne',
    species:     'cat',
    tier:        'standard',
    lifeStage:   'adult',
    size:        'all',
    purposes:    ['maintenance'],
    kcalPer100g: 360,
    priceBRLMin: 18,
    priceBRLMax: 30,
    features:    ['Popular', 'Palatável', 'Acessível'],
    description: 'Marca mais vendida no Brasil. Aceitação alta. Boa opção econômica para gatos saudáveis.',
    mealsPerDay: 2,
  },
];

// ─── Helpers ──────────────────────────────────────────────

/**
 * Calcula quantas gramas por dia de um alimento específico são
 * necessárias para bater a meta calórica.
 */
export function gramsPerDay(targetKcalPerDay: number, food: FoodProduct): number {
  if (targetKcalPerDay <= 0 || food.kcalPer100g <= 0) return 0;
  const kcalPerGram = food.kcalPer100g / 100;
  return Math.round(targetKcalPerDay / kcalPerGram);
}

/**
 * Estima custo mensal baseado em gramas/dia × 30 × preço/kg.
 * Retorna range min/max em BRL.
 */
export function monthlyCostEstimate(
  gramsPerDayValue: number,
  food: FoodProduct,
): { min: number; max: number } {
  const kgPerMonth = (gramsPerDayValue * 30) / 1000;
  return {
    min: Math.round(kgPerMonth * food.priceBRLMin),
    max: Math.round(kgPerMonth * food.priceBRLMax),
  };
}

/**
 * Recomenda alimentos baseado em perfil do pet + objetivo.
 * Filtro duro: species + lifeStage (ou 'all') + size (ou 'all').
 * Score por aderência ao objetivo.
 */
export function recommendFoods(params: {
  species:    'dog' | 'cat';
  lifeStage:  LifeStage;
  size:       PetSize;
  goal:       NutritionGoal;
  maxResults?: number;
  /**
   * Necessidades especiais por raça (vindo de breed-conditions.ts).
   * Quando presente, ração com `purpose: 'sensitive'` ganha bônus se
   * a raça é predisposta a alergias/dermatite/pancreatite.
   */
  breedHints?: {
    sensitiveSkin?: boolean;       // Bulldog Francês, Shih Tzu, Pit, Lab, Golden, etc
    sensitiveStomach?: boolean;    // Schnauzer (pancreatite), Pastor (EPI), Bengal
    obesityProne?: boolean;        // Lab, Beagle, Cavalier, Pug, Dachshund
    lowFatNeeded?: boolean;        // Schnauzer (hipertrigliceridemia)
    urinaryCare?: boolean;         // Dálmata (uratos), gato com FLUTD
  };
}): FoodProduct[] {
  const { species, lifeStage, size, goal, maxResults = 3, breedHints } = params;

  // Filtro duro
  let candidates = FOODS_DB.filter(
    (f) =>
      f.species === species &&
      (f.lifeStage === lifeStage || f.lifeStage === 'all'),
  );

  // Tentar filtrar por tamanho — se sobrarem poucos, aceita 'all'
  const bySize = candidates.filter((f) => f.size === size || f.size === 'all');
  if (bySize.length >= maxResults) candidates = bySize;

  // Score por objetivo
  const scored = candidates.map((f) => {
    let score = 0;

    if (goal === 'lose') {
      if (f.purposes.includes('weight_loss')) score += 100;
      else if (f.purposes.includes('maintenance')) score += 20;
    } else if (goal === 'gain') {
      if (f.purposes.includes('active')) score += 80;
      if (f.purposes.includes('maintenance')) score += 40;
      // Bonus por alta densidade calórica
      score += (f.kcalPer100g - 350) / 10;
    } else {
      // maintain
      if (f.purposes.includes('maintenance')) score += 100;
    }

    // Diversificar por tier: pequeno bônus pra variar os tiers
    // (evita 3 Royal Canin seguidas)
    if (f.tier === 'premium')      score += 5;
    if (f.tier === 'superpremium') score += 3;
    if (f.tier === 'standard')     score += 4;  // valorizar opções acessíveis

    // Boost por necessidade racial (override mais leve que objetivo principal)
    if (breedHints) {
      if ((breedHints.sensitiveSkin || breedHints.sensitiveStomach) && f.purposes.includes('sensitive')) {
        score += 60; // grande boost — raça predisposta SEMPRE prefere sensible
      }
      if (breedHints.lowFatNeeded && f.kcalPer100g < 360) {
        // Raças com pancreatite/hipertrigliceridemia: rações mais leves ganham
        score += 30;
      }
      if (breedHints.obesityProne && goal !== 'gain' && f.purposes.includes('weight_loss')) {
        score += 25; // mesmo se goal=manter, se a raça engorda fácil dá bônus pra weight_loss
      }
      if (breedHints.urinaryCare && f.tier === 'superpremium') {
        // Rações superpremium têm formulação melhor pra trato urinário
        score += 15;
      }
    }

    return { food: f, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Desduplicar por marca para diversificar
  const seen = new Set<string>();
  const result: FoodProduct[] = [];
  for (const { food } of scored) {
    if (result.length >= maxResults) break;
    if (seen.has(food.brand)) continue;
    seen.add(food.brand);
    result.push(food);
  }

  // Se ainda tem espaço, completa com restantes ignorando desduplicação
  if (result.length < maxResults) {
    for (const { food } of scored) {
      if (result.length >= maxResults) break;
      if (!result.find((r) => r.id === food.id)) result.push(food);
    }
  }

  return result;
}

// ─── Labels e cores para UI ───────────────────────────────

export const TIER_LABELS: Record<FoodTier, string> = {
  economic:     'Econômica',
  standard:     'Standard',
  premium:      'Premium',
  superpremium: 'Super Premium',
};

// Essas cores mapeiam conceitualmente para os action tokens —
// mas são expostas como constantes porque o consumer (FoodCard)
// precisa passar as cores concretas pro tier badge.
export const TIER_TONE: Record<FoodTier, 'neutral' | 'blue' | 'amber' | 'purple'> = {
  economic:     'neutral',
  standard:     'blue',
  premium:      'amber',
  superpremium: 'purple',
};

export const FOOD_DISCLAIMER = `Sugestões informativas. CronoPet não é afiliado aos fabricantes e não recebe comissão. Preços aproximados em R$/kg, variam por região e ponto de venda. Dados atualizados em ${FOODS_DB_UPDATED_AT}. Consulte um veterinário antes de mudar a dieta.`;
