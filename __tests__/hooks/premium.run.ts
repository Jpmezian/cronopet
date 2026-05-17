/**
 * Suite — hooks/usePremium.ts (computePremiumStatus pure fn)
 *
 * Lógica de paywall + trial. Bug aqui = usuário grátis vê feature paga
 * OU pagante vê paywall. Casos cobrem:
 *  - Estado vazio (free, nunca abriu)
 *  - Pago ativo (não expirou)
 *  - Pago expirado (volta a free)
 *  - Pago sem expiresAt (lifetime / sem renovação)
 *  - Trial ativo (dentro dos 7 dias)
 *  - Trial expirado (>= 7 dias)
 *  - Pago + Trial sobrepostos (pago ganha)
 *  - daysSinceFirstOpen calculation
 *  - canStartTrial flag (trialStartedAt === null)
 */

import { computePremiumStatus } from '@/hooks/usePremium';
import { assertEq, assertTrue, runSuite } from '../_lib/assert';

const NOW = new Date('2026-05-17T12:00:00').getTime();
const DAY = 86_400_000;

runSuite('hooks/usePremium', [
  {
    name: '01. Free fresh: isPremium=false, canStartTrial=true, sem dias de uso',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: false, premiumPlan: null, premiumExpiresAt: null,
        trialStartedAt: null, firstAppOpenAt: null, now: NOW,
      });
      assertEq(s.isPremium, false);
      assertEq(s.isTrialActive, false);
      assertEq(s.trialDaysLeft, 0);
      assertEq(s.plan, null);
      assertEq(s.canStartTrial, true, 'nunca iniciou trial');
      assertEq(s.daysSinceFirstOpen, 0, 'sem firstOpen, sem dias');
    },
  },

  {
    name: '02. Pago monthly não-expirado: isPremium=true, plan="monthly"',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: true,
        premiumPlan: 'monthly',
        premiumExpiresAt: NOW + 10 * DAY,
        trialStartedAt: null,
        firstAppOpenAt: NOW - 30 * DAY,
        now: NOW,
      });
      assertEq(s.isPremium, true);
      assertEq(s.plan, 'monthly');
      assertEq(s.daysSinceFirstOpen, 30);
    },
  },

  {
    name: '03. Pago expirado: isPremium volta pra false, plan vira null',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: true,
        premiumPlan: 'annual',
        premiumExpiresAt: NOW - 1 * DAY, // expirou ontem
        trialStartedAt: null,
        firstAppOpenAt: NOW - 60 * DAY,
        now: NOW,
      });
      assertEq(s.isPremium, false, 'expirado não conta');
      assertEq(s.plan, null, 'plano vira null quando expira');
    },
  },

  {
    name: '04. Pago sem expiresAt (null) é considerado ativo (lifetime)',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: true,
        premiumPlan: 'annual',
        premiumExpiresAt: null, // sem data de expiração
        trialStartedAt: null,
        firstAppOpenAt: null,
        now: NOW,
      });
      assertEq(s.isPremium, true);
      assertEq(s.plan, 'annual');
    },
  },

  {
    name: '05. Trial ativo (dia 3 dos 7): isTrialActive, trialDaysLeft~4',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: false, premiumPlan: null, premiumExpiresAt: null,
        trialStartedAt: NOW - 3 * DAY,
        firstAppOpenAt: NOW - 3 * DAY,
        now: NOW,
      });
      assertEq(s.isPremium, true, 'trial conta como premium');
      assertEq(s.isTrialActive, true);
      assertEq(s.trialDaysLeft, 4, '7 - 3 = 4 dias restantes');
      assertEq(s.canStartTrial, false, 'já iniciou');
      assertEq(s.plan, null, 'trial não tem plan');
    },
  },

  {
    name: '06. Trial expirado (dia 8): volta a free, mas canStartTrial=false',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: false, premiumPlan: null, premiumExpiresAt: null,
        trialStartedAt: NOW - 8 * DAY,
        firstAppOpenAt: NOW - 8 * DAY,
        now: NOW,
      });
      assertEq(s.isPremium, false);
      assertEq(s.isTrialActive, false);
      assertEq(s.trialDaysLeft, 0);
      assertEq(s.canStartTrial, false, 'usou o trial uma vez, não pode iniciar de novo');
    },
  },

  {
    name: '07. Pago + Trial sobrepostos: ambos contam, plan reflete o pago',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: true,
        premiumPlan: 'monthly',
        premiumExpiresAt: NOW + 10 * DAY,
        trialStartedAt: NOW - 2 * DAY,
        firstAppOpenAt: NOW - 10 * DAY,
        now: NOW,
      });
      assertEq(s.isPremium, true);
      assertEq(s.plan, 'monthly', 'pago ganha sobre trial pra plan');
      assertEq(s.isTrialActive, true, 'trial info exposta separadamente');
    },
  },

  {
    name: '08. daysSinceFirstOpen: floor, não round (3.9 dias = 3)',
    fn: () => {
      const s = computePremiumStatus({
        isPremium: false, premiumPlan: null, premiumExpiresAt: null,
        trialStartedAt: null,
        firstAppOpenAt: NOW - 3.9 * DAY,
        now: NOW,
      });
      assertEq(s.daysSinceFirstOpen, 3, 'Math.floor');
    },
  },

  {
    name: '09. trialDaysLeft com Math.ceil: 3.1 dias restantes vira 4',
    fn: () => {
      // Trial iniciou há 7d - 3.1d = 3.9d atrás → faltam 3.1d
      const s = computePremiumStatus({
        isPremium: false, premiumPlan: null, premiumExpiresAt: null,
        trialStartedAt: NOW - 3.9 * DAY,
        firstAppOpenAt: null,
        now: NOW,
      });
      assertEq(s.trialDaysLeft, 4, 'Math.ceil pra arredondar pra cima — UX melhor');
    },
  },
]);
