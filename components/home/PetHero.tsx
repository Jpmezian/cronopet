import React from 'react';
import { View, Text, Image, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pencil, Flame, Dog, Cat, PawPrint } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { ScalePress } from '@/components/ui/ScalePress';
import { resolvePhotoUri } from '@/lib/photoPath';
import type { PetType } from '@/types/pet';

interface PetHeroProps {
  nome:       string;
  foto:       string;
  tipo:       PetType;
  raca?:      string;
  idadeLabel?: string;  // ex: "2 anos"
  streak:     number;
}

/**
 * Decide se foto é real ou cai no fallback. Mesma lógica de
 * components/PetPhoto.ts — duplicada propositalmente pra evitar
 * import circular (PetHero não usa PetPhoto, semântica diferente:
 * PetHero é banner grande de fundo).
 */
function isUsablePhoto(foto?: string | null): foto is string {
  if (!foto || typeof foto !== 'string') return false;
  const t = foto.trim();
  if (t.length === 0) return false;
  if (t.includes('1587300003388-59208cc962cb')) return false; // rato Unsplash
  return true;
}

export function PetHero({ nome, foto, tipo, raca, idadeLabel, streak }: PetHeroProps) {
  const router = useRouter();
  const T = useTheme();
  const hasPhoto = isUsablePhoto(foto);

  const subtitle = [
    raca && raca !== 'Sem raça definida' ? raca : null,
    idadeLabel,
  ].filter(Boolean).join(' · ');

  // Fallback colors + icon por tipo (mesmo pattern do <PetPhoto/>)
  const fallbackBg = tipo === 'gato'
    ? ACTIONS_V3.xixi.tintL
    : tipo === 'outro'
    ? ACTIONS_V3.banho.tintL
    : ACTIONS_V3.passeio.tintL;
  const fallbackFg = tipo === 'gato'
    ? ACTIONS_V3.xixi.primary
    : tipo === 'outro'
    ? ACTIONS_V3.banho.primary
    : ACTIONS_V3.passeio.primary;
  const FallbackIcon = tipo === 'gato' ? Cat : tipo === 'cachorro' ? Dog : PawPrint;

  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: 24,
      overflow: 'hidden',
      ...(Platform.OS === 'android' ? { elevation: 4 } : {
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: T.isDark ? 0.3 : 0.08, shadowRadius: 12,
      }),
    }}>
      {/* Foto do pet — ou fallback estilizado quando não tem foto.
          ANTES: ficava um rato Unsplash quando usuário pulava a etapa.
          AGORA: banner color-coded por tipo + ícone Lucide gigante +
          inicial do nome. Sem dependência de network, sempre on-brand. */}
      {hasPhoto ? (
        <Image
          source={{ uri: resolvePhotoUri(foto) }}
          style={{ width: '100%', height: 280 }}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Foto de ${nome}`}
        />
      ) : (
        <View
          style={{
            width: '100%', height: 280,
            backgroundColor: fallbackBg,
            alignItems: 'center', justifyContent: 'center',
          }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Avatar de ${nome}`}
        >
          <FallbackIcon size={88} color={fallbackFg} strokeWidth={1.6} />
          {!!nome && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 38, fontWeight: '800',
                color: fallbackFg,
                fontFamily: 'Nunito_800ExtraBold',
                opacity: 0.85,
              }}
              importantForAccessibility="no"
            >
              {nome.trim().charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      )}

      {/* R4-1: gradient FULL-WIDTH removido. Reclamação repetida do
          TestFlight: "ainda tem barra preta grande". Agora cada
          elemento (nome+raça, streak, editar) tem o próprio chip com
          backdrop escuro SÓ atrás do conteúdo — a foto fica 100%
          visível. WCAG AA mantido pelo contraste do chip. */}

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

      {/* Info overlay (bottom-left) — chip com backdrop escuro pill
          em vez de gradient full-width. Cobre só o necessário pro
          texto branco passar AA. */}
      <View style={{
        position: 'absolute',
        bottom: 14, left: 14, right: 70,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        paddingHorizontal: 12, paddingVertical: 8,
        alignSelf: 'flex-start',
      }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#ffffff',
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 22, fontWeight: '800',
            lineHeight: 26,
          }}
        >
          {nome}
        </Text>
        {!!subtitle && (
          <Text
            numberOfLines={1}
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 12, fontWeight: '500',
              marginTop: 1,
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
