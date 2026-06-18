import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Scale } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { DeltaIndicator } from '@/components/history/DeltaIndicator';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { WeightEntry } from '@/types/pet';

interface WeightCardProps {
  latestKg:         number | null;
  weightDelta:      number;
  series:           WeightEntry[];
  latestDate:       string | null;
  onRegister:       () => void;
  /** Tap no card todo (peso + chart) — abre lista detalhada futura. */
  onPress?:         () => void;
}

/**
 * WeightCard Bold v3 (briefing 08 § WeightCard + WeightChart inline).
 *
 * Header: peso atual Bricolage 40 + "kg" + Pill "Saudável" (heurística
 * futura — por ora fixa). Chart SVG line+area abaixo. Footer com data
 * + DeltaIndicator (componente reusado da Fase 3).
 *
 * Empty state: ícone Scale + título + Button "Registrar peso" → modal
 * existente em medical.tsx.
 *
 * Chart math: line + area com viewBox proporcional. Pontos com radius
 * variável (último ponto destacado). Pad de 0.4kg no min/max pra
 * respiro vertical.
 */
export const WeightCard = React.memo(function WeightCard({
  latestKg, weightDelta, series, latestDate, onRegister, onPress,
}: WeightCardProps) {
  const T = useTheme();

  if (latestKg === null || series.length === 0) {
    return <WeightEmpty T={T} onRegister={onRegister} />;
  }

  return (
    <ScalePress
      onPress={onPress ?? onRegister}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Peso atual ${latestKg.toLocaleString('pt-BR')} quilogramas. ${
        weightDelta === 0 ? 'Estável' : weightDelta > 0
          ? `Subiu ${weightDelta.toFixed(2)}` : `Caiu ${Math.abs(weightDelta).toFixed(2)}`
      } desde a medição anterior.`}
      accessibilityHint="Abre modal pra registrar novo peso"
    >
      <Card padding={20}>
        <View style={s.headerRow}>
          <View>
            <Text style={[s.kicker, { color: T.ink3 }]}>Peso atual</Text>
            <View style={s.numberRow}>
              <Text style={[s.bigNumber, { color: T.ink }]}>
                {latestKg.toLocaleString('pt-BR')}
              </Text>
              <Text style={[s.unit, { color: T.ink3 }]}>kg</Text>
            </View>
          </View>
          <Pill label="Saudável" tone="success" />
        </View>

        {series.length > 1 && <WeightChart series={series} T={T} />}

        <View style={s.footer}>
          <Text style={[s.footerDate, { color: T.ink4 }]}>
            {latestDate ? `Registro de ${latestDate}` : ''}
          </Text>
          {series.length > 1 && <DeltaIndicator value={+(weightDelta).toFixed(1)} />}
        </View>
      </Card>
    </ScalePress>
  );
});

WeightCard.displayName = 'WeightCard';

// ─── Chart (inline) ──────────────────────────────────────────

const WeightChart = React.memo(function WeightChart({
  series, T,
}: { series: WeightEntry[]; T: Theme }) {
  const w = 300, h = 100, padX = 4, padY = 12;
  const kgs = series.map((d) => d.peso);
  const rawMin = Math.min(...kgs);
  const rawMax = Math.max(...kgs);
  // Pad floor de 0.4 — em série flat (todos iguais) evita divisão por zero
  const span = Math.max(rawMax - rawMin, 0.4);
  const min = rawMin - 0.2;
  const max = rawMin + span + 0.2;

  const pts = series.map((d, i) => {
    const x = padX + (i / Math.max(series.length - 1, 1)) * (w - padX * 2);
    const y = padY + (1 - (d.peso - min) / (max - min)) * (h - padY * 2);
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const lastIdx = pts.length - 1;

  return (
    <View style={{ marginTop: 14 }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={T.primary} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={T.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#wgrad)" />
        <Path d={line} fill="none" stroke={T.primary} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <Circle
            key={i}
            cx={x}
            cy={y}
            r={i === lastIdx ? 5 : 2.4}
            fill={i === lastIdx ? T.primary : T.card}
            stroke={T.primary}
            strokeWidth={2.2}
          />
        ))}
      </Svg>
    </View>
  );
});

// ─── Empty state ─────────────────────────────────────────────

function WeightEmpty({ T, onRegister }: { T: Theme; onRegister: () => void }) {
  return (
    <Card padding={20}>
      <View style={s.emptyHeader}>
        <View style={[s.emptyIcon, { backgroundColor: T.surfaceTint }]}>
          <Scale size={22} color={T.ink2} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.emptyTitle, { color: T.ink }]}>Peso ainda não registrado</Text>
          <Text style={[s.emptySub, { color: T.ink2 }]}>
            Acompanhe a evolução pra ajustar nutrição e detectar alterações cedo.
          </Text>
        </View>
      </View>
      <Button
        label="Registrar peso"
        onPress={onRegister}
        variant="black"
        fullWidth
        style={{ marginTop: 14 }}
        accessibilityHint="Abre o modal de registro de peso"
      />
    </Card>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kicker:     { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  numberRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 3 },
  bigNumber:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 40, letterSpacing: -1.4 },
  unit:       { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, fontWeight: '500' },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  footerDate: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  emptyHeader:{ flexDirection: 'row', gap: 14, alignItems: 'center' },
  emptyIcon:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyTitle: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  emptySub:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
