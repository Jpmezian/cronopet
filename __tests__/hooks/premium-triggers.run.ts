/**
 * Suite — hooks/usePremiumTriggers.ts (pickPremiumTrigger pure fn)
 *
 * Lógica de quando + qual paywall popa. Bug aqui = paywall popa toda
 * hora (chato) ou nunca (sem conversão). Casos cobrem:
 *  - Premium nunca vê trigger
 *  - Ordem de prioridade (streak 30+ ganha de 7-day-family)
 *  - Cada um dos 5 triggers dispara no threshold certo
 *  - shownPrompts respeitado (não repete)
 *  - Sub-threshold para todos → null
 */

import { pickPremiumTrigger } from '@/hooks/usePremiumTriggers';
import { assertEq, assertTrue, assertNull, assertNotNull, runSuite } from '../_lib/assert';

// Estado base "free + nada qualificado ainda"
const BASE = {
  isPremium: false,
  daysSinceFirstOpen: 0,
  streak: 0,
  actionHistoryLength: 0,
  weightHistoryLength: 0,
  shownPrompts: [] as string[],
};

runSuite('hooks/usePremiumTriggers', [
  {
    name: '01. Premium ativo: sempre null (regra de ouro)',
    fn: () => {
      assertNull(pickPremiumTrigger({
        ...BASE, isPremium: true, streak: 100, weightHistoryLength: 10,
      }));
    },
  },

  {
    name: '02. Sub-threshold em tudo: null (3 dias, sem peso, sem registros)',
    fn: () => {
      assertNull(pickPremiumTrigger({
        ...BASE, daysSinceFirstOpen: 3, weightHistoryLength: 2, actionHistoryLength: 20,
      }));
    },
  },

  {
    name: '03. Streak 30+ tem prioridade máxima (sobre 7-day-family)',
    fn: () => {
      const t = pickPremiumTrigger({
        ...BASE, streak: 35, daysSinceFirstOpen: 35,
        weightHistoryLength: 5, actionHistoryLength: 60,
      });
      assertNotNull(t);
      assertEq(t.id, 'streak-30-power', 'streak ganha de todas as outras condições');
      assertTrue(t.subtitle.includes('35'), 'subtitle interpola streak count');
    },
  },

  {
    name: '04. Threshold streak: 29 não dispara streak-30, 30 dispara',
    fn: () => {
      const t29 = pickPremiumTrigger({ ...BASE, streak: 29 });
      // 29 não bate em streak-30, e nada mais qualifica → null
      assertNull(t29);

      const t30 = pickPremiumTrigger({ ...BASE, streak: 30 });
      assertNotNull(t30);
      assertEq(t30.id, 'streak-30-power');
    },
  },

  {
    name: '05. 7 dias de uso + streak baixo → seven-days-family',
    fn: () => {
      const t = pickPremiumTrigger({ ...BASE, daysSinceFirstOpen: 7, streak: 5 });
      assertNotNull(t);
      assertEq(t.id, 'seven-days-family');
      assertEq(t.feature, 'family-sharing');
    },
  },

  {
    name: '06. 3 pesos + streak baixo + < 7 dias → three-weights-plans',
    fn: () => {
      const t = pickPremiumTrigger({
        ...BASE, weightHistoryLength: 3, daysSinceFirstOpen: 5, streak: 2,
      });
      assertNotNull(t);
      assertEq(t.id, 'three-weights-plans');
    },
  },

  {
    name: '07. 50+ registros + condições anteriores não-qualificadas → fifty-logs-backup',
    fn: () => {
      const t = pickPremiumTrigger({
        ...BASE, actionHistoryLength: 50,
        daysSinceFirstOpen: 5, streak: 2, weightHistoryLength: 2,
      });
      assertNotNull(t);
      assertEq(t.id, 'fifty-logs-backup');
      assertTrue(t.subtitle.includes('aqui'), 'subtitle conscientiza sobre backup');
    },
  },

  {
    name: '08. 14 dias sem nenhuma outra qualificação → two-weeks-gentle',
    fn: () => {
      const t = pickPremiumTrigger({
        ...BASE, daysSinceFirstOpen: 14,
        // shownPrompts marca todos os anteriores como vistos
        shownPrompts: ['seven-days-family'],
      });
      assertNotNull(t);
      assertEq(t.id, 'two-weeks-gentle');
    },
  },

  {
    name: '09. shownPrompts pula trigger já visto, cai pro próximo da fila',
    fn: () => {
      // Power user (streak 30), mas já viu o prompt streak-30 → cai pra
      // próximo qualificado (7-day-family, porque daysSinceFirstOpen=35)
      const t = pickPremiumTrigger({
        ...BASE, streak: 30, daysSinceFirstOpen: 35,
        shownPrompts: ['streak-30-power'],
      });
      assertNotNull(t);
      assertEq(t.id, 'seven-days-family');
    },
  },

  {
    name: '10. Todos os 5 prompts vistos: null mesmo com qualificação total',
    fn: () => {
      const t = pickPremiumTrigger({
        ...BASE, streak: 100, daysSinceFirstOpen: 60,
        weightHistoryLength: 10, actionHistoryLength: 200,
        shownPrompts: [
          'streak-30-power', 'seven-days-family', 'three-weights-plans',
          'fifty-logs-backup', 'two-weeks-gentle',
        ],
      });
      assertNull(t, 'esgotou a fila de prompts');
    },
  },
]);
