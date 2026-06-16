import React from 'react';
import { View, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  /** Liga sombra warm-tonalizada (briefing 03). Default `true`. */
  shadow?: boolean;
  /** Padding interno. Default 20 (briefing 03 § Espaçamento). */
  padding?: number;
  /** Radius. Default 26 (briefing 03 § Raios). */
  radius?: number;
  /** Estilo extra (margin, position). NÃO sobrescreve bg/radius/sombra. */
  style?: ViewStyle;
}

/**
 * Card branco do sistema Bold v3.
 *
 * Diferenças vs. padrão inline atual (`#000 0/2 0.06/8`):
 *   • Sombra warm-tonalizada `rgba(52,46,34,0.06)` (briefing 03 § Sombras)
 *   • Sombra MAIS ALTA: `0 14px 30px` em vez de `0 2px 8px`
 *   • Radius 26 (vs 18 dos cards atuais)
 *
 * Componentes existentes seguem com sombra `#000` até migrarem por
 * tela (fases 1-7). Inconsistência visual temporária aceita (Q4 do
 * 00-README — OTA por fase).
 */
export const Card = React.memo(function Card({
  children,
  shadow = true,
  padding = 20,
  radius = 26,
  style,
}: CardProps) {
  const T = useTheme();

  // Sombra: warm-tonalizada `rgba(52,46,34,0.06)` no claro, `rgba(0,0,0,0.34)`
  // no escuro (T.shadow vem da definição em makeTheme).
  const shadowOpacity = T.isDark ? 0.34 : 0.06;
  const sh = shadow
    ? Platform.OS === 'android'
      ? { elevation: 3 }
      : {
          shadowColor:  `rgb(${T.shadow})`,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity,
          shadowRadius: 30,
        }
    : null;

  return (
    <View
      style={[
        {
          backgroundColor: T.card,
          borderRadius:    radius,
          padding,
        },
        sh,
        style,
      ]}
    >
      {children}
    </View>
  );
});

Card.displayName = 'Card';
