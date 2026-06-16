import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─── Tones semantic (Q-E i) ──────────────────────────────────
type Tone = 'success' | 'warning' | 'info' | 'pro' | 'neutral';

interface PillProps {
  /** Texto curto (uppercase aplicado automaticamente). */
  label: string;
  /** Categoria semântica. Default 'neutral'. */
  tone?: Tone;
  /** Cor opcional do dot decorativo. Sem `dot` → sem dot. */
  dot?: string;
  /** Estilo extra (margin, position). */
  style?: ViewStyle;
}

/**
 * Pill — status pequeno com label uppercase. Tons fechados (semantic),
 * sem prop `color` custom (briefing: disciplina).
 *
 * Diferença vs `Chip`:
 *   • Pill é display only (não interativo)
 *   • Chip será filter toggle (ativo/inativo) — sub-fase 0c
 */
export const Pill = React.memo(function Pill({
  label,
  tone = 'neutral',
  dot,
  style,
}: PillProps) {
  const T = useTheme();

  // Tons mapeados pra tokens do Theme. Bg sempre tint suave do tom
  // (legibilidade contraste com texto).
  let bg: string;
  let fg: string;
  switch (tone) {
    case 'success':
      // Verde brand (verdigris + celadon)
      bg = T.mintSoft;
      fg = T.primaryDeep;
      break;
    case 'warning':
      // Amber semantic
      bg = T.isDark ? 'rgba(194,98,10,0.22)' : '#FBEAD2';
      fg = T.isDark ? '#FBBF24' : '#9A3412';
      break;
    case 'info':
      bg = T.mintSoft;
      fg = T.primaryDeep;
      break;
    case 'pro':
      // Pro = celadon sobre verdigris (briefing 03 § Status semântico)
      bg = T.mint;
      fg = T.blk;
      break;
    case 'neutral':
    default:
      bg = T.surfaceTint;
      fg = T.ink2;
      break;
  }

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      {!!dot && (
        <View
          style={[styles.dot, { backgroundColor: dot }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

Pill.displayName = 'Pill';

const styles = StyleSheet.create({
  base: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      999,
    alignSelf:         'flex-start',
    gap:               4,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  label: {
    fontSize:      11,
    fontWeight:    '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
