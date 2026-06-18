import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Stamp } from '@/components/ui/Stamp';
import { useTheme } from '@/hooks/useTheme';

/**
 * HeroFood — Bold v3 (briefing 06 § Passo 2).
 *
 * Stamp comida xl + anel tracejado preto envolvendo + Stamp check sm
 * sobreposto no canto inferior direito.
 *
 * Substitui IllustrationRoutine (usado em step 2 PetType).
 */
export function HeroFood() {
  const T = useTheme();

  const SIZE       = 280;
  const RADIUS     = 130;     // anel tracejado externo
  const STROKE     = 4;
  const DASH       = '8,8';

  return (
    <View
      style={{
        width: SIZE, height: SIZE,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center',
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Selo de comida com anel"
    >
      {/* Disco surfaceTint atrás */}
      <View
        style={{
          position: 'absolute',
          width:  SIZE - 40, height: SIZE - 40,
          borderRadius: (SIZE - 40) / 2,
          backgroundColor: T.surfaceTint,
        }}
      />

      {/* Anel tracejado preto (SVG) */}
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle
          cx={SIZE / 2} cy={SIZE / 2}
          r={RADIUS}
          stroke={T.blk}
          strokeWidth={STROKE}
          strokeDasharray={DASH}
          fill="none"
        />
      </Svg>

      {/* Stamp comida centralizado */}
      <Stamp glyph="comida" size="xl" tint="solid" />

      {/* Check overlay no canto inferior direito */}
      <View
        style={{
          position: 'absolute',
          right: 30, bottom: 30,
        }}
      >
        <Stamp glyph="check" size="sm" tint="blk" />
      </View>
    </View>
  );
}
