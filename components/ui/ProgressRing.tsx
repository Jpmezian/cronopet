import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, withSpring,
  useReducedMotion, Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

// ─── Sizes pré-definidos (Q-B c2) ─────────────────────────────
const SIZE_PX = {
  sm: 64,
  md: 88,
  lg: 120,
} as const;

type Size = keyof typeof SIZE_PX;

interface ProgressRingProps {
  /** Progresso normalizado [0..1]. Clampado em runtime. */
  progress: number;
  /** Tamanho do ring. Default 'md' (88px). */
  size?: Size;
  /** Espessura do traço. Default 8 (briefing 04 § 3.5). */
  strokeWidth?: number;
  /** Cor do traço de progresso. Default `T.mint`. */
  color?: string;
  /** Cor do track (fundo). Default `T.surfaceTint`. */
  trackColor?: string;
  /** Animar fill de 0 → progress. Default `true`. `useReducedMotion`
   *  desliga automaticamente — vai direto pro valor final. */
  animated?: boolean;
  /** Estilo extra do wrapper (margin/position). */
  style?: ViewStyle;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Anel de progresso SVG. Usa `strokeDasharray` + `strokeDashoffset`
 * pra desenhar arco. Rotação `-90°` põe o 0% no topo (12h).
 *
 * Animação fill via Reanimated 4.x: `useSharedValue` controla offset,
 * `withSpring` no mount + `withTiming` em mudanças de `progress` durante
 * vida do componente.
 *
 * Demandas (do briefing):
 *   • Fase 1 Home (TodayPanel) — 80px sobre InkPanel (mint sobre blk)
 *   • Fase 5 Nutrição (CalorieHero) — 88px sobre InkPanel (mint sobre blk)
 *   • Fase 3 Histórico (WeekGoalsCard barras + opcional ring) — sm sobre card
 */
export const ProgressRing = React.memo(function ProgressRing({
  progress,
  size = 'md',
  strokeWidth = 8,
  color,
  trackColor,
  animated = true,
  style,
}: ProgressRingProps) {
  const T = useTheme();
  const reducedMotion = useReducedMotion();

  const px         = SIZE_PX[size];
  const radius     = (px - strokeWidth) / 2;
  const center     = px / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp [0..1]
  const target = Math.max(0, Math.min(1, progress));

  // Cor final resolvida (caller pode passar T.mint sobre InkPanel, etc.)
  const fg = color      ?? T.mint;
  const bg = trackColor ?? T.surfaceTint;

  // Shared value: dashoffset começa em `circumference` (vazio) e
  // anima até `circumference * (1 - target)` (cheio).
  const offset = useSharedValue(circumference);

  useEffect(() => {
    const finalOffset = circumference * (1 - target);
    if (!animated || reducedMotion) {
      offset.value = finalOffset;
      return;
    }
    // Mount → withSpring; mudanças subsequentes → withTiming (mais previsível)
    offset.value = withTiming(finalOffset, {
      duration: 320,
      easing: Easing.out(Easing.quad),
    });
  }, [target, animated, reducedMotion, circumference, offset]);

  // Spring de "boas-vindas" no mount (opcional — se animated)
  useEffect(() => {
    if (!animated || reducedMotion) return;
    offset.value = withSpring(circumference * (1 - target), {
      damping: 18, stiffness: 100,
    });
    // Mount-only — sem deps de target intencional pra não competir com o useEffect anterior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View style={[{ width: px, height: px }, style]}>
      <Svg width={px} height={px}>
        {/* Rotação -90° pra o arco começar em 12h (topo) */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* Track (fundo) */}
          <Circle
            cx={center} cy={center} r={radius}
            stroke={bg} strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Arco animado */}
          <AnimatedCircle
            cx={center} cy={center} r={radius}
            stroke={fg} strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}, ${circumference}`}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
    </View>
  );
});

ProgressRing.displayName = 'ProgressRing';
