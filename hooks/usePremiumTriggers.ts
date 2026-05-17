// ─── usePremiumTriggers ──────────────────────────────────────
// Detecta pontos de contato contextuais para sugerir Premium.
// Retorna o prompt pendente (se houver) e um callback para
// marcar como visto / dispensar.
//
// Regra de ouro: NUNCA mostrar se usuário já é Premium.
// Nunca mostrar o mesmo prompt duas vezes (persistido no store).
// Respeitar cooldown: no máximo 1 prompt por sessão.

import { useMemo } from 'react';
import { usePetStore } from '@/store/usePetStore';
import { usePremium } from '@/hooks/usePremium';

export interface PremiumTrigger {
  id:           string;
  emoji:        string;
  headline:     string;
  subtitle:     string;
  feature:      string;  // qual feature premium destaca
  cta:          string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Decisão pura: dado o estado de engajamento + prompts já vistos,
 * retorna o trigger pendente (ou null). Extraído do hook pra testabilidade.
 *
 * Ordem de prioridade: dos mais qualificados pros menos (quanto mais
 * engajado o usuário, maior a chance de converter).
 */
export function pickPremiumTrigger(input: {
  isPremium:           boolean;
  daysSinceFirstOpen:  number;
  streak:              number;
  actionHistoryLength: number;
  weightHistoryLength: number;
  shownPrompts:        string[];
}): PremiumTrigger | null {
  // Se já é premium, nunca mostrar
  if (input.isPremium) return null;
  const seen = new Set(input.shownPrompts);

  // 1. 30+ dias de streak → propaganda forte (power user)
  if (input.streak >= 30 && !seen.has('streak-30-power')) {
    return {
      id:       'streak-30-power',
      emoji:    '👑',
      headline: 'Você é um tutor excepcional!',
      subtitle: `${input.streak} dias de rotina perfeita. Que tal backup em nuvem pra nunca perder esse progresso?`,
      feature:  'cloud-sync',
      cta:      'Ativar backup em nuvem',
    };
  }

  // 2. 7+ dias de uso → engajado, momento de upsell suave
  if (input.daysSinceFirstOpen >= 7 && !seen.has('seven-days-family')) {
    return {
      id:       'seven-days-family',
      emoji:    '👨‍👩‍👦',
      headline: 'Já tá virando rotina, hein?',
      subtitle: 'Compartilhe com a família — todos veem os registros em tempo real.',
      feature:  'family-sharing',
      cta:      'Convidar a família',
    };
  }

  // 3. Registrou peso 3+ vezes → tutor consciente, vai gostar do plano
  if (input.weightHistoryLength >= 3 && !seen.has('three-weights-plans')) {
    return {
      id:       'three-weights-plans',
      emoji:    '🥗',
      headline: 'Tá monitorando o peso com carinho',
      subtitle: 'Com Premium você salva múltiplos planos nutricionais (manutenção, emagrecimento) e alterna conforme a fase.',
      feature:  'multiple-plans',
      cta:      'Ver planos salvos',
    };
  }

  // 4. 50+ registros → histórico valioso, não pode perder
  if (input.actionHistoryLength >= 50 && !seen.has('fifty-logs-backup')) {
    return {
      id:       'fifty-logs-backup',
      emoji:    '💾',
      headline: `${input.actionHistoryLength} registros preciosos`,
      subtitle: 'Seus dados estão só aqui. Premium faz backup automático na nuvem.',
      feature:  'cloud-sync',
      cta:      'Proteger meu histórico',
    };
  }

  // 5. Primeira sessão pós-14 dias sem ver nada → gentle reminder
  if (input.daysSinceFirstOpen >= 14 && !seen.has('two-weeks-gentle')) {
    return {
      id:       'two-weeks-gentle',
      emoji:    '🎁',
      headline: '7 dias grátis esperando por você',
      subtitle: 'Experimente Premium sem compromisso. Sem cartão, cancele a qualquer hora.',
      feature:  'family-sharing',
      cta:      'Começar teste grátis',
    };
  }

  return null;
}

/** Define todos os gatilhos possíveis em ordem de prioridade. */
export function usePremiumTriggers(): {
  pendingTrigger: PremiumTrigger | null;
  dismissTrigger: (id: string) => void;
} {
  const premium = usePremium();
  const actionHistory  = usePetStore((s) => s.actionHistory);
  const weightHistory  = usePetStore((s) => s.weightHistory);
  const streak         = usePetStore((s) => s.streak);
  const shownPrompts   = usePetStore((s) => s.shownPremiumPrompts);
  const markShown      = usePetStore((s) => s.markPremiumPromptShown);

  const pendingTrigger = useMemo<PremiumTrigger | null>(
    () => pickPremiumTrigger({
      isPremium:           premium.isPremium,
      daysSinceFirstOpen:  premium.daysSinceFirstOpen,
      streak,
      actionHistoryLength: actionHistory.length,
      weightHistoryLength: weightHistory.length,
      shownPrompts,
    }),
    [
      premium.isPremium,
      premium.daysSinceFirstOpen,
      streak,
      actionHistory.length,
      weightHistory.length,
      shownPrompts,
    ],
  );

  return {
    pendingTrigger,
    dismissTrigger: markShown,
  };
}
