import React from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface FABProps {
  onPress:           () => void;
  accessibilityLabel?: string;
  /** Posicionamento absoluto com bottom calculado pra ficar acima da
   *  FloatingTabBar (default: 12 safe-area + 58 bar + 14 gap). */
  bottomOffset?:     number;
  style?:            ViewStyle;
}

/**
 * FAB Bold v3 (Fase 8 — briefing 12 § FAB).
 *
 * Botão circular verdigris flutuante, canto inferior direito. Posição
 * matemática garante NÃO sobrepor a FloatingTabBar (12 + 58 + 14 = 84
 * acima do safe-area bottom).
 *
 * Sombra verdigris glow conforme briefing — `T.primary` rgb com alpha
 * 0.5. Aceito como exceção rgba pq é halo identitário da cor primária.
 *
 * Tap = onPress (caller decide o que abrir; geralmente QuickLogSheet).
 */
export function FAB({
  onPress,
  accessibilityLabel = 'Registrar rápido',
  bottomOffset,
  style,
}: FABProps) {
  const T = useTheme();
  const insets = useSafeAreaInsets();

  const bottom = bottomOffset ?? insets.bottom + 84;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[s.wrap, { bottom }, style]}
    >
      <ScalePress
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        scaleValue={0.92}
        style={[
          s.btn,
          {
            backgroundColor: T.primary,
            shadowColor:     T.primary,
          },
        ]}
      >
        <Plus size={26} color={T.onPrimary} strokeWidth={2.6} />
      </ScalePress>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right:    22,
  },
  btn: {
    width:           56,
    height:          56,
    borderRadius:    28,
    alignItems:      'center',
    justifyContent:  'center',
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.5,
    shadowRadius:    18,
    elevation:       Platform.OS === 'android' ? 10 : 0,
  },
});
