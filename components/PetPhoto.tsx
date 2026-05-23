/**
 * components/PetPhoto.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Avatar do pet com fallback estilizado quando não há foto.
 *
 * ANTES: o onboarding usava DEFAULT_FOTO = URL do Unsplash apontando
 * pra um RATO 🐀 (photo-1587300003388-59208cc962cb). Quem nunca tirou
 * foto via um rato como seu cachorro/gato na home. Catastrófico.
 *
 * AGORA: sem foto → ícone Lucide do tipo (Dog/Cat/PawPrint) sobre
 * círculo da cor da marca (Verdigris/Celadon). Zero dependência de
 * network, 100% on-brand, sempre apropriado.
 *
 * Pattern de uso (substitui Image direto):
 *   <PetPhoto foto={pet.foto} tipo={pet.tipo} size={96} />
 *
 * Se quiser mostrar inicial do nome em vez do ícone:
 *   <PetPhoto foto={pet.foto} tipo={pet.tipo} nome={pet.nome} size={96} />
 */

import React from 'react';
import { Image, View, Text } from 'react-native';
import { Dog, Cat, PawPrint } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolvePhotoUri } from '@/lib/photoPath';
import type { PetType } from '@/types/pet';

interface PetPhotoProps {
  foto?: string | null;
  tipo: PetType;
  /** Se passado, mostra inicial em vez do ícone Lucide no fallback. */
  nome?: string;
  /** Diâmetro em px (component é sempre quadrado, border-radius = size/2). */
  size: number;
  /** Override de estilo (ex: borderWidth). Mescla com defaults. */
  style?: object;
  /** A11y label custom. Default: "Foto de {nome}" ou "Avatar do pet". */
  accessibilityLabel?: string;
}

/**
 * Decide se o URI é "real" (vale renderizar com Image) ou se é
 * placeholder/vazio que deve cair no fallback.
 *
 * REJEITA explicitamente a URL antiga do Unsplash que apontava pra
 * rato — defesa em camadas pro caso de algum pet legado ter foto
 * com essa URL salva no MMKV.
 */
function isUsablePhoto(foto?: string | null): foto is string {
  if (!foto || typeof foto !== 'string') return false;
  const trimmed = foto.trim();
  if (trimmed.length === 0) return false;
  // Blacklist do rato — qualquer URL Unsplash com esse hash
  if (trimmed.includes('1587300003388-59208cc962cb')) return false;
  return true;
}

export function PetPhoto({
  foto, tipo, nome, size, style, accessibilityLabel,
}: PetPhotoProps) {
  const { actionTheme, brand, isDark } = useThemeColors();

  const radius = size / 2;
  const baseStyle = {
    width:        size,
    height:       size,
    borderRadius: radius,
  };

  if (isUsablePhoto(foto)) {
    return (
      <Image
        // resolvePhotoUri remonta a URI com o container UUID atual
        // (iOS muda em todo update — sem isso a foto some). Ver R3-1+4.
        source={{ uri: resolvePhotoUri(foto) }}
        style={[baseStyle, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? (nome ? `Foto de ${nome}` : 'Foto do pet')}
      />
    );
  }

  // Fallback: círculo color-coded por tipo + ícone Lucide central.
  // Cores da marca em vez de cinza genérico — sempre "se sente CronoPet".
  const fallbackBg = tipo === 'gato'
    ? actionTheme.xixi.bg          // tom roxo suave pra gato
    : tipo === 'outro'
    ? actionTheme.banho.bg         // tom azul suave pra "outro"
    : actionTheme.passeio.bg;      // tom verde suave pra cachorro

  const fallbackFg = tipo === 'gato'
    ? actionTheme.xixi.primary
    : tipo === 'outro'
    ? actionTheme.banho.primary
    : actionTheme.passeio.primary;

  const FallbackIcon = tipo === 'gato' ? Cat : tipo === 'cachorro' ? Dog : PawPrint;
  const iconSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        baseStyle,
        {
          backgroundColor: fallbackBg,
          borderWidth:     2,
          borderColor:     isDark ? brand.accent : fallbackFg,
          alignItems:      'center',
          justifyContent:  'center',
        },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ?? (nome ? `Avatar de ${nome}` : `Avatar do pet (${tipo})`)
      }
    >
      {nome && nome.trim().length > 0 ? (
        <Text
          style={{
            fontSize:   Math.round(size * 0.40),
            fontWeight: '700',
            color:      fallbackFg,
            fontFamily: 'Nunito_800ExtraBold',
          }}
          importantForAccessibility="no"
        >
          {nome.trim().charAt(0).toUpperCase()}
        </Text>
      ) : (
        <FallbackIcon size={iconSize} color={fallbackFg} strokeWidth={2} />
      )}
    </View>
  );
}
