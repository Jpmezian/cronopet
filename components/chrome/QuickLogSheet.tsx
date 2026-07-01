import React, { useCallback } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, Platform,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { Stamp } from '@/components/ui/Stamp';
import { Kicker } from '@/components/ui/Kicker';
import { useTheme } from '@/hooks/useTheme';
import { usePetStore } from '@/store/usePetStore';
import { useToastStore } from '@/store/useToastStore';
import type { ActionKey, PetType } from '@/types/pet';

interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Long-press num Stamp abre o sheet de especificar quantidade/detalhes. */
  onSpecify?: (key: ActionKey) => void;
}

const ACTIONS_DOG: ActionKey[]   = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho', 'tosa'];
const ACTIONS_CAT: ActionKey[]   = ['comida', 'agua', 'xixi', 'coco', 'banho', 'tosa'];

const LABEL: Record<ActionKey, string> = {
  comida:  'Comida',
  agua:    'Água',
  passeio: 'Passeio',
  xixi:    'Xixi',
  coco:    'Cocô',
  banho:   'Banho',
  tosa:    'Tosa',
};

function actionsFor(tipo: PetType | undefined): ActionKey[] {
  return tipo === 'gato' ? ACTIONS_CAT : ACTIONS_DOG;
}

/**
 * QuickLogSheet Bold v3 (Fase 8 — briefing 12 § QuickLogSheet).
 *
 * Bottom sheet com grid de Stamps das ações tracked. Tap registra +
 * dismiss + toast. SEM dep nova (`@gorhom/bottom-sheet`) — usa Modal
 * nativo + Reanimated SlideInDown (padrão NotificationAskSheet).
 *
 * Snap altura: auto (conteúdo + safe area). Backdrop dim T.blk @ 35%.
 *
 * Gato esconde "passeio" (consistência com RegisterStrip da Home).
 */
export function QuickLogSheet({ visible, onClose, onSpecify }: QuickLogSheetProps) {
  const T = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();

  const petTipo  = usePetStore((s) => s.pet.tipo);
  const petNome  = usePetStore((s) => s.pet.nome);
  const addActionLog = usePetStore((s) => s.addActionLog);
  const showToast = useToastStore((s) => s.showToast);

  const actions = actionsFor(petTipo);

  const handleTap = useCallback(async (key: ActionKey) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addActionLog(key);
    showToast('success', `${LABEL[key]} registrada`);
    onClose();
  }, [addActionLog, showToast, onClose]);

  const enter = reduced ? FadeIn.duration(180) : SlideInDown.springify().damping(22).stiffness(260);
  const exit  = reduced ? FadeOut.duration(160) : SlideOutDown.duration(220);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Fechar"
        style={[s.backdrop, { backgroundColor: 'rgba(28,25,23,0.45)' }]}
      />
      <Animated.View
        entering={enter}
        exiting={exit}
        style={[
          s.sheet,
          {
            backgroundColor: T.card,
            paddingBottom:   insets.bottom + 20,
            shadowColor:     `rgb(${T.shadow})`,
            shadowOpacity:   T.isDark ? 0.4 : 0.22,
          },
        ]}
      >
        <View style={[s.handle, { backgroundColor: T.rule }]} />

        <Kicker style={{ marginTop: 12 }}>{`Registrar pra ${petNome || 'seu pet'}`}</Kicker>

        <View style={s.grid}>
          {actions.map((key) => (
            <ScalePress
              key={key}
              onPress={() => handleTap(key)}
              onLongPress={onSpecify ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSpecify(key);
              } : undefined}
              delayLongPress={280}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Registrar ${LABEL[key]}`}
              accessibilityHint={onSpecify
                ? `Toque pra registrar ${LABEL[key].toLowerCase()}. Segure pra informar quantidade.`
                : `Registra uma ${LABEL[key].toLowerCase()} e fecha o painel`}
              style={s.cell}
              scaleValue={0.94}
            >
              <Stamp glyph={key} size="lg" tint="tintL" />
              <Text style={[s.label, { color: T.ink }]}>{LABEL[key]}</Text>
            </ScalePress>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { flex: 1 },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop:      8,
    shadowOffset:    { width: 0, height: -8 },
    shadowRadius:    24,
    elevation:       Platform.OS === 'android' ? 12 : 0,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           14,
    marginTop:     16,
    justifyContent: 'flex-start',
  },
  cell: {
    width:      '22%',
    minWidth:   72,
    alignItems: 'center',
    gap:        6,
    paddingVertical: 4,
  },
  label: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize:   12,
    fontWeight: '700',
  },
});
