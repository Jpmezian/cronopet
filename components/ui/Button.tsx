import React from 'react';
import {
  Text, ActivityIndicator, View, StyleSheet,
  type AccessibilityRole, type ViewStyle,
} from 'react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

// ─── Variantes da sub-fase 0b (Q-C f2) ───────────────────────
//
// Apenas 3 variantes nesta sub-fase: black (CTA padrão), primary
// (verdigris, accent forte) e mint (celadon, ação suave). Variantes
// `white` e `soft` entram na 0c quando aparecerem nas telas.

type Variant = 'black' | 'primary' | 'mint';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Spinner integrado + bloqueia o tap. (Q-C g — loading nativo.) */
  loading?: boolean;
  disabled?: boolean;
  /** `true` ocupa largura disponível do parent. Default `false`. */
  fullWidth?: boolean;

  // ── Acessibilidade ─────────────────────────────────────────
  accessibilityLabel?: string;
  accessibilityHint?:  string;
  accessibilityRole?:  AccessibilityRole;

  /** Estilo extra (margin, position). NÃO sobrescreve bg/radius. */
  style?: ViewStyle;
}

/**
 * Botão pill (radius 999) do sistema Bold v3.
 *
 * Press feedback via `ScalePress` (já existente — não duplica lógica).
 * Loading state nativo: spinner substitui o label e o tap é bloqueado.
 * Default acessível: `accessibilityRole='button'`.
 *
 * Visual:
 *   black   → bg T.blk        + label T.onBlk
 *   primary → bg T.primary    + label T.onPrimary
 *   mint    → bg T.mint       + label T.blk (contraste mint sobre claro)
 */
export const Button = React.memo(function Button({
  label,
  onPress,
  variant = 'black',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  style,
}: ButtonProps) {
  const T = useTheme();

  let bg: string;
  let fg: string;
  switch (variant) {
    case 'primary': bg = T.primary; fg = T.onPrimary; break;
    case 'mint':    bg = T.mint;    fg = T.blk;       break;
    case 'black':
    default:        bg = T.blk;     fg = T.onBlk;     break;
  }

  const isDisabled = disabled || loading;

  return (
    <ScalePress
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: bg },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        // Spinner mantém o tamanho do botão estável: label fica `visibility:hidden`
        // por baixo + ActivityIndicator absoluto centralizado.
        <View style={styles.loadingWrap}>
          <Text style={[styles.label, { color: fg, opacity: 0 }]}>{label}</Text>
          <ActivityIndicator style={StyleSheet.absoluteFill} color={fg} />
        </View>
      ) : (
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </ScalePress>
  );
});

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    borderRadius:      999,
    paddingHorizontal: 24,
    paddingVertical:   14,
    alignItems:        'center',
    justifyContent:    'center',
    // Hit target ≥ 44pt — paddingVertical 14 + label ~16-18 = 44+.
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    // Hanken Grotesk 15 700 (CTA briefing 03 § Escala tipográfica).
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize:   15,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign:  'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'center',
  },
});
