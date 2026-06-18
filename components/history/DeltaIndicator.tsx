import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

interface DeltaIndicatorProps {
  /** Delta numérico (count corrente - count anterior). 0 vira "estável". */
  value: number;
  /** Compact: omite o '+' do positivo (briefing 07 § TrendRow). */
  compact?: boolean;
}

/**
 * Delta semanal com ícone + número.
 *
 * Cores semânticas vêm de `ACTIONS_V3` — verde-passeio pra positivo,
 * laranja-comida pra negativo. Match com briefing 07 (#0E8C5A / #C2620A)
 * sem hardcode duplicado: esses valores SÃO as primaries dessas ações
 * no Bold v3, então reusamos os tokens.
 *
 * Reusa o padrão WeightChart (medical) — TrendingUp/Down com strokeWidth
 * grosso e número Hanken 12 800.
 */
export const DeltaIndicator = React.memo(function DeltaIndicator({
  value,
  compact = false,
}: DeltaIndicatorProps) {
  const T = useTheme();

  if (value === 0) {
    return (
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        accessible
        accessibilityLabel="Estável vs semana anterior"
      >
        <Minus size={13} color={T.ink3} strokeWidth={2.6} />
      </View>
    );
  }

  const up    = value > 0;
  const color = up
    ? ACTIONS_V3.passeio.primary  // #0E8C5A verdigris alto-contraste
    : ACTIONS_V3.comida.primary;  // #C2620A laranja queimado
  const Icon = up ? TrendingUp : TrendingDown;
  const sign = up && !compact ? '+' : '';

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
      accessible
      accessibilityLabel={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(value)} vs semana anterior`}
    >
      <Icon size={13} color={color} strokeWidth={2.8} />
      <Text
        style={{
          fontFamily:    'HankenGrotesk_800ExtraBold',
          fontSize:      12,
          fontWeight:    '800',
          color,
          letterSpacing: -0.1,
        }}
      >
        {sign}{value}
      </Text>
    </View>
  );
});

DeltaIndicator.displayName = 'DeltaIndicator';
