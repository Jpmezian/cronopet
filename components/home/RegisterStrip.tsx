import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { Stamp } from '@/components/ui/Stamp';
import { Kicker } from '@/components/ui/Kicker';
import { ACTION_LABEL } from '@/constants/actionIcons';
import { useToastStore } from '@/store/useToastStore';
import type { ActionKey, PetType } from '@/types/pet';

interface RegisterStripProps {
  todayCounts: Record<ActionKey, number>;
  petTipo:     PetType | undefined;
  /** Caller injeta o `addActionLog` do store. */
  onRegister:  (key: ActionKey) => void | Promise<void>;
  /** Long-press abre o sheet de especificar quantidade/detalhes. */
  onSpecify?:  (key: ActionKey) => void;
}

// Ordem das 7 ações no scroll (briefing 05 § 3.5)
const STRIP_ACTIONS: ActionKey[] = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho', 'tosa'];

/**
 * RegisterStrip Bold v3 (briefing 05 § 3.5) — substitui ActionButton grid.
 *
 * ScrollView horizontal com 7 selos 62×62. Tap = animação spring 1.16
 * + rotate -5° + haptic success + toast + registra via `onRegister`.
 *
 * Cat (gato) recebe stack das 7 mesmo — passeio fica disponível pra
 * registrar caso o tutor queira (decisão: não filtra como ActionButton
 * antigo fazia; Strip horizontal cabe todas).
 */
export function RegisterStrip({ todayCounts, petTipo, onRegister, onSpecify }: RegisterStripProps) {
  // Eslint warn: petTipo não usado — mantido na assinatura pra compat
  // futura caso queiramos esconder ações específicas. No-op pra agora.
  void petTipo;
  return (
    <View>
      <Kicker style={{ marginHorizontal: 20, marginBottom: 12 }}>
        REGISTRAR EM 1 TOQUE
      </Kicker>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 13 }}
      >
        {STRIP_ACTIONS.map((key) => (
          <StampButton
            key={key}
            actionKey={key}
            count={todayCounts[key] ?? 0}
            onRegister={onRegister}
            onSpecify={onSpecify}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Stamp tap com animação + badge ──────────────────────────

interface StampButtonProps {
  actionKey:  ActionKey;
  count:      number;
  onRegister: (key: ActionKey) => void | Promise<void>;
  onSpecify?: (key: ActionKey) => void;
}

function StampButton({ actionKey, count, onRegister, onSpecify }: StampButtonProps) {
  const T = useTheme();
  const showToast = useToastStore((s) => s.showToast);
  const reducedMotion = useReducedMotion();

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const handleTap = () => {
    if (!reducedMotion) {
      scale.value = withSequence(
        withSpring(1.06, { damping: 18, stiffness: 220 }),
        withSpring(1,    { damping: 20, stiffness: 220 }),
      );
      rotate.value = withSequence(
        withSpring(-2, { damping: 18, stiffness: 220 }),
        withSpring(0,  { damping: 20, stiffness: 220 }),
      );
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = onRegister(actionKey);
    if (result instanceof Promise) {
      result.catch(() => { /* caller já trata via Sentry — UI segue */ });
    }
    showToast('success', `${ACTION_LABEL[actionKey]} registrada`);
  };

  const handleLongPress = () => {
    if (!onSpecify) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSpecify(actionKey);
  };

  return (
    <Pressable
      onPress={handleTap}
      onLongPress={onSpecify ? handleLongPress : undefined}
      delayLongPress={280}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Registrar ${ACTION_LABEL[actionKey]}`}
      accessibilityHint={onSpecify
        ? (count > 0
            ? `Já registrado ${count} vezes hoje. Toque pra registrar, segure pra informar quantidade.`
            : 'Toque pra registrar. Segure pra informar quantidade.')
        : (count > 0 ? `Já registrado ${count} vezes hoje` : 'Não registrado hoje')}
      style={styles.button}
    >
      <Animated.View style={animStyle}>
        <Stamp glyph={actionKey} size="lg" tint="tintL" />
      </Animated.View>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: T.blk, borderColor: T.bg }]}>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_800ExtraBold',
              color:      T.onBlk,
              fontSize:   10,
              fontWeight: '800',
              lineHeight: 12,
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'relative' },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 999,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
});
