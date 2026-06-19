import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme, type Theme } from '@/hooks/useTheme';

export type PremiumPlanId = 'monthly' | 'annual';

interface PlanInfo {
  id:        PremiumPlanId;
  label:     string;
  price:     string;
  /** Sublinha auxiliar (cobrança / per-month amortizado). */
  caption:   string;
  /** Badge calmo "Melhor valor" — sem 🔥 dark patterns. */
  badge?:    string;
}

/**
 * Preços REAIS do código (PRICING_PLANS legacy do app/premium.tsx).
 * Briefing 10 usa preços ilustrativos diferentes — verdade-do-código
 * vence pra não criar discrepância com RevenueCat configurado.
 *
 * Economia anual = 1 - 99.90 / (19.90 * 12) = ~58% (declarado real,
 * não preço fabricado "De R$ 200 por R$ 99").
 */
const PLANS: PlanInfo[] = [
  {
    id:      'annual',
    label:   'Anual',
    price:   'R$ 99,90',
    caption: 'R$ 8,33/mês · economiza 58%',
    badge:   'Melhor valor',
  },
  {
    id:      'monthly',
    label:   'Mensal',
    price:   'R$ 19,90',
    caption: 'Cobrado todo mês',
  },
];

interface PricingCardsProps {
  selected:   PremiumPlanId;
  onSelect:   (id: PremiumPlanId) => void;
}

/**
 * PricingCards Bold v3 (briefing 10 § PlanCard x2).
 *
 * 2 cards verticalmente empilhados. Anual destacado por default (vide
 * PLANS[0]). Card selecionado: border 2px T.primary + bg surfaceTint.
 * Card não selecionado: border T.rule + bg T.card.
 *
 * Radio: círculo 22 com check branco interno quando ativo. Cor
 * `T.primary` (verdigris) — consistente com CTA verdigris.
 *
 * Plan info acessível: tap em qualquer área do card seleciona.
 */
export const PricingCards = React.memo(function PricingCards({
  selected, onSelect,
}: PricingCardsProps) {
  const T = useTheme();

  return (
    <View style={s.list}>
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isSelected={plan.id === selected}
          onSelect={() => onSelect(plan.id)}
          T={T}
        />
      ))}
    </View>
  );
});

PricingCards.displayName = 'PricingCards';

// ─── Card ────────────────────────────────────────────────────

interface PlanCardProps {
  plan:       PlanInfo;
  isSelected: boolean;
  onSelect:   () => void;
  T:          Theme;
}

function PlanCard({ plan, isSelected, onSelect, T }: PlanCardProps) {
  return (
    <ScalePress
      onPress={onSelect}
      scaleValue={0.99}
      accessible
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${plan.label}, ${plan.price}. ${plan.caption}.${plan.badge ? ` ${plan.badge}.` : ''}`}
      style={[
        s.card,
        {
          backgroundColor: isSelected ? T.surfaceTint : T.card,
          borderColor:     isSelected ? T.primary : T.rule,
        },
      ]}
    >
      <View
        style={[
          s.radio,
          {
            borderColor:     isSelected ? T.primary : T.rule,
            backgroundColor: isSelected ? T.primary : 'transparent',
          },
        ]}
      >
        {isSelected && <Check size={13} color={T.onPrimary} strokeWidth={3.2} />}
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.titleRow}>
          <Text style={[s.title, { color: T.ink }]}>{plan.label}</Text>
          {plan.badge && <Pill label={plan.badge} tone="pro" />}
        </View>
        <Text style={[s.caption, { color: T.ink3 }]}>{plan.caption}</Text>
      </View>

      <Text style={[s.price, { color: T.ink }]}>{plan.price}</Text>
    </ScalePress>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  list:     { gap: 11 },
  card:     { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 20, borderWidth: 2 },
  radio:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  caption:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 2 },
  price:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 17, letterSpacing: -0.4 },
});
