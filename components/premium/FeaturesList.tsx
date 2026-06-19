import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Stamp } from '@/components/ui/Stamp';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { StampGlyph } from '@/constants/stampGlyphs';

interface Feature {
  glyph:    StampGlyph;
  title:    string;
  desc:     string;
  /** Marca de transparência: feature em desenvolvimento. */
  pending?: boolean;
}

/**
 * Features REAIS do app — escolhidas pra match com gates verdadeiros
 * no código (R6 da investigação). Sem "Resposta em 24h", "Múltiplos
 * pets", "Histórico ilimitado" que ainda não têm gate funcional.
 *
 * Voz concreta, não "Unlock your potential" / "Boost productivity".
 */
const FEATURES: Feature[] = [
  {
    glyph: 'sparkle',
    title: 'Análise de saúde por padrões',
    desc:  'Insights dos últimos 30 dias, toda semana.',
    pending: true, // IA real ainda não chegou — placeholder visual ativo
  },
  {
    glyph: 'passeio',
    title: 'Família compartilhada',
    desc:  'Cada tutor vê quem fez o quê em tempo real.',
  },
  {
    glyph: 'comida',
    title: 'Insights de saúde completos',
    desc:  'Free vê o 1º insight. Pro vê a lista inteira.',
  },
  {
    glyph: 'agua',
    title: 'Lembretes inteligentes',
    desc:  'Vacina, consulta e re-engagement na hora certa.',
  },
];

/**
 * FeaturesList Bold v3 (briefing 10 § FeatureRow x4).
 *
 * Card branco com 4 rows separadas por T.rule. Cada row: Stamp tintL
 * (cor da ação) + título Bricolage 15 + descrição Hanken 12.5.
 *
 * Features em desenvolvimento ganham "(em breve)" no título — honesto
 * com user, não promete o que ainda não entrega.
 */
export const FeaturesList = React.memo(function FeaturesList() {
  const T = useTheme();

  return (
    <Card padding={20}>
      {FEATURES.map((f, i) => (
        <FeatureRow
          key={f.title}
          feature={f}
          isLast={i === FEATURES.length - 1}
          T={T}
        />
      ))}
    </Card>
  );
});

FeaturesList.displayName = 'FeaturesList';

// ─── Row ─────────────────────────────────────────────────────

function FeatureRow({ feature, isLast, T }: { feature: Feature; isLast: boolean; T: Theme }) {
  return (
    <View
      style={[
        s.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: T.rule },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        `${feature.title}${feature.pending ? ', em desenvolvimento' : ''}. ${feature.desc}`
      }
    >
      <Stamp glyph={feature.glyph} size="md" tint="tintL" />

      <View style={{ flex: 1 }}>
        <View style={s.titleRow}>
          <Text style={[s.title, { color: T.ink }]} numberOfLines={1}>
            {feature.title}
          </Text>
          {feature.pending && (
            <Text style={[s.pending, { color: T.ink4 }]}>(em breve)</Text>
          )}
        </View>
        <Text style={[s.desc, { color: T.ink3 }]} numberOfLines={2}>
          {feature.desc}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
  titleRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  title:      { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 15, letterSpacing: -0.3 },
  pending:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', fontStyle: 'italic' },
  desc:       { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, fontWeight: '500', marginTop: 1, lineHeight: 17 },
});
