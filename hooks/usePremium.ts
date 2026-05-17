// ─── usePremium — hook central de assinatura ─────────────────
// Single source of truth para todas as telas que precisam checar
// se o usuário é Premium. Quando integrar StoreKit/RevenueCat,
// o reconciliation com o receipt real acontece AQUI (em um
// useEffect), e todo o resto do app continua funcionando sem
// alteração.

import { useMemo } from 'react';
import { usePetStore } from '@/store/usePetStore';

export interface PremiumStatus {
  /** Usuário tem acesso a features Premium (pago OU trial ativo) */
  isPremium: boolean;

  /** Status de trial */
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt:   number | null;

  /** Plano contratado (null se free/trial) */
  plan: 'monthly' | 'annual' | null;

  /** Pode iniciar trial? (nunca iniciou antes) */
  canStartTrial: boolean;

  /** Epoch ms do primeiro open */
  firstAppOpenAt: number | null;

  /** Dias de uso do app */
  daysSinceFirstOpen: number;
}

const TRIAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function usePremium(): PremiumStatus {
  const isPremium        = usePetStore((s) => s.isPremium);
  const premiumPlan      = usePetStore((s) => s.premiumPlan);
  const premiumExpiresAt = usePetStore((s) => s.premiumExpiresAt);
  const trialStartedAt   = usePetStore((s) => s.trialStartedAt);
  const firstAppOpenAt   = usePetStore((s) => s.firstAppOpenAt);

  return useMemo(() => {
    const now = Date.now();

    // Trial ativo?
    const trialEndsAt = trialStartedAt ? trialStartedAt + TRIAL_DAYS * MS_PER_DAY : null;
    const isTrialActive = trialEndsAt !== null && now < trialEndsAt;
    const trialDaysLeft = isTrialActive
      ? Math.ceil(((trialEndsAt ?? 0) - now) / MS_PER_DAY)
      : 0;

    // Pago e não expirou?
    const isPaidActive = isPremium && (
      premiumExpiresAt === null || now < premiumExpiresAt
    );

    const daysSinceFirstOpen = firstAppOpenAt
      ? Math.floor((now - firstAppOpenAt) / MS_PER_DAY)
      : 0;

    return {
      isPremium:      isPaidActive || isTrialActive,
      isTrialActive,
      trialDaysLeft,
      trialEndsAt,
      plan:           isPaidActive ? premiumPlan : null,
      canStartTrial:  trialStartedAt === null,
      firstAppOpenAt,
      daysSinceFirstOpen,
    };
  }, [isPremium, premiumPlan, premiumExpiresAt, trialStartedAt, firstAppOpenAt]);
}

// PREMIUM_FEATURES / PREMIUM_FEATURE_COPY removidos em 2026-05-17 —
// não havia nenhum gate de UI consumindo eles. Quando voltarmos a
// implementar prompts de paywall por feature, recriamos baseados na
// lista oficial em vez de manter código morto.
