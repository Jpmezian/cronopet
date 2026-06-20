import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { InkPanel } from '@/components/ui/InkPanel';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Stamp } from '@/components/ui/Stamp';
import { Kicker } from '@/components/ui/Kicker';
import type { ActionKey, PetType } from '@/types/pet';

import { dailyGoalsFor } from '@/constants/dailyGoals';

interface TodayPanelProps {
  todayCounts: Record<ActionKey, number>;
  petTipo:     PetType | undefined;
  /** Chamado UMA vez na transição incompleto → completo (mesma semântica
   *  do DailyProgress legacy — mantém callbacks downstream funcionando). */
  onFirstComplete?: () => void;
}

/**
 * TodayPanel Bold v3 (briefing 05 § 3.4) — substitui DailyProgress.
 *
 * Layout: InkPanel preto com ProgressRing (lg=120) à esquerda + título
 * Bricolage + selos das metas alinhados. Quando todas metas cumpridas:
 * título vira "Dia completo!", pulse spring + haptic success (uma vez só).
 */
export function TodayPanel({ todayCounts, petTipo, onFirstComplete }: TodayPanelProps) {
  const T = useTheme();
  const reducedMotion = useReducedMotion();

  const goals     = dailyGoalsFor(petTipo);
  const doneCount = goals.filter((k) => (todayCounts[k] ?? 0) > 0).length;
  const total     = goals.length;
  const progress  = total > 0 ? doneCount / total : 0;
  const allComplete = doneCount === total && total > 0;

  // Pulse na transição incompleto→completo
  const scale = useSharedValue(1);
  const wasComplete = useRef(false);
  useEffect(() => {
    if (allComplete && !wasComplete.current) {
      wasComplete.current = true;
      onFirstComplete?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!reducedMotion) {
        scale.value = withSequence(
          withSpring(1.015, { damping: 14, stiffness: 200 }),
          withSpring(1, { damping: 14, stiffness: 200 }),
        );
      }
    } else if (!allComplete && wasComplete.current) {
      wasComplete.current = false;
    }
  }, [allComplete, onFirstComplete, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <InkPanel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ProgressRing
            progress={progress}
            size="lg"
            color={T.mint}
            trackColor="rgba(255,255,255,0.10)"
          />
          <View style={{ flex: 1 }}>
            <Kicker color={T.onBlk}>{allComplete ? 'Hoje' : 'Metas de hoje'}</Kicker>
            <Text
              style={{
                fontFamily:    allComplete ? 'BricolageGrotesque_800ExtraBold' : 'BricolageGrotesque_700Bold',
                color:         T.onBlk,
                fontSize:      allComplete ? 24 : 21,
                fontWeight:    allComplete ? '800' : '700',
                letterSpacing: -0.6,
                marginTop:     4,
              }}
            >
              {allComplete
                ? 'Dia completo!'
                : doneCount === 0
                  ? 'Vamos começar'
                  : 'Dia em andamento'}
            </Text>
            <Text
              style={{
                fontFamily: 'HankenGrotesk_500Medium',
                color:      'rgba(243,239,226,0.7)',  // T.onBlk c/ alpha
                fontSize:   12,
                marginTop:  2,
              }}
            >
              {doneCount}/{total} concluídas
            </Text>
          </View>
        </View>

        {/* Selos das metas */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          {goals.map((key) => {
            const done = (todayCounts[key] ?? 0) > 0;
            return (
              <View key={key} style={{ alignItems: 'center', gap: 4 }}>
                <Stamp
                  glyph={key}
                  size="md"
                  tint={done ? 'solid' : 'tintD'}
                  dim={!done}
                />
                {done && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4, right: -4,
                      width: 18, height: 18, borderRadius: 9,
                      backgroundColor: T.mint,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: T.blk,
                    }}
                  >
                    <Text style={{ color: T.blk, fontSize: 10, fontWeight: '800', lineHeight: 11 }}>✓</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </InkPanel>
    </Animated.View>
  );
}
