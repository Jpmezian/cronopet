/**
 * Suite — data/calories.ts
 *
 * Valida cálculo nutricional contra valores NRC 2006 de referência.
 * Tolerância de ±2 kcal absorve arredondamento em Math.pow + rounding
 * final. Casos cobrem: helpers de idade, life-stage por porte, MER
 * por espécie/castração/atividade, lose-floor de segurança, edge cases.
 */

import {
  petTypeToSpecies,
  ageFromBirth,
  estimateLifeStage,
  calculateGoalCalories,
  kcalForGoal,
  calculateWellnessEstimate,
  DEFAULT_FOOD_KCAL_PER_GRAM,
} from '@/data/calories';
import {
  assertEq, assertNear, assertNull, assertNotNull, assertTrue, runSuite,
  mockTime, restoreTime,
} from '../_lib/assert';

runSuite('calories.ts', [
  {
    name: '01. petTypeToSpecies: cachorro→dog, gato→cat, outro→dog (fallback)',
    fn: () => {
      assertEq(petTypeToSpecies('cachorro'), 'dog');
      assertEq(petTypeToSpecies('gato'), 'cat');
      assertEq(petTypeToSpecies('outro'), 'dog', 'outro deve cair em dog por convenção');
    },
  },

  {
    name: '02. ageFromBirth: null pra missing/inválido, ~5 anos pra ISO válido',
    fn: () => {
      // Fixa Date.now em 2026-05-17 pra reprodutibilidade
      mockTime(new Date('2026-05-17T12:00:00').getTime());
      try {
        assertNull(ageFromBirth(undefined), 'undefined');
        assertNull(ageFromBirth(''), 'empty string');
        assertNull(ageFromBirth('invalid'), 'malformed');
        assertNull(ageFromBirth('2026-13-99'), 'invalid month/day');

        const age = ageFromBirth('2021-05-17');
        assertNotNull(age);
        assertNear(age, 5.0, 0.01, '5 anos exatos');
      } finally {
        restoreTime();
      }
    },
  },

  {
    name: '03. estimateLifeStage: <1y=puppy, dog medium 5y=adult, dog medium 9y=senior',
    fn: () => {
      assertEq(estimateLifeStage(0.5, 'dog', 'medium'), 'puppy', '6 meses');
      assertEq(estimateLifeStage(5,   'dog', 'medium'), 'adult', '5 anos medium');
      assertEq(estimateLifeStage(9,   'dog', 'medium'), 'senior', '9 anos medium senior threshold=8');
      assertEq(estimateLifeStage(11,  'dog', 'small'),  'senior', '11 anos small senior threshold=10');
      assertEq(estimateLifeStage(6,   'dog', 'giant'),  'senior', '6 anos giant senior threshold=6');
      assertEq(estimateLifeStage(null, 'dog'),          'adult', 'idade null → adult fallback');
    },
  },

  {
    name: '04. estimateLifeStage gato: senior threshold 10 anos (sem size)',
    fn: () => {
      assertEq(estimateLifeStage(0.8, 'cat'),  'puppy');
      assertEq(estimateLifeStage(8,   'cat'),  'adult');
      assertEq(estimateLifeStage(10,  'cat'),  'senior', 'limiar exato');
      assertEq(estimateLifeStage(15,  'cat'),  'senior');
    },
  },

  {
    name: '05. Cão adulto castrado moderate 10kg: maintain ≈ RER(10)*1.6 = 631 kcal',
    fn: () => {
      // NRC: RER(10) = 70 * 10^0.75 = 393.66
      // MER adult dog neutered moderate: k = 1.6 (sem ajuste de atividade)
      const goals = calculateGoalCalories({
        currentKg: 10,
        species: 'dog',
        lifeStage: 'adult',
        neutered: true,
        activity: 'moderate',
      });
      assertNear(goals.maintain, 630, 2, 'maintain');
      // gain = MER * 1.3
      assertNear(goals.gain, Math.round(630 * 1.3), 2, 'gain');
    },
  },

  {
    name: '06. Cão obeso 10kg ideal 8kg: lose-floor protege contra déficit severo',
    fn: () => {
      // merCurrent = RER(10)*1.6 = 630
      // rerTarget = RER(8) = 70 * 8^0.75 = 70 * 4.757 = ~333
      // loseFloor = 630 * 0.80 = 504
      // lose = max(333, 504) = 504 (floor protege)
      // maintain = RER(8) * 1.6 = ~533
      const goals = calculateGoalCalories({
        currentKg: 10,
        idealKg: 8,
        species: 'dog',
        lifeStage: 'adult',
        neutered: true,
        activity: 'moderate',
      });
      assertNear(goals.maintain, 533, 2, 'maintain no peso ideal');
      assertNear(goals.lose, 504, 2, 'lose ATERRISSA no floor de 80%, não no RER puro');
      assertTrue(goals.lose > 333, 'lose nunca pode ser apenas RER do alvo (perigoso)');
    },
  },

  {
    name: '07. Gato sênior castrado low-activity 4kg: maintain ≈ RER(4)*0.9',
    fn: () => {
      // RER(4) = 70 * 4^0.75 = 70 * 2.828 = ~198
      // k cat neutered = 1.2, low=-0.1, senior=-0.2 → 0.9, clamped >=1.0 → 1.0
      // maintain = ~198 * 1.0 = ~198
      const goals = calculateGoalCalories({
        currentKg: 4,
        species: 'cat',
        lifeStage: 'senior',
        neutered: true,
        activity: 'low',
      });
      assertNear(goals.maintain, 198, 2, 'maintain com clamp em 1.0');
    },
  },

  {
    name: '08. Puppy: fator fixo 3.0 (cão) / 2.5 (gato), independente de castração',
    fn: () => {
      // Cão puppy 5kg: RER(5)*3.0 = 234*3 = 702
      const puppyDog = calculateGoalCalories({
        currentKg: 5, species: 'dog', lifeStage: 'puppy',
        neutered: false, activity: 'moderate',
      });
      assertNear(puppyDog.maintain, 702, 2, 'puppy dog maintain = RER*3');

      // Gato puppy 2kg: RER(2)*2.5 = 70*1.682*2.5 = ~294
      const puppyCat = calculateGoalCalories({
        currentKg: 2, species: 'cat', lifeStage: 'puppy',
        neutered: false, activity: 'moderate',
      });
      assertNear(puppyCat.maintain, 294, 2, 'puppy cat maintain = RER*2.5');
    },
  },

  {
    name: '09. kcalForGoal: roteia maintain/lose/gain corretamente',
    fn: () => {
      const goals = { maintain: 500, lose: 400, gain: 650 };
      assertEq(kcalForGoal(goals, 'maintain'), 500);
      assertEq(kcalForGoal(goals, 'lose'), 400);
      assertEq(kcalForGoal(goals, 'gain'), 650);
    },
  },

  {
    name: '10. calculateWellnessEstimate: balance positivo=excesso, negativo=déficit',
    fn: () => {
      // 200g ração * 3.5 kcal/g = 700 kcal intake
      // 10kg dog, 30 min passeio: DER = RER(10) * 1.4 (≤30min=factor 1.4)
      //   = 394 * 1.4 = ~551 recommended
      // 30 min passeio: 30 * 0.067 * 10 = ~20 burned
      // balance = 700 - 551 = +149 (excesso)
      const est = calculateWellnessEstimate(200, 30, 10);
      assertNear(est.intake, 700, 1);
      assertNear(est.recommended, 551, 2);
      assertNear(est.burned, 20, 1);
      assertTrue(est.balance > 0, 'balance positivo = excesso');

      // Mesmo cão, só 50g: déficit
      const lite = calculateWellnessEstimate(50, 0, 10);
      assertNear(lite.intake, 175, 1, '50g * 3.5');
      assertTrue(lite.balance < 0, 'comeu menos que recommended');

      // Edge: kcalPerGram custom
      const dense = calculateWellnessEstimate(100, 0, 10, 4.5);
      assertNear(dense.intake, 450, 1, '100g * 4.5 kcal/g (super-premium)');
      // Sanidade: DEFAULT é 3.5
      assertEq(DEFAULT_FOOD_KCAL_PER_GRAM, 3.5);
    },
  },
]);
