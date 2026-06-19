import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';
import type { PremiumPlanId } from './PricingCards';

interface TrialCTAProps {
  selectedPlan: PremiumPlanId;
  loading:      boolean;
  onSubscribe:  () => void;
  onRestore:    () => void;
}

const PLAN_LABEL: Record<PremiumPlanId, string> = {
  monthly: 'mensal',
  annual:  'anual',
};

const PLAN_PRICE: Record<PremiumPlanId, string> = {
  monthly: 'R$ 19,90/mês',
  annual:  'R$ 99,90/ano',
};

/**
 * TrialCTA Bold v3 (briefing 10 § CTA + paywall honesto).
 *
 * Button preto fullwidth com label dinâmico baseado no plano. Loading
 * state via prop do Button primitivo (spinner integrado).
 *
 * Auto-renewal disclaimer Hanken 11 5 com cor T.ink4 — legível mas
 * não competindo com CTA. Pattern Apple §3.1.2 + Google subscription
 * policy obrigatório (já em compliance L2 do app).
 *
 * Link "Restaurar compras" como underline discreto Hanken 13 — pra
 * users que já compraram em outro device. Exigência Apple §3.1.1.
 */
export const TrialCTA = React.memo(function TrialCTA({
  selectedPlan, loading, onSubscribe, onRestore,
}: TrialCTAProps) {
  const T = useTheme();
  const planLabel = PLAN_LABEL[selectedPlan];
  const planPrice = PLAN_PRICE[selectedPlan];

  return (
    <View>
      <Button
        label={loading ? 'Conectando…' : 'Assinar o Pro'}
        onPress={onSubscribe}
        variant="primary"
        fullWidth
        loading={loading}
        accessibilityHint={`Confirma a assinatura do plano ${planLabel}`}
      />

      <Text style={[s.disclaimer, { color: T.ink3 }]}>
        Plano {planLabel} {planPrice}. Sem pegadinha — cancela em 2 toques nas
        Configurações da {String.fromCharCode(160)}loja. Renovação automática até cancelar.
      </Text>

      <ScalePress
        onPress={onRestore}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Restaurar compras feitas anteriormente"
        hitSlop={8}
        style={s.restoreWrap}
      >
        <Text style={[s.restore, { color: T.primary }]}>Já assinou? Restaurar compras</Text>
      </ScalePress>
    </View>
  );
});

TrialCTA.displayName = 'TrialCTA';

const s = StyleSheet.create({
  disclaimer: {
    fontFamily:  'HankenGrotesk_500Medium',
    fontSize:    11,
    fontWeight:  '500',
    lineHeight:  16,
    textAlign:   'center',
    marginTop:   12,
    paddingHorizontal: 8,
  },
  restoreWrap: { alignSelf: 'center', marginTop: 14, paddingVertical: 4 },
  restore: {
    fontFamily:    'HankenGrotesk_700Bold',
    fontSize:      13,
    fontWeight:    '700',
    textDecorationLine: 'underline',
  },
});
