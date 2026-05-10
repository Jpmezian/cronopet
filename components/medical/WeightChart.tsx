import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Polyline, Circle as SvgCircle, Line as SvgLine,
  Defs, LinearGradient, Stop, Path,
} from 'react-native-svg';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WeightEntry } from '@/types/pet';

interface WeightChartProps {
  entries: WeightEntry[];  // já ordenado por data ascendente (mais antigo → mais novo)
  maxPoints?: number;       // últimos N pontos (default 10)
}

const W = 296;     // 320 (largura útil) - 24 padding (vai dentro de card padding 16)
const H = 100;
const PAD_TOP = 12;
const PAD_BOTTOM = 6;
const PAD_LEFT = 4;
const PAD_RIGHT = 4;

export function WeightChart({ entries, maxPoints = 10 }: WeightChartProps) {
  const { colors, actionTheme } = useThemeColors();

  const data = useMemo(() => entries.slice(-maxPoints), [entries, maxPoints]);

  if (data.length === 0) return null;

  // Single point: no chart, just a friendly message
  if (data.length === 1) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
          Registre mais um peso para ver a evolução.
        </Text>
      </View>
    );
  }

  // Calcular range (com margem 5% pra não colar nas bordas)
  const values = data.map((e) => e.peso);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const pad = range * 0.15;
  const yMin = Math.max(0, minVal - pad);
  const yMax = maxVal + pad;
  const yRange = yMax - yMin || 1;

  // Coordenadas SVG
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const points = data.map((e, i) => {
    const x = PAD_LEFT + i * stepX;
    const y = PAD_TOP + chartH - ((e.peso - yMin) / yRange) * chartH;
    return { x, y, peso: e.peso };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Path da área hachurada (under-curve)
  const areaPath = (() => {
    if (points.length === 0) return '';
    const top = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const bottomRight = `L ${points[points.length - 1].x.toFixed(1)} ${(PAD_TOP + chartH).toFixed(1)}`;
    const bottomLeft = `L ${points[0].x.toFixed(1)} ${(PAD_TOP + chartH).toFixed(1)}`;
    return `${top} ${bottomRight} ${bottomLeft} Z`;
  })();

  // Linha de baseline (peso médio) opcional
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const avgY = PAD_TOP + chartH - ((avg - yMin) / yRange) * chartH;

  // Tendência
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  const pctDiff = first > 0 ? (diff / first) * 100 : 0;
  const trendLabel = (() => {
    if (Math.abs(pctDiff) < 1) return { icon: <Minus size={12} color={colors.textTertiary} strokeWidth={2.5} />, color: colors.textTertiary, text: 'Estável' };
    if (diff > 0) return { icon: <TrendingUp size={12} color={actionTheme.coco.primary} strokeWidth={2.5} />, color: actionTheme.coco.primary, text: `+${diff.toFixed(1)} kg` };
    return { icon: <TrendingDown size={12} color={actionTheme.passeio.primary} strokeWidth={2.5} />, color: actionTheme.passeio.primary, text: `${diff.toFixed(1)} kg` };
  })();

  const accentColor = actionTheme.xixi.primary;

  return (
    <View>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '600' }}>
          Evolução ({data.length} {data.length === 1 ? 'registro' : 'registros'})
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {trendLabel.icon}
          <Text style={{
            color: trendLabel.color, fontSize: 11, fontWeight: '700', marginLeft: 4,
          }}>
            {trendLabel.text}
          </Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.25} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Linha do peso médio (tracejada) */}
        <SvgLine
          x1={PAD_LEFT} y1={avgY} x2={W - PAD_RIGHT} y2={avgY}
          stroke={colors.border} strokeWidth={1} strokeDasharray="3,3"
        />

        {/* Área hachurada */}
        <Path d={areaPath} fill="url(#weightArea)" />

        {/* Polyline (linha do peso) */}
        <Polyline
          points={polylinePoints}
          stroke={accentColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <SvgCircle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isLast ? 4.5 : 3}
              fill={isLast ? accentColor : colors.bgCard}
              stroke={accentColor}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
          {data[0].peso.toFixed(1)} kg
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
          média {avg.toFixed(1)} kg
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '700' }}>
          {data[data.length - 1].peso.toFixed(1)} kg
        </Text>
      </View>
    </View>
  );
}
