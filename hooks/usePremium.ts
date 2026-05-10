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

// ─── Features gated ──────────────────────────────────────────
// Lista centralizada de features Premium. Usado pra gates na UI.

export const PREMIUM_FEATURES = {
  MULTI_PET:         'multi-pet',         // Cadastrar mais de um pet
  CLOUD_SYNC:        'cloud-sync',        // Backup em nuvem
  FAMILY_SHARING:    'family-sharing',    // Compartilhar com família
  UNLIMITED_HISTORY: 'unlimited-history', // Histórico ilimitado (free = 30 dias)
  JSON_EXPORT:       'json-export',       // Exportar para sistemas vet
  MULTIPLE_PLANS:    'multiple-plans',    // Vários planos nutricionais salvos
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

// Copy pra cada feature (usado nos prompts)
export const PREMIUM_FEATURE_COPY: Record<PremiumFeature, { title: string; desc: string; emoji: string }> = {
  'multi-pet': {
    emoji: '🐾',
    title: 'Cadastre mais pets',
    desc:  'Dashboards separados, histórico individual, planos nutricionais próprios.',
  },
  'cloud-sync': {
    emoji: '☁️',
    title: 'Backup em nuvem',
    desc:  'Seus dados salvos automaticamente. Trocou de celular? Tá tudo lá.',
  },
  'family-sharing': {
    emoji: '👨‍👩‍👦',
    title: 'Compartilhe com a família',
    desc:  'Toda a família acompanha a rotina em tempo real.',
  },
  'unlimited-history': {
    emoji: '📊',
    title: 'Histórico ilimitado',
    desc:  'Guarda registros desde o primeiro dia. Perfeito pro check-up anual.',
  },
  'json-export': {
    emoji: '💾',
    title: 'Exportação avançada',
    desc:  'PDF + JSON para sistemas veterinários profissionais.',
  },
  'multiple-plans': {
    emoji: '🥗',
    title: 'Vários planos nutricionais',
    desc:  'Salve múltiplos planos (manutenção, emagrecimento) e alterne conforme necessário.',
  },
};
