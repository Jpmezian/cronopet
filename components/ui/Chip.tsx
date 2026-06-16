import React from 'react';
import { Text, StyleSheet, type ViewStyle } from 'react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface ChipProps {
  /** Texto curto (ex: nome de filtro). */
  label: string;
  /** Estado do filter pill. Default `false`. */
  selected?: boolean;
  /** Tap. Sem handler → comportamento de display only. */
  onPress?: () => void;
  /** Acessibilidade. Default deriva do label. */
  accessibilityLabel?: string;
  accessibilityHint?:  string;
  /** Estilo extra (margin, position). */
  style?: ViewStyle;
}

/**
 * Filter pill standalone (briefing 03 § Componentes). Stateless — caller
 * passa `selected` + `onPress`.
 *
 * Visual:
 *   • selected = `true`  → bg T.blk    + label T.onBlk   (alto contraste, "ativo")
 *   • selected = `false` → bg T.card   + label T.ink2 + border T.rule (sutil, neutro)
 *
 * Diferença vs `ChipGroup`:
 *   • Chip = filter pill INDEPENDENTE (Histórico tem N filtros que podem alternar individualmente)
 *   • ChipGroup = toggle group multi-state SHARED com Icon+label+sublabel (modal de registro)
 *
 * Hit target ≥ 44pt garantido por padding vertical + label height.
 */
export const Chip = React.memo(function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ChipProps) {
  const T = useTheme();

  const bg = selected ? T.blk    : T.card;
  const fg = selected ? T.onBlk  : T.ink2;
  const borderColor = selected ? T.blk : T.rule;

  return (
    <ScalePress
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor },
        style,
      ]}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.label, { color: fg, fontWeight: selected ? '700' : '600' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </ScalePress>
  );
});

Chip.displayName = 'Chip';

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:      999,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  label: {
    fontSize:   13,
    textAlign:  'center',
    letterSpacing: 0.2,
  },
});
