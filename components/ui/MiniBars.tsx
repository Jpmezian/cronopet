import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

interface MiniBarsProps {
  /** Valores das barras (eixo Y). Normalizados internamente pelo `max`
   *  fornecido ou pelo máximo do próprio array. */
  data: number[];
  /** Cor das barras preenchidas. Default `T.primary`. */
  color?: string;
  /** Altura do gráfico em pixels. Default 28. */
  height?: number;
  /** Largura total. Default 96. Barras + gaps dividem proporcionalmente. */
  width?: number;
  /** Valor máximo de normalização. Default `Math.max(...data)`. Útil
   *  pra fixar escala comparável entre vários MiniBars adjacentes. */
  max?: number;
  /** Estilo extra. */
  style?: ViewStyle;
}

/**
 * Mini gráfico de barras verticais (briefing 03 § Componentes).
 *
 * Usado em TrendsCard da Fase 3 Histórico — 7 barras = dias da semana,
 * cor da ação correspondente (água azul, comida laranja, etc).
 *
 * Quantidade prática: 7-14 barras. Acima disso, sobreposição visual.
 * `__DEV__` warning ajuda a sinalizar uso incorreto.
 *
 * Barras com valor zero ainda renderizam altura mínima (3px) pra dar
 * "ritmo" visual sem deixar gap completamente vazio.
 */
export const MiniBars = React.memo(function MiniBars({
  data,
  color,
  height = 28,
  width  = 96,
  max,
  style,
}: MiniBarsProps) {
  const T = useTheme();
  const fg = color ?? T.primary;

  if (__DEV__ && data.length > 14) {
    console.warn(
      `[MiniBars] data.length=${data.length} acima do limite prático 14. ` +
      `Considera agregar valores antes de passar.`,
    );
  }

  if (data.length === 0) {
    return <View style={[{ width, height }, style]} />;
  }

  // Normalização
  const peak     = max ?? Math.max(...data, 1);
  const safePeak = peak <= 0 ? 1 : peak;

  // Layout: barras ocupam 70% do espaço, gaps 30%
  const totalGapPx = width * 0.3;
  const totalBarPx = width - totalGapPx;
  const gapPx      = data.length > 1 ? totalGapPx / (data.length - 1) : 0;
  const barW       = totalBarPx / data.length;

  // Altura mínima visível pra valores zero
  const MIN_BAR_H = 3;

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        {data.map((value, i) => {
          const normalized = Math.max(0, value) / safePeak;
          const h = Math.max(MIN_BAR_H, normalized * height);
          const x = i * (barW + gapPx);
          const y = height - h;
          const opacity = value <= 0 ? 0.3 : 1;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              fill={fg}
              opacity={opacity}
            />
          );
        })}
      </Svg>
    </View>
  );
});

MiniBars.displayName = 'MiniBars';
