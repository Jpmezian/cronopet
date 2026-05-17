import React from 'react';
import { View, Text, Image, Platform, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pencil, Flame } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';

const BRAND_PRIMARY = '#04A29B';

interface PetHeroProps {
  nome:       string;
  foto:       string;
  raca?:      string;
  idadeLabel?: string;  // ex: "2 anos"
  streak:     number;
}

export function PetHero({ nome, foto, raca, idadeLabel, streak }: PetHeroProps) {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();

  const subtitle = [
    raca && raca !== 'Sem raça definida' ? raca : null,
    idadeLabel,
  ].filter(Boolean).join(' · ');

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      overflow: 'hidden',
      ...(Platform.OS === 'android' ? { elevation: 4 } : {
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 12,
      }),
    }}>
      {/* Foto do pet */}
      <Image
        source={{ uri: foto }}
        style={{ width: '100%', height: 220 }}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Foto de ${nome}`}
      />

      {/* Gradient overlay no bottom para legibilidade do texto */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor="rgba(0,0,0,0)"   />
              <Stop offset="0.4" stopColor="rgba(0,0,0,0.4)" />
              <Stop offset="1"   stopColor="rgba(0,0,0,0.85)" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroGrad)" />
        </Svg>
      </View>

      {/* Streak badge (top-right) — ícone Lucide Flame em coral, sem emoji */}
      <View style={{
        position: 'absolute', top: 14, right: 14,
        backgroundColor: 'rgba(28,25,23,0.72)',
        borderWidth: 1, borderColor: 'rgba(231,139,115,0.55)',
        borderRadius: 999,
        paddingHorizontal: 11, paddingVertical: 6,
        flexDirection: 'row', alignItems: 'center',
        gap: 5,
      }}>
        <Flame size={14} strokeWidth={2.4} color="#E78B73" fill="rgba(231,139,115,0.35)" />
        <Text style={{
          color: '#FFFEF8',
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 13, fontWeight: '800',
        }}>
          {streak}
        </Text>
        <Text style={{
          color: 'rgba(255,254,248,0.7)',
          fontSize: 11, fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
          {streak === 1 ? 'dia' : 'dias'}
        </Text>
      </View>

      {/* Info overlay (bottom-left) */}
      <View style={{
        position: 'absolute',
        bottom: 16, left: 18, right: 70,
      }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#ffffff',
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 24, fontWeight: '800',
            lineHeight: 28,
          }}
        >
          {nome}
        </Text>
        {!!subtitle && (
          <Text
            numberOfLines={1}
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12, fontWeight: '500',
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Editar button (bottom-right) */}
      <ScalePress
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/edit-profile');
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Editar perfil de ${nome}`}
        style={{
          position: 'absolute', bottom: 14, right: 14,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 14,
          paddingHorizontal: 11, paddingVertical: 7,
          flexDirection: 'row', alignItems: 'center',
        }}
      >
        <Pencil size={12} color="#2C2B27" strokeWidth={2.5} />
        <Text style={{
          color: '#2C2B27', fontWeight: '700',
          fontSize: 12, marginLeft: 4,
        }}>
          Editar
        </Text>
      </ScalePress>
    </View>
  );
}
