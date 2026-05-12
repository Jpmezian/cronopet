import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

// ─── Dimensões fixas 9:16 ─────────────────────────────────────
// Em dispositivo @3x, captureRef gera 1080×1920 nativamente
const CARD_W = 360;
const CARD_H = 640;

const MILESTONE_EMOJI: Record<number, string> = {
  7:   '🏆',
  30:  '🌟',
  100: '👑',
};

interface SocialCardViewProps {
  petNome:   string;
  petFoto:   string;
  milestone: number;
  streak:    number;
}

export const SocialCardView = forwardRef<View, SocialCardViewProps>(
  ({ petNome, petFoto, milestone, streak }, ref) => {
    const emoji = MILESTONE_EMOJI[milestone] ?? '🔥';
    const hasFoto = !!petFoto;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ width: CARD_W, height: CARD_H, overflow: 'hidden' }}
      >
        {/* Background: foto do pet ou cor sólida emerald */}
        {hasFoto ? (
          <Image
            source={{ uri: petFoto }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#047857' }]} />
        )}

        {/* Gradient overlay via SVG — escurece topo e fundo */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={CARD_W} height={CARD_H}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"    stopColor="#000000" stopOpacity={0.55} />
                <Stop offset="0.38" stopColor="#000000" stopOpacity={0.18} />
                <Stop offset="0.62" stopColor="#000000" stopOpacity={0.18} />
                <Stop offset="1"    stopColor="#000000" stopOpacity={0.72} />
              </LinearGradient>
            </Defs>
            <Rect width={CARD_W} height={CARD_H} fill="url(#grad)" />
          </Svg>
        </View>

        {/* Conteúdo central */}
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 36,
          paddingBottom: 88,
          paddingTop: 48,
        }}>
          {/* Foto circular do pet */}
          <View style={{
            width: 148, height: 148, borderRadius: 74,
            borderWidth: 4, borderColor: '#04A29B',
            overflow: 'hidden', marginBottom: 24,
            backgroundColor: '#047857',
          }}>
            {hasFoto && (
              <Image source={{ uri: petFoto }} style={{ width: 148, height: 148 }} resizeMode="cover" />
            )}
          </View>

          {/* Emoji do marco */}
          <Text style={{ fontSize: 60, marginBottom: 4 }}>{emoji}</Text>

          {/* Número de dias */}
          <Text style={{
            fontSize: 76, fontFamily: 'Nunito_800ExtraBold',
            color: '#ffffff', fontWeight: '800', lineHeight: 84,
          }}>
            {streak}
          </Text>
          <Text style={{
            fontSize: 22, color: 'rgba(255,255,255,0.88)',
            fontWeight: '600', marginBottom: 20,
          }}>
            dias ininterruptos
          </Text>

          {/* Nome do pet */}
          <Text style={{
            fontSize: 24, fontFamily: 'Nunito_700Bold',
            color: '#ffffff', fontWeight: '700',
            textAlign: 'center', lineHeight: 30,
          }}>
            cuidando do {petNome}! 🐾
          </Text>
        </View>

        {/* Branding footer */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingBottom: 36, alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#04A29B',
            borderRadius: 26,
            paddingHorizontal: 22, paddingVertical: 12,
          }}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>🐾</Text>
            <View>
              <Text style={{
                color: '#2C2B27', fontFamily: 'Nunito_800ExtraBold',
                fontSize: 15, fontWeight: '800',
              }}>
                CronoPet
              </Text>
              <Text style={{
                color: '#2C2B27', fontSize: 10, fontWeight: '700', opacity: 0.75,
              }}>
                cronopet.app
              </Text>
            </View>
          </View>
          <Text style={{
            color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600',
            marginTop: 8, textAlign: 'center',
          }}>
            Baixe grátis · Cuide melhor do seu pet
          </Text>
        </View>
      </View>
    );
  },
);

SocialCardView.displayName = 'SocialCardView';
