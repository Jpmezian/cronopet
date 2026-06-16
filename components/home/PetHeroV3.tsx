import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { resolvePhotoUri } from '@/lib/photoPath';
import type { PetType } from '@/types/pet';

interface PetHeroV3Props {
  nome:        string;
  foto?:       string;
  tipo?:       PetType;
  raca?:       string;
  idadeLabel?: string;          // ex: "3 anos"
  streak:      number;
  /** Total de pets do user. < 2 → dots não aparecem (briefing D3). */
  petsCount?:  number;
  /** Index do pet ativo na lista de pets (pra dot ativo). */
  activeIndex?: number;
  /** Tap em qualquer dot abre pet switcher. */
  onPressSwitcher?: () => void;
}

// ─── Fallback foto rato Unsplash (mesma lógica do PetHero legacy) ─
function isUsablePhoto(foto?: string | null): foto is string {
  if (!foto || typeof foto !== 'string') return false;
  const t = foto.trim();
  if (t.length === 0) return false;
  // Foto Unsplash do "rato" que veio como placeholder em build antiga
  if (t.includes('1587300003388-59208cc962cb')) return false;
  return true;
}

/**
 * PetHero Bold v3 (briefing 05 § 3.3).
 *
 * Layout:
 *   ┌── Card surfaceTint radius 30 padding 22 ─────────────────┐
 *   │ [🔥 pill preta streak]                                   │
 *   │                                                          │
 *   │ Mel                       ╭──────────╮                   │
 *   │ Bricolage 42 800 -1.6     │ foto 104 │                   │
 *   │                           │ anel mint│                   │
 *   │ [raça] [idade]            ╰──────────╯                   │
 *   │ pills brancas              ● ● ●  ← dots (>= 2 pets)     │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Coexiste com `PetHero.tsx` legacy (Fase 1a substitui no caller mas
 * legacy fica no repo até Fase 9 cleanup).
 */
export function PetHeroV3({
  nome, foto, tipo, raca, idadeLabel, streak,
  petsCount = 1, activeIndex = 0, onPressSwitcher,
}: PetHeroV3Props) {
  const T = useTheme();
  const hasPhoto = isUsablePhoto(foto);
  const showDots = petsCount > 1 && onPressSwitcher;

  const subtitlePills: string[] = [];
  if (raca && raca !== 'SRD' && raca !== 'Sem raça definida') subtitlePills.push(raca);
  else if (tipo === 'cachorro') subtitlePills.push('Cachorro');
  else if (tipo === 'gato') subtitlePills.push('Gato');
  if (idadeLabel) subtitlePills.push(idadeLabel);

  const onDots = () => {
    if (!onPressSwitcher) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressSwitcher();
  };

  return (
    <View style={[styles.card, { backgroundColor: T.surfaceTint }]}>
      {/* Streak pill preta */}
      {streak > 0 && (
        <View style={[styles.streakPill, { backgroundColor: T.blk }]}>
          <Text style={{ color: '#FF9D4D', fontSize: 14, marginRight: 4 }}>🔥</Text>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_700Bold',
              color: T.onBlk,
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
        </View>
      )}

      <View style={styles.contentRow}>
        {/* Coluna esquerda: nome + pills */}
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text
            style={{
              fontFamily: 'BricolageGrotesque_800ExtraBold',
              color: T.ink,
              fontSize: 42,
              fontWeight: '800',
              letterSpacing: -1.6,
              lineHeight: 46,
            }}
            numberOfLines={1}
          >
            {nome}
          </Text>

          {subtitlePills.length > 0 && (
            <View style={styles.pillsRow}>
              {subtitlePills.map((p, i) => (
                <View key={i} style={[styles.subtitlePill, { backgroundColor: T.card }]}>
                  <Text
                    style={{
                      fontFamily: 'HankenGrotesk_600SemiBold',
                      color: T.ink2,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Coluna direita: foto circular 104 com anel mint */}
        <View>
          <View style={[styles.photoRing, { backgroundColor: T.mint }]}>
            <View style={[styles.photoBorder, { borderColor: T.card }]}>
              {hasPhoto ? (
                <Image source={{ uri: resolvePhotoUri(foto) }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: T.ruleSoft }]}>
                  <Text style={{ color: T.ink3, fontSize: 32 }}>🐾</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dots troca pet */}
          {showDots && (
            <Pressable
              onPress={onDots}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Trocar de pet — ${petsCount} pets cadastrados`}
              style={styles.dotsRow}
            >
              {Array.from({ length: Math.min(petsCount, 5) }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: i === activeIndex ? T.blk : T.ruleSoft,
                  }}
                />
              ))}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const PHOTO_OUTER = 116;  // anel mint exterior (104 inner + 6 ring)
const PHOTO_INNER = 104;

const styles = StyleSheet.create({
  card: {
    borderRadius: 30,
    padding:      22,
    minHeight:    220,
  },
  streakPill: {
    alignSelf:        'flex-start',
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      999,
    marginBottom:      16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginTop:     12,
  },
  subtitlePill: {
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:      999,
  },
  photoRing: {
    width:        PHOTO_OUTER,
    height:       PHOTO_OUTER,
    borderRadius: PHOTO_OUTER / 2,
    alignItems:   'center',
    justifyContent:'center',
  },
  photoBorder: {
    width:        PHOTO_INNER,
    height:       PHOTO_INNER,
    borderRadius: PHOTO_INNER / 2,
    borderWidth:  3,
    overflow:     'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap:           6,
    alignSelf:     'center',
    marginTop:     10,
    paddingVertical: 4,
  },
});
