import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { InkPanel } from '@/components/ui/InkPanel';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useTheme } from '@/hooks/useTheme';

interface AIGateProps {
  petNome: string;
}

/**
 * AIGate Bold v3 (briefing 08 § AIGate).
 *
 * Placeholder visual de paywall — sem chamada de IA real (decisão D1 da
 * investigação: IA seria semanas de prompt-engineering + custos). Mantém
 * a promessa de feature Pro e linka pro paywall existente.
 *
 * Composição: InkPanel preto com:
 *   • Eyebrow "Últimos 30 dias" + Pill "Pro"
 *   • Título "Análise de saúde de {nome}"
 *   • Preview text BORRADO (opacity 0.35 + letterSpacing 4) — vetorial
 *     stand-in pra blur real (BlurView seria 1 dep + permission ruído)
 *   • Cadeado Lock centralizado sobre o preview
 *   • Button mint "Desbloquear com o Pro" → /premium
 *   • Disclaimer LGPD "Nunca diagnostica — sempre consulte o veterinário"
 *     integrado (briefing pede + R-fase-4-5 do reporte: era no top do
 *     medical legacy, migra pra cá pra ficar perto da feature de IA).
 *
 * Cores documentadas: rgba(246,244,234,N) = T.onBlk com alpha. Padrão
 * Bold v3 sobre InkPanel já estabelecido no StreakHero (Fase 3).
 */
export const AIGate = React.memo(function AIGate({ petNome }: AIGateProps) {
  const T = useTheme();
  const router = useRouter();

  const handleUnlock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/premium', params: { source: 'health_aigate' } });
  };

  return (
    <InkPanel padding={20}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={[s.iconBox, { backgroundColor: T.mint }]}>
            <Sparkles size={20} color={T.blk} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.kicker, { color: 'rgba(246,244,234,0.55)' }]}>
              Últimos 30 dias
            </Text>
            <Text style={[s.title, { color: T.onBlk }]} numberOfLines={1}>
              Análise de saúde
            </Text>
          </View>
        </View>
        <Pill label="Pro" tone="pro" />
      </View>

      {/* Preview borrado + cadeado */}
      <View style={s.previewWrap}>
        <View style={s.previewBlur}>
          <Text style={[s.previewText, { color: T.onBlk }]}>
            {petNome ? `${petNome} manteve peso estável.` : 'Peso estável nas últimas semanas.'}
          </Text>
          <Text style={[s.previewText, { color: T.onBlk }]}>
            Consumo de água variou levemente — possivelmente clima.
          </Text>
          <Text style={[s.previewText, { color: T.onBlk }]}>
            Sugestão: reforçar hidratação nos próximos dias.
          </Text>
        </View>
        <View style={s.lockOverlay}>
          <View style={[s.lockCircle, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <Lock size={20} color={T.onBlk} strokeWidth={2.4} />
          </View>
        </View>
      </View>

      <Button
        label="Desbloquear com o Pro"
        onPress={handleUnlock}
        variant="mint"
        fullWidth
        style={{ marginTop: 18 }}
        accessibilityHint="Abre a tela de assinatura Pro"
      />

      <Text style={[s.disclaimer, { color: 'rgba(246,244,234,0.55)' }]}>
        Nunca diagnostica. Sempre consulte o veterinário.
      </Text>
    </InkPanel>
  );
});

AIGate.displayName = 'AIGate';

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  iconBox:     { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kicker:      { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  title:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 17, letterSpacing: -0.4 },
  previewWrap: { position: 'relative' },
  previewBlur: { opacity: 0.35 },
  previewText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', lineHeight: 19, letterSpacing: 4, marginBottom: 6 },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  lockCircle:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  disclaimer:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
