import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Card } from '@/components/ui/Card';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';
import { SupportSection } from '@/components/support/SupportSection';
import { openLegal } from '@/lib/legalLinks';
import { useTheme } from '@/hooks/useTheme';

interface AboutCardProps {
  onReplayTour: () => void;
}

/**
 * AboutCard Bold v3.
 *
 * Card branco com:
 *   • Logo + nome + URL marca
 *   • Versão do app (Constants.expoConfig.version)
 *   • Botão "Ver tour de boas-vindas"
 *   • SupportSection (legacy — useThemeColors interno, R-fase-7-3)
 *   • Links legais Termos + Privacidade (via openLegal)
 *   • Disclaimer veterinário (educativo)
 */
export const AboutCard = React.memo(function AboutCard({ onReplayTour }: AboutCardProps) {
  const T = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleLegal = (which: 'terms' | 'privacy') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openLegal(which);
  };

  return (
    <Card padding={20}>
      <View style={s.brandRow}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={s.logo}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logo CronoPet"
        />
        <View>
          <Text style={[s.brandName, { color: T.ink }]}>CronoPet</Text>
          <Text style={[s.brandUrl, { color: T.ink3 }]}>cronopet.app</Text>
        </View>
      </View>

      <Row T={T} label="Versão" value={version} />

      <ScalePress
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onReplayTour();
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Ver tour de boas-vindas novamente"
        accessibilityHint="Reabre o tutorial inicial"
        style={[s.row, s.tourRow]}
      >
        <Sparkles size={16} color={T.primary} strokeWidth={2.2} />
        <Text style={[s.tourLabel, { color: T.primary }]}>Ver tour de boas-vindas</Text>
        <ChevronRight size={16} color={T.ink4} strokeWidth={2.2} />
      </ScalePress>

      <View style={[s.divider, { backgroundColor: T.rule }]} />
      <SupportSection variant="full" />

      <View style={[s.divider, { backgroundColor: T.rule }]} />
      <Kicker>Documentos legais</Kicker>
      <View style={s.legalRow}>
        <ScalePress
          onPress={() => handleLegal('terms')}
          accessible
          accessibilityRole="link"
          accessibilityLabel="Abrir Termos de Uso"
          hitSlop={6}
        >
          <Text style={[s.legalLink, { color: T.primary }]}>Termos de Uso</Text>
        </ScalePress>
        <ScalePress
          onPress={() => handleLegal('privacy')}
          accessible
          accessibilityRole="link"
          accessibilityLabel="Abrir Política de Privacidade"
          hitSlop={6}
        >
          <Text style={[s.legalLink, { color: T.primary }]}>Política de Privacidade</Text>
        </ScalePress>
      </View>

      <Text style={[s.disclaimer, { color: T.ink3 }]}>
        O CronoPet é informativo e organizativo.{' '}
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold' }}>
          NÃO substitui consulta veterinária presencial.
        </Text>{' '}
        Decisões clínicas e nutricionais são de responsabilidade do tutor com
        médico-veterinário inscrito no CRMV.
      </Text>
    </Card>
  );
});

AboutCard.displayName = 'AboutCard';

// ─── Row ─────────────────────────────────────────────────────

function Row({ T, label, value }: { T: ReturnType<typeof useTheme>; label: string; value: string }) {
  return (
    <View style={s.divRow}>
      <View style={[s.divider, { backgroundColor: T.rule }]} />
      <View style={s.row}>
        <Text style={[s.rowLabel, { color: T.ink2 }]}>{label}</Text>
        <Text style={[s.rowValue, { color: T.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo:       { width: 44, height: 44, borderRadius: 12 },
  brandName:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 17, fontWeight: '800' },
  brandUrl:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 1 },
  divRow:     {},
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, fontWeight: '500' },
  rowValue:   { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
  divider:    { height: 1, marginVertical: 14 },
  tourRow:    { gap: 10 },
  tourLabel:  { flex: 1, fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
  legalRow:   { flexDirection: 'row', gap: 18, flexWrap: 'wrap', marginTop: 8 },
  legalLink:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', paddingVertical: 4 },
  disclaimer: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', lineHeight: 18, marginTop: 16 },
});
