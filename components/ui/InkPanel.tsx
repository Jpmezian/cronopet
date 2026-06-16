import React from 'react';
import { View, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InkPanelProps {
  children: React.ReactNode;
  /** Radius do painel. Default 28 (briefing 03 § Raios). */
  radius?: number;
  /** Padding interno. Default 22 (briefing 03 § Espaçamento). */
  padding?: number;
  /** Estilo extra (margin, position). NÃO sobrescreve bg/radius/sombra. */
  style?: ViewStyle;
}

/**
 * Painel preto-grafite alto-contraste (briefing 03 § Sistema de design).
 *
 * Sombra mais forte que `Card` (`0 16px 36px` warm-tonalizada em claro,
 * `rgba(0,0,0,...)` em escuro). Usado pra TodayPanel (Home), StreakHero
 * (Histórico), AIGate (Saúde), CalorieHero (Nutrição), PremiumHero
 * (Premium).
 *
 * Conteúdo herda `T.onBlk` (cream) pra texto — caller usa tokens onBlk
 * via `useTheme()` nos filhos.
 */
export const InkPanel = React.memo(function InkPanel({
  children,
  radius = 28,
  padding = 22,
  style,
}: InkPanelProps) {
  const T = useTheme();

  // Sombra do briefing 03: 0 16px 36px rgba(shadow,0.18) claro,
  // mais opaca no escuro (rgba(0,0,0,0.34) por estar sobre bg dark).
  const shadowOpacity = T.isDark ? 0.34 : 0.18;
  const shadow = Platform.OS === 'android'
    ? { elevation: 6 }
    : {
        shadowColor:   `rgb(${T.shadow})`,
        shadowOffset:  { width: 0, height: 16 },
        shadowOpacity,
        shadowRadius:  36,
      };

  return (
    <View
      style={[
        {
          backgroundColor: T.blk,
          borderRadius:    radius,
          padding,
        },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
});

InkPanel.displayName = 'InkPanel';
