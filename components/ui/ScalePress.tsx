import React from 'react';
import {
  Pressable, StyleProp, ViewStyle, GestureResponderEvent,
  AccessibilityRole, AccessibilityState, Insets,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

interface ScalePressProps {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
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
 * Pressable com spring physics (Reanimated).
 * Respeita automaticamente a preferência de sistema "Reduzir Movimento":
 *   - reducedMotion OFF → scale bounce (spring)
 *   - reducedMotion ON  → feedback de opacidade simples (sem movimento)
 *
 * Aceita props de acessibilidade (accessibilityRole, accessibilityLabel, etc.)
 * que são repassadas ao Pressable nativo.
 */
export function ScalePress({
  onPress,
  onLongPress,
  style,
  children,
  disabled = false,
  scaleValue = 0.96,
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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  const handlePressIn = () => {
    if (reducedMotion) {
      opacity.value = withTiming(0.6, { duration: 100 });
    } else {
      scale.value = withSpring(scaleValue, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? (disabled ? { disabled: true } : undefined)}
    >
      <Animated.View style={[animStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
