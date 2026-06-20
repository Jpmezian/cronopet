import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Gift } from 'lucide-react-native';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';
import type { PremiumTrigger } from '@/hooks/usePremiumTriggers';

interface PremiumTriggerSheetProps {
  trigger: PremiumTrigger | null;
  onDismiss: () => void;
}

/**
 * PremiumTriggerSheet — migrado pra ModalShell (Fase 9b). Sheet de
 * lembrete contextual de Pro: hero emoji + headline + subtitle + Pill
 * "7 dias grátis" + CTA Button preto + ghost "talvez mais tarde".
 *
 * Tap CTA → /premium com source=premium_trigger_sheet. Delay 200ms
 * antes do push pra permitir dismiss animation finalizar.
 */
export function PremiumTriggerSheet({ trigger, onDismiss }: PremiumTriggerSheetProps) {
  const T = useTheme();
  const router = useRouter();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
    setTimeout(
      () => router.push({ pathname: '/premium', params: { source: 'premium_trigger_sheet' } }),
      200,
    );
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <ModalShell
      visible={trigger !== null}
      onClose={onDismiss}
      title={trigger?.headline ?? ''}
      kicker="Pro"
    >
      {trigger && (
        <View style={s.body}>
          <View style={[s.heroIcon, { backgroundColor: T.mint }]}>
            <Text style={s.emoji} importantForAccessibility="no">{trigger.emoji}</Text>
          </View>

          <Text style={[s.subtitle, { color: T.ink2 }]}>{trigger.subtitle}</Text>

          <View style={s.pillWrap}>
            <Pill label="7 dias grátis · sem cartão" tone="pro" />
            <Gift size={14} color={T.primaryDeep} strokeWidth={2.4} />
          </View>

          <Button
            label={trigger.cta}
            onPress={handleUpgrade}
            variant="black"
            fullWidth
            accessibilityHint="Abre a tela de assinatura Pro"
          />

          <ScalePress
            onPress={handleDismiss}
            accessible accessibilityRole="button"
            accessibilityLabel="Talvez mais tarde"
            style={s.ghost}
          >
            <Text style={[s.ghostLabel, { color: T.ink3 }]}>Talvez mais tarde</Text>
          </ScalePress>
        </View>
      )}
    </ModalShell>
  );
}

const s = StyleSheet.create({
  body:       { alignItems: 'center', gap: 18 },
  heroIcon:   {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji:      { fontSize: 38 },
  subtitle:   {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 14, fontWeight: '500',
    lineHeight: 20, textAlign: 'center',
    marginBottom: 2,
  },
  pillWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghost:      { paddingVertical: 10 },
  ghostLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
});
