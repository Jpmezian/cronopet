import React, { useMemo } from 'react';
import {
  Pressable, StyleProp, ViewStyle, GestureResponderEvent,
  AccessibilityRole, AccessibilityState, Insets, StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

interface ScalePressProps {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  /** ms até disparar onLongPress. Default nativo 500ms. */
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleValue?: number;
  /** Expande a área de toque sem mudar o tamanho visual.
   *  Use pra atingir 44×44pt em ícones pequenos (WCAG SC 2.5.8). */
  hitSlop?: Insets | number;

  // ── Acessibilidade ─────────────────────────────────────────
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

/**
 * Propriedades de LAYOUT que afetam dimensionamento/posição do elemento
 * dentro do parent. Precisam ir pro Pressable externo (que é o nó de
 * layout real) — não pro Animated.View interno (que só visual + transform).
 *
 * Bug fix 2026-05-25: antes, todo o style ia pro Animated.View. Quando
 * caller passava {flex: 1} esperando que 3 ScalePress em row tivessem
 * mesma largura, o Pressable externo crescia pelo CONTENT (intrinsic
 * size) — tamanhos desproporcionais. Agora dividimos: layout no
 * Pressable, visual no Animated.View.
 */
const LAYOUT_KEYS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'alignSelf',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'position', 'top', 'left', 'right', 'bottom',
  'zIndex',
]);

function splitStyle(style: StyleProp<ViewStyle>): {
  layout: ViewStyle;
  visual: ViewStyle;
} {
  const flat = StyleSheet.flatten(style) ?? {};
  const layout: Record<string, unknown> = {};
  const visual: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    const value = (flat as Record<string, unknown>)[key];
    if (LAYOUT_KEYS.has(key)) layout[key] = value;
    else visual[key] = value;
  }
  return { layout: layout as ViewStyle, visual: visual as ViewStyle };
}

/**
 * Pressable com spring physics (Reanimated).
 * Respeita automaticamente a preferência de sistema "Reduzir Movimento":
 *   - reducedMotion OFF → scale bounce (spring)
 *   - reducedMotion ON  → feedback de opacidade simples (sem movimento)
 *
 * Aceita props de acessibilidade (accessibilityRole, accessibilityLabel, etc.)
 * que são repassadas ao Pressable nativo.
 *
 * Style único é dividido automaticamente em layout (vai pro Pressable
 * externo) e visual (vai pro Animated.View interno). Garante que
 * propriedades como `flex: 1` funcionem corretamente quando vários
 * ScalePress estão em row.
 */
export function ScalePress({
  onPress,
  onLongPress,
  delayLongPress,
  style,
  children,
  disabled = false,
  scaleValue = 0.97,
  hitSlop,
  accessible,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ScalePressProps) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  // Memoiza pra evitar re-split a cada render
  const { layout, visual } = useMemo(() => splitStyle(style), [style]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  const handlePressIn = () => {
    if (reducedMotion) {
      opacity.value = withTiming(0.6, { duration: 100 });
    } else {
      scale.value = withSpring(scaleValue, { damping: 20, stiffness: 280 });
    }
  };

  const handlePressOut = () => {
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withSpring(1, { damping: 20, stiffness: 280 });
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[layout, { opacity: disabled ? 0.5 : 1 }]}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? (disabled ? { disabled: true } : undefined)}
    >
      <Animated.View style={[animStyle, visual]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
