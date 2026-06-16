import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface KickerProps {
  /** Texto da label. Aplicado uppercase automaticamente. */
  children: string;
  /** Cor opcional. Default `T.ink3`. Útil pra accent (`T.primary` no
   *  eyebrow do TopBar da Home) — briefing 05 § 3.2. */
  color?: string;
  /** Estilo extra. NÃO sobrescreve fontSize/fontWeight/letterSpacing/
   *  textTransform — esses são canônicos pro Kicker. */
  style?: TextStyle;
}

/**
 * Eyebrow / label pequena Bold v3 (briefing 03 § Tipografia).
 *
 * Especificação:
 *   • Hanken 12 800 (Bricolage entra na 0d quando fontes carregarem)
 *   • UPPERCASE + letterSpacing +1
 *   • Cor padrão `T.ink3` (cinza-marrom suave)
 *
 * Os 10+ usos inline de `textTransform: 'uppercase'` atualmente no app
 * (PetHero, QuickStats, DailyProgress, etc) NÃO migram nesta sub-fase
 * — ficam até as fases 1-7 das telas respectivas (Q-G aprovada).
 */
export const Kicker = React.memo(function Kicker({
  children,
  color,
  style,
}: KickerProps) {
  const T = useTheme();
  const labelColor = color ?? T.ink3;

  return (
    <Text style={[{ color: labelColor }, KICKER_STYLE, style]}>
      {children}
    </Text>
  );
});

Kicker.displayName = 'Kicker';

const KICKER_STYLE: TextStyle = {
  fontSize:      12,
  fontWeight:    '800',
  letterSpacing: 1,
  textTransform: 'uppercase',
};
