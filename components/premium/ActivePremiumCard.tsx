import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { InkPanel } from '@/components/ui/InkPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Kicker } from '@/components/ui/Kicker';
import { useTheme } from '@/hooks/useTheme';

interface ActivePremiumCardProps {
  plan:           'monthly' | 'annual' | null;
  isTrialActive:  boolean;
  trialDaysLeft:  number;
  trialEndsAt:    number | null;
}

const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_STORE_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

/**
 * ActivePremiumCard Bold v3.
 *
 * Shown quando user já é Pro (paid OU trial ativo). NÃO permite
 * re-compra — paywall honesto: se já é assinante, mostra status +
 * deep link de gerenciamento na loja. Apple §3.1.2 + Google policy
 * exigem caminho fácil pra cancelar.
 *
 * Composição:
 *   • InkPanel preto com Pill "Pro ativo" + título + status
 *   • Card branco com features que está usando (3 checks)
 *   • Button "Gerenciar na loja" → deep link iOS/Android
 */
export const ActivePremiumCard = React.memo(function ActivePremiumCard({
  plan, isTrialActive, trialDaysLeft, trialEndsAt,
}: ActivePremiumCardProps) {
  const T = useTheme();

  const handleManage = useCallback(() => {
    const url = Platform.OS === 'ios'
      ? APP_STORE_SUBSCRIPTIONS_URL
      : PLAY_STORE_SUBSCRIPTIONS_URL;
    Linking.openURL(url).catch(() => {});
  }, []);

  const planLabel = plan === 'annual' ? 'Anual' : plan === 'monthly' ? 'Mensal' : 'Pro';
  const headline = isTrialActive
    ? `Trial ${planLabel.toLowerCase()} ativo`
    : `Pro ${planLabel.toLowerCase()} ativo`;
  const sub = isTrialActive
    ? `Restam ${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'} grátis${
        trialEndsAt ? ` (até ${new Date(trialEndsAt).toLocaleDateString('pt-BR')})` : ''
      }.`
    : 'Obrigado por apoiar o desenvolvimento — ajuda demais.';

  return (
    <View style={{ gap: 20 }}>
      <InkPanel padding={24} radius={28}>
        <Pill label={isTrialActive ? 'Trial' : 'Pro'} tone="pro" />
        <Text style={[s.headline, { color: T.onBlk }]}>{headline}</Text>
        <Text style={[s.sub, { color: 'rgba(246,244,234,0.72)' }]}>{sub}</Text>
      </InkPanel>

      <Card padding={20}>
        <Kicker>Você tem</Kicker>
        <View style={s.featList}>
          {[
            'Análise de saúde por padrões',
            'Família compartilhada',
            'Insights de saúde completos',
            'Lembretes inteligentes',
          ].map((label) => (
            <View key={label} style={s.featRow}>
              <View style={[s.checkBox, { backgroundColor: T.mintSoft }]}>
                <Check size={14} color={T.primaryDeep} strokeWidth={3} />
              </View>
              <Text style={[s.featLabel, { color: T.ink }]}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        label="Gerenciar na loja"
        onPress={handleManage}
        variant="black"
        fullWidth
        accessibilityHint="Abre as assinaturas do seu Apple ID ou Google Play"
      />
    </View>
  );
});

ActivePremiumCard.displayName = 'ActivePremiumCard';

const s = StyleSheet.create({
  headline:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 26, letterSpacing: -0.8, lineHeight: 30, marginTop: 14 },
  sub:       { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13.5, fontWeight: '500', lineHeight: 19, marginTop: 11 },
  featList:  { gap: 10, marginTop: 12 },
  featRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkBox:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  featLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
});
