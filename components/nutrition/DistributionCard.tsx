import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import type { SlotShare } from '@/hooks/useNutritionData';

interface DistributionCardProps {
  distribution: SlotShare[];
  hasMeals:     boolean;
}

/**
 * DistributionCard Bold v3 (substitui MacrosCard do briefing 09).
 *
 * Briefing 09 pede "Composição macros" (proteína/gordura/carbo/fibra),
 * mas o app NÃO tem dados de macros — ActionLog só guarda gramas +
 * timestamp + nota livre. Fabricar percentuais hardcoded por tipo de
 * pet seria AI slop (números biológicos que não medem o pet real).
 *
 * Substituição honesta: composição POR SLOT do dia (manhã/almoço/
 * lanche/jantar). Real data do actionHistory, agrupado pelo hook.
 * Briefing intent "composição da rotina" preservado.
 *
 * Visual: 4 barras horizontais empilhadas com label + kcal + %. Bar
 * fill cor T.primary verdigris consistente. Track T.ruleSoft.
 *
 * Empty state se sem refeições: copy curto.
 */
export const DistributionCard = React.memo(function DistributionCard({
  distribution, hasMeals,
}: DistributionCardProps) {
  const T = useTheme();

  return (
    <Card padding={20}>
      <Text style={[s.title, { color: T.ink }]}>Distribuição do dia</Text>

      {!hasMeals ? (
        <Text style={[s.empty, { color: T.ink3 }]}>
          Registre refeições pra ver como o consumo se distribui ao longo do dia.
        </Text>
      ) : (
        <View style={s.rows}>
          {distribution.map((d) => {
            const pct = Math.round(d.ratio * 100);
            const filled = d.kcal > 0;
            return (
              <View key={d.slot} style={s.row}>
                <View style={s.head}>
                  <Text style={[s.slotLabel, { color: T.ink }]}>{d.label}</Text>
                  <Text style={[s.slotKcal, { color: T.ink2 }]}>
                    {d.kcal.toLocaleString('pt-BR')} kcal
                    <Text style={[s.slotPct, { color: T.ink4 }]}>  ·  {pct}%</Text>
                  </Text>
                </View>
                <View style={[s.track, { backgroundColor: T.ruleSoft }]}>
                  <View
                    style={{
                      width:           `${Math.max(filled ? 4 : 0, pct)}%`,
                      height:          '100%',
                      borderRadius:    999,
                      backgroundColor: filled ? T.primary : 'transparent',
                    }}
                    accessible
                    accessibilityLabel={`${d.label}: ${d.kcal} calorias, ${pct} por cento do dia`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {hasMeals && (
        <Text style={[s.footnote, { color: T.ink4 }]}>
          Slot pelo horário do registro. Cor verdigris = preenchido.{' '}
          <Text style={{ color: ACTIONS_V3.comida.primary }}>Macros</Text> não
          são monitorados (app só registra gramas).
        </Text>
      )}
    </Card>
  );
});

DistributionCard.displayName = 'DistributionCard';

const s = StyleSheet.create({
  title:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 18, letterSpacing: -0.4, marginBottom: 16 },
  rows:     { gap: 14 },
  row:      {},
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  slotLabel:{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
  slotKcal: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500' },
  slotPct:  { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800' },
  track:    { height: 8, borderRadius: 999, overflow: 'hidden' },
  empty:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  footnote: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', marginTop: 16, lineHeight: 15 },
});
