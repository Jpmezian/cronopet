import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface ToggleProps {
  value:        boolean;
  onValueChange: (v: boolean) => void;
  /** Acessibilidade — label do controle (ex: "Lembrete pós-inatividade"). */
  label:        string;
  /** Acessibilidade — hint adicional, opcional. */
  hint?:        string;
  disabled?:    boolean;
  style?:       ViewStyle;
}

/**
 * Toggle Bold v3 (briefing 11 § Toggle).
 *
 * Visual: trilho 50×30 radius 999 + knob 24×24. Animação `withTiming
 * 0.18s ease-out` no thumb translateX. Cores:
 *   • Ativo: trilho T.primary verdigris + knob branco
 *   • Inativo: trilho T.ruleSoft + knob branco
 *
 * Reduced Motion: pula animação, knob salta direto. Hit slop estendido
 * via ScalePress (já garantido pelo wrapper).
 *
 * Acessibilidade: role=switch + state.checked. Tap em qualquer lugar do
 * trilho dispara onValueChange (ScalePress preenche).
 */
export const Toggle = React.memo(function Toggle({
  value, onValueChange, label, hint, disabled, style,
}: ToggleProps) {
  const T = useTheme();
  const reduced = useReducedMotion();

  const TRACK_W = 50;
  const TRACK_H = 30;
  const KNOB_S  = 24;
  const PAD     = 3;
  const MAX_X   = TRACK_W - KNOB_S - PAD * 2;

  // Posição do knob (em px) — anima entre 0 e MAX_X
  const x = useSharedValue(value ? MAX_X : 0);

  React.useEffect(() => {
    x.value = reduced
      ? (value ? MAX_X : 0)
      : withTiming(value ? MAX_X : 0, { duration: 180 });
  }, [value, reduced, x, MAX_X]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <ScalePress
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[
        {
          width:           TRACK_W,
          height:          TRACK_H,
          borderRadius:    999,
          padding:         PAD,
          backgroundColor: value ? T.primary : T.ruleSoft,
          justifyContent:  'center',
          opacity:         disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width:           KNOB_S,
            height:          KNOB_S,
            borderRadius:    KNOB_S / 2,
            backgroundColor: '#FFFFFF',
          },
          knobStyle,
        ]}
      >
        <View />
      </Animated.View>
    </ScalePress>
  );
});

Toggle.displayName = 'Toggle';
