import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { InkPanel } from '@/components/ui/InkPanel';
import { Pill } from '@/components/ui/Pill';
import { STAMP_GLYPHS } from '@/constants/stampGlyphs';
import { useTheme } from '@/hooks/useTheme';

interface PremiumHeroProps {
  petNome: string;
}

/**
 * PremiumHero Bold v3 (briefing 10 § PremiumHero).
 *
 * InkPanel preto com pata mint marca d'água no canto inferior direito
 * (opacity 0.12, rotacionada 12deg). Pill "Pro" mint no topo. Título
 * grande "Cuidar fica ainda mais fácil" + value prop honesta.
 *
 * Voz: "O grátis já dá conta do essencial. O Pro entra quando você
 * quer mais memória e mais gente cuidando junto." — concreta, não
 * "Unlock your potential" genérico.
 *
 * SvgXml direto pra pata watermark com cor mint custom (Stamp não
 * aceita fg custom — vide R3 Fase 3).
 */
export const PremiumHero = React.memo(function PremiumHero({ petNome }: PremiumHeroProps) {
  const T = useTheme();

  const pawXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${T.mint}">${STAMP_GLYPHS.passeio.replace(/__FG__/g, T.mint)}</svg>`;

  return (
    <InkPanel padding={24} radius={28}>
      <View style={s.watermark} pointerEvents="none">
        <SvgXml xml={pawXml} width={180} height={180} />
      </View>

      <View style={s.content}>
        <Pill label="Pro" tone="pro" />

        <Text
          style={[s.title, { color: T.onBlk }]}
          accessibilityRole="header"
        >
          Cuidar fica{'\n'}ainda mais fácil
        </Text>

        <Text style={[s.subtitle, { color: 'rgba(246,244,234,0.72)' }]}>
          O grátis já dá conta do essencial. O Pro entra quando você quer mais
          memória e mais gente cuidando do {petNome || 'pet'} junto.
        </Text>
      </View>
    </InkPanel>
  );
});

PremiumHero.displayName = 'PremiumHero';

const s = StyleSheet.create({
  watermark: {
    position:  'absolute',
    right:     -28,
    bottom:    -36,
    opacity:   0.12,
    transform: [{ rotate: '12deg' }],
  },
  content:   { position: 'relative' },
  title:     {
    fontFamily:    'BricolageGrotesque_800ExtraBold',
    fontWeight:    '800',
    fontSize:      28,
    letterSpacing: -1,
    lineHeight:    30,
    marginTop:     14,
  },
  subtitle:  {
    fontFamily:  'HankenGrotesk_500Medium',
    fontSize:    13.5,
    fontWeight:  '500',
    lineHeight:  19,
    marginTop:   11,
    maxWidth:    280,
  },
});
