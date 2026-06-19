import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface PremiumFooterProps {
  selectedPlan: 'monthly' | 'annual';
  onOpenLegal:  (which: 'terms' | 'privacy') => void;
}

/**
 * PremiumFooter Bold v3.
 *
 * 2 blocos:
 *   1. Disclosure Apple §3.1.2 / Google subscription policy completa
 *      por plano (cobrança em conta Apple/Google, cancelamento 24h
 *      antes da renovação). JÁ EM COMPLIANCE L2 — copy preservada.
 *   2. Links discretos pra Termos + Privacidade (L6).
 *
 * Hanken 10-11 T.ink4 — legível mas não compete visualmente com CTA.
 * Sem CTA escondido, sem dark pattern.
 */
export const PremiumFooter = React.memo(function PremiumFooter({
  selectedPlan, onOpenLegal,
}: PremiumFooterProps) {
  const T = useTheme();

  const renewalCopy = selectedPlan === 'annual'
    ? 'CronoPet Pro Anual — R$ 99,90/ano. Renovação automática na conta Apple ID / Google Play até cancelamento.'
    : 'CronoPet Pro Mensal — R$ 19,90/mês. Renovação automática na conta Apple ID / Google Play até cancelamento.';

  const cancelCopy =
    'Pra cancelar: iOS → Ajustes › Apple ID › Assinaturas. Android → Play Store › foto perfil › Pagamentos e assinaturas. Cancelamento deve ser feito ao menos 24h antes da renovação.';

  return (
    <View style={s.wrap}>
      <Text style={[s.disclosure, { color: T.ink3 }]}>{renewalCopy}</Text>
      <Text style={[s.disclosureSmall, { color: T.ink4 }]}>{cancelCopy}</Text>

      <View style={s.legalRow}>
        <ScalePress
          onPress={() => onOpenLegal('terms')}
          accessible
          accessibilityRole="link"
          accessibilityLabel="Abrir Termos de Uso"
          hitSlop={6}
        >
          <Text style={[s.legalLink, { color: T.ink3 }]}>Termos de Uso</Text>
        </ScalePress>
        <Text style={[s.legalDot, { color: T.ink4 }]}>·</Text>
        <ScalePress
          onPress={() => onOpenLegal('privacy')}
          accessible
          accessibilityRole="link"
          accessibilityLabel="Abrir Política de Privacidade"
          hitSlop={6}
        >
          <Text style={[s.legalLink, { color: T.ink3 }]}>Política de Privacidade</Text>
        </ScalePress>
      </View>
    </View>
  );
});

PremiumFooter.displayName = 'PremiumFooter';

const s = StyleSheet.create({
  wrap:            { marginTop: 24 },
  disclosure:      { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 6 },
  disclosureSmall: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 10, fontWeight: '500', lineHeight: 14 },
  legalRow:        { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  legalLink:       { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', textDecorationLine: 'underline' },
  legalDot:        { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500' },
});
