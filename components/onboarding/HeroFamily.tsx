import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/**
 * HeroFamily — Bold v3 (briefing 06 § Passo 3).
 *
 * 3 avatares 88px coloridos sobrepostos diagonais com iniciais
 * Bricolage 32 800 brancas. Cores: T.mint, T.beige, T.primary.
 * Iniciais são genéricas (placeholders — não coleta de dados ainda).
 *
 * Substitui IllustrationSetup (usado em step 3 PetProfile).
 */
const AVATAR_SIZE = 88;
const OVERLAP     = 22;  // quanto cada avatar sobrepõe o anterior

const AVATARS = [
  { initial: 'M', bgKey: 'mint' as const,    fg: '#1E1C17' },  // T.blk
  { initial: 'J', bgKey: 'beige' as const,   fg: '#1E1C17' },
  { initial: 'A', bgKey: 'primary' as const, fg: '#FFFFFF' },
];

export function HeroFamily() {
  const T = useTheme();

  // Mapping bgKey → cor real do theme (mantém ordem)
  const bgFor: Record<typeof AVATARS[number]['bgKey'], string> = {
    mint:    T.mint,
    beige:   T.beige,
    primary: T.primary,
  };

  const totalWidth = AVATAR_SIZE * AVATARS.length - OVERLAP * (AVATARS.length - 1);

  return (
    <View
      style={{
        width: 280, height: 280,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center',
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Três avatares de família sobrepostos"
    >
      {/* Disco surfaceTint atrás */}
      <View
        style={{
          position: 'absolute',
          width: 240, height: 240, borderRadius: 120,
          backgroundColor: T.surfaceTint,
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          width: totalWidth,
          height: AVATAR_SIZE,
          // Inclinação suave pra dar "ar de família"
          transform: [{ rotate: '-6deg' }],
        }}
      >
        {AVATARS.map((a, i) => (
          <View
            key={i}
            style={{
              width:  AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              backgroundColor: bgFor[a.bgKey],
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3,
              borderColor: T.surfaceTint,
              marginLeft: i === 0 ? 0 : -OVERLAP,
              // Inclinação alternada pra suavizar o conjunto
              transform: [{ rotate: `${(i - 1) * 4}deg` }],
            }}
          >
            <Text
              style={{
                fontFamily: 'BricolageGrotesque_800ExtraBold',
                fontSize: 32, fontWeight: '800',
                color: a.fg,
                letterSpacing: -0.5,
              }}
            >
              {a.initial}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
