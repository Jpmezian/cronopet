import React, { useState, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { PremiumHero } from './PremiumHero';
import { FeaturesList } from './FeaturesList';
import { PricingCards, type PremiumPlanId } from './PricingCards';
import { TrialCTA } from './TrialCTA';
import { PremiumFooter } from './PremiumFooter';
import { ActivePremiumCard } from './ActivePremiumCard';
import { purchasePackage } from '@/services/purchases';
import { useToastStore } from '@/store/useToastStore';
import { usePremium } from '@/hooks/usePremium';
import type { PremiumPlan } from '@/services/purchases';

interface ViewPitchBoldV3Props {
  petNome:           string;
  onRestorePurchases: () => Promise<void> | void;
  onOpenLegal:       (which: 'terms' | 'privacy') => void;
}

const TO_RC_PLAN: Record<PremiumPlanId, PremiumPlan> = {
  monthly: 'monthly',
  annual:  'yearly',  // RevenueCat usa 'yearly' (vide services/purchases.ts:44)
};

/**
 * ViewPitchBoldV3 — paywall honesto do CronoPet Pro (Fase 6).
 *
 * Substitui ViewPitch legacy do app/premium.tsx (linhas 793-1292,
 * Nunito + emojis + hardcoded #04A29B). Encapsula:
 *   • PremiumHero (InkPanel + pata watermark + Pill Pro)
 *   • FeaturesList (4 features REAIS — sem invenções)
 *   • PricingCards (2 planos com preços do RevenueCat)
 *   • TrialCTA (Button real chama purchasePackage)
 *   • PremiumFooter (disclosure Apple/Google + Termos/Privacidade)
 *
 * Estado isPremium=true: substitui pelo ActivePremiumCard (NÃO permite
 * re-compra). Deep link pra subscriptions na loja.
 *
 * Purchase real (F6-D1): RevenueCat purchasePackage. Após sucesso
 * → toast + router.back() (volta pra origem AIGate/Insights, que
 * re-renderiza desbloqueado).
 */
export function ViewPitchBoldV3({
  petNome, onRestorePurchases, onOpenLegal,
}: ViewPitchBoldV3Props) {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const premium = usePremium();

  const [selected, setSelected] = useState<PremiumPlanId>('annual');
  const [loading, setLoading]   = useState(false);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await purchasePackage(TO_RC_PLAN[selected]);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('success', 'Bem-vindo ao Pro!');
        router.back();
        return;
      }
      if (!result.cancelled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast('error', 'Não rolou. Tenta de novo em alguns segundos.');
      }
      // Cancelado pelo user: silencioso, mantém modal
    } finally {
      setLoading(false);
    }
  }, [selected, router, showToast]);

  const handleRestore = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onRestorePurchases();
  }, [onRestorePurchases]);

  // ─── isPremium=true: mostra estado ativo ───────────────────
  if (premium.isPremium) {
    return (
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ActivePremiumCard
          plan={premium.plan}
          isTrialActive={premium.isTrialActive}
          trialDaysLeft={premium.trialDaysLeft}
          trialEndsAt={premium.trialEndsAt}
        />
      </ScrollView>
    );
  }

  // ─── Paywall normal ───────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 20 }}>
        <PremiumHero petNome={petNome} />
        <FeaturesList />
        <PricingCards selected={selected} onSelect={setSelected} />
        <TrialCTA
          selectedPlan={selected}
          loading={loading}
          onSubscribe={handleSubscribe}
          onRestore={handleRestore}
        />
        <PremiumFooter selectedPlan={selected} onOpenLegal={onOpenLegal} />
      </View>
    </ScrollView>
  );
}

const s = {
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
};
