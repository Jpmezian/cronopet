import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Image, Modal,
  Pressable, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { EmptyState } from '@/components/ui/EmptyState';
import { resolvePhotoUri } from '@/lib/photoPath';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { usePetStore } from '@/store/usePetStore';
import type { ActionLog, ActionKey } from '@/types/pet';

const ACTION_LABELS: Record<ActionKey, string> = {
  comida: 'Comida', agua: 'Água', passeio: 'Passeio',
  xixi: 'Xixi', coco: 'Cocô', banho: 'Banho', tosa: 'Tosa',
};
// Emoji 💩 removido (R3-6): cocô usa <ActionIcon/> SVG na badge.
// Pra outras ações o emoji continua sendo identidade de marca.
const NON_COCO_EMOJI: Record<Exclude<ActionKey, 'coco'>, string> = {
  comida: '🍖', agua: '💧', passeio: '🐾',
  xixi: '🪣', banho: '🛁', tosa: '✂️',
};

// Formata timestamp em "DD/MM • HH:MM"
function fmtTs(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} · ${hour}:${min}`;
}

// Formata data "DD de Mês"
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtDateLong(ts: number): string {
  const d = new Date(ts);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return 'Hoje';
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Ontem';
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export default function PhotosScreen() {
  const router = useRouter();
  const { colors, actionTheme } = useThemeColors();
  const pet = usePetStore((s) => s.pet);
  const actionHistory = usePetStore((s) => s.actionHistory);
  const medicalEvents = usePetStore((s) => s.medicalEvents);

  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; meta: string } | null>(null);

  // Reúne todas as fotos: actionLogs com photo + medicalEvents com photo
  const photos = useMemo(() => {
    const items: Array<{
      uri: string;
      ts: number;
      label: string;
      action?: ActionKey;   // só pra logs de ação (pra render <ActionIcon/>)
      emoji?: string;        // só pra eventos médicos OU ações não-cocô
    }> = [];
    actionHistory.forEach((l) => {
      if (l.photo) {
        items.push({
          uri: l.photo,
          ts: l.timestamp,
          label: ACTION_LABELS[l.key],
          // Pra cocô passamos action; pras outras, emoji nativo
          action: l.key,
          emoji: l.key !== 'coco' ? NON_COCO_EMOJI[l.key] : undefined,
        });
      }
    });
    medicalEvents.forEach((e) => {
      if (e.photo) {
        items.push({
          uri: e.photo,
          ts: e.timestamp,
          label: 'Ocorrência',
          action: undefined,
          emoji: '🩺',
        });
      }
    });
    // Ordem: mais recente primeiro
    return items.sort((a, b) => b.ts - a.ts);
  }, [actionHistory, medicalEvents]);

  // Também inclui a foto do pet como primeira (se houver)
  const allPhotos = useMemo(() => {
    const list = [...photos];
    // Pet main photo não vai na galeria (é a foto de perfil, não log)
    return list;
  }, [photos]);

  // Agrupa por data
  const grouped = useMemo(() => {
    const byDate: Record<string, typeof allPhotos> = {};
    allPhotos.forEach((p) => {
      const key = fmtDateLong(p.ts);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(p);
    });
    return Object.entries(byDate);
  }, [allPhotos]);

  const screenW = Dimensions.get('window').width;
  const gap = 6;
  const paddingH = 16;
  const cols = 3;
  const thumbSize = (screenW - paddingH * 2 - gap * (cols - 1)) / cols;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12, paddingBottom: 8,
      }}>
        <ScalePress
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          accessible accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.bgCard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
        </ScalePress>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }}>
            GALERIA
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 20, fontWeight: '800',
              marginTop: 1,
            }}
          >
            Fotos do {pet.nome}
          </Text>
        </View>
        <Text style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: '600',
        }}>
          {allPhotos.length} {allPhotos.length === 1 ? 'foto' : 'fotos'}
        </Text>
      </View>

      {allPhotos.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center' }}>
          <EmptyState
            emoji="📷"
            title="Nenhuma foto ainda"
            subtitle={`Toda vez que registrar uma ação do ${pet.nome} com foto (ração, passeio, banho...), ela aparece aqui como uma linha do tempo visual.`}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: paddingH }}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map(([date, items]) => (
            <View key={date} style={{ marginTop: 16 }}>
              <Text style={{
                color: colors.textTertiary,
                fontSize: 11, fontWeight: '700',
                letterSpacing: 1, marginBottom: 8,
              }}>
                {date.toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {items.map((p, i) => (
                  <ScalePress
                    key={p.uri + i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPhoto({
                        uri: p.uri,
                        // Cocô não tem emoji (vira ActionIcon), só label
                        meta: p.emoji
                          ? `${p.emoji} ${p.label} · ${fmtTs(p.ts)}`
                          : `${p.label} · ${fmtTs(p.ts)}`,
                      });
                    }}
                    accessible accessibilityRole="imagebutton"
                    accessibilityLabel={`Foto: ${p.label} em ${fmtTs(p.ts)}`}
                    scaleValue={0.96}
                    style={{
                      width: thumbSize,
                      height: thumbSize,
                      marginRight: (i + 1) % cols === 0 ? 0 : gap,
                      marginBottom: gap,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: colors.bgCard,
                    }}
                  >
                    <Image
                      source={{ uri: resolvePhotoUri(p.uri) }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    <View style={{
                      position: 'absolute',
                      top: 4, left: 4,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      borderRadius: 6,
                      paddingHorizontal: 5, paddingVertical: 2,
                      alignItems: 'center', justifyContent: 'center',
                      minWidth: 22, minHeight: 22,
                    }}>
                      {p.action === 'coco' ? (
                        <ActionIcon action="coco" size={12} color="#FFFFFF" />
                      ) : (
                        <Text style={{ fontSize: 11 }}>{p.emoji}</Text>
                      )}
                    </View>
                  </ScalePress>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Lightbox */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable
          onPress={() => setSelectedPhoto(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selectedPhoto && (
            <>
              <Image
                source={{ uri: resolvePhotoUri(selectedPhoto.uri) }}
                style={{
                  width: Dimensions.get('window').width - 32,
                  height: Dimensions.get('window').width - 32,
                  borderRadius: 16,
                }}
                resizeMode="contain"
              />
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 24,
                paddingHorizontal: 16, paddingVertical: 8,
                marginTop: 16,
              }}>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                  {selectedPhoto.meta}
                </Text>
              </View>
              <ScalePress
                onPress={() => setSelectedPhoto(null)}
                accessible accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={{
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? 60 : 20,
                  right: 16,
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={20} color="#ffffff" strokeWidth={2.5} />
              </ScalePress>
            </>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
