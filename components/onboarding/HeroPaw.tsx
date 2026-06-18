import React from 'react';
import { View } from 'react-native';
import { Stamp } from '@/components/ui/Stamp';
import { useTheme } from '@/hooks/useTheme';

/**
 * HeroPaw — Bold v3 (briefing 06 § Passo 1, Fase 2 visual-only refresh).
 *
 * Stamp da pata (glyph='passeio') size xl preto sobre disco surfaceTint.
 * No briefing original tinha foto pet rotacionada -12deg sobreposta —
 * mas no fluxo atual o user ainda NÃO cadastrou pet quando vê esse
 * hero, então mostramos só a pata (decisão CTO Q-foto: 'Avatar
 * genérico Stamp paw — sem foto').
 *
 * Substitui IllustrationWelcome (usado em steps 0=Welcome e 1=Auth).
 */
export function HeroPaw() {
  const T = useTheme();

  return (
    <View
      style={{
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: T.surfaceTint,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center',
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ilustração de pata"
    >
      <Stamp glyph="passeio" size="xl" tint="blk" />
    </View>
  );
}
