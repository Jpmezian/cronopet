import React, { useEffect, useRef, type ComponentType } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Utensils, Droplet, Footprints, Droplets, Bath, Scissors, Check,
} from 'lucide-react-native';
import { PoopIcon } from '@/components/icons/PoopIcon';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActionKey, PetType } from '@/types/pet';

import { dailyGoalsFor } from '@/constants/dailyGoals';

interface GoalIconProps { size?: number; color?: string; strokeWidth?: number }

const GOAL_META: Record<ActionKey, { Icon: ComponentType<GoalIconProps>; label: string }> = {
  comida:  { Icon: Utensils,   label: 'Comida'  },
  agua:    { Icon: Droplet,    label: 'Água'    },
  passeio: { Icon: Footprints, label: 'Passeio' },
  xixi:    { Icon: Droplets,   label: 'Xixi'    },
  coco:    { Icon: PoopIcon,   label: 'Cocô'    },
  banho:   { Icon: Bath,       label: 'Banho'   },
  tosa:    { Icon: Scissors,   label: 'Tosa'    },
};

// ─── Props ────────────────────────────────────────────────────

interface DailyProgressProps {
  todayCounts: Record<ActionKey, number>;
  petTipo: PetType | undefined;
  /** Chamado uma única vez quando a transição incompleto → completo ocorre */
  onFirstComplete?: () => void;
}

// ─── Componente ───────────────────────────────────────────────

export function DailyProgress({ todayCounts, petTipo, onFirstComplete }: DailyProgressProps) {
  const { colors, actionTheme } = useThemeColors();
  const isReducedMotion = useReducedMotion();

  const goals     = dailyGoalsFor(petTipo);
  const doneCount = goals.filter((key) => (todayCounts[key] ?? 0) > 0).length;
  const allComplete = doneCount === goals.length;

  // ── Animação de celebração ────────────────────────────────
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Inicializar com o estado atual para não disparar na primeira montagem
  const prevAllComplete = useRef(allComplete);

  useEffect(() => {
    if (allComplete && !prevAllComplete.current) {
      if (isReducedMotion) {
        // Sem scale: pisca a opacidade
        opacity.value = withSequence(
          withTiming(0.5, { duration: 120 }),
          withTiming(1,   { duration: 300 }),
        );
      } else {
        // Pulse suave com spring
        scale.value = withSequence(
          withTiming(1.04, { duration: 150 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
      }
      // Haptic separado do haptic do save (320ms de gap)
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 320);
      // Callback para o pai (ex: disparar soft ask de notificações)
      onFirstComplete?.();
    }
    prevAllComplete.current = allComplete;
  }, [allComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Metas de hoje. ${doneCount} de ${goals.length} concluídas.${allComplete ? ' Dia completo. Todas as metas atingidas.' : ''}`}
      style={[{
        backgroundColor: colors.bgCard,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8,
        }),
      }, containerStyle]}
    >

      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 15 }}>
          Metas de hoje
        </Text>
        <View style={{
          backgroundColor: allComplete ? actionTheme.passeio.bg : colors.bgInput,
          borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
        }}>
          {allComplete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Check size={14} strokeWidth={2.6} color={actionTheme.passeio.primary} />
              <Text style={{
                fontWeight: '700', fontSize: 12,
                color: actionTheme.passeio.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}>
                Completo
              </Text>
            </View>
          ) : (
            <Text style={{
              fontWeight: '700', fontSize: 12,
              color: colors.textTertiary,
            }}>
              {doneCount} de {goals.length}
            </Text>
          )}
        </View>
      </View>

      {/* Círculos conectados por linhas */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {goals.map((key, index) => {
          const done    = (todayCounts[key] ?? 0) > 0;
          const isLast  = index === goals.length - 1;
          const nextKey = !isLast ? goals[index + 1] : null;
          const nextDone = nextKey ? (todayCounts[nextKey] ?? 0) > 0 : false;
          const lineColored = done && nextDone;
          const meta    = GOAL_META[key];
          const theme   = actionTheme[key];

          return (
            <React.Fragment key={key}>
              {/* Nó — ícone Lucide com check overlay quando concluído */}
              <View style={{ alignItems: 'center', flex: 0 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: done ? theme.primary : colors.bgInput,
                  borderWidth: 2,
                  borderColor:    done ? theme.primary : colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <meta.Icon
                    size={20}
                    strokeWidth={2.2}
                    color={done ? '#FFFEF8' : colors.textTertiary}
                  />
                </View>
              </View>

              {/* Linha conectora */}
              {!isLast && (
                <View style={{
                  flex: 1, height: 3,
                  backgroundColor: lineColored ? actionTheme[goals[index + 1]!].border : colors.bgInput,
                  borderRadius: 2,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels alinhadas abaixo dos círculos */}
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {goals.map((key, index) => {
          const done  = (todayCounts[key] ?? 0) > 0;
          const isLast = index === goals.length - 1;
          const meta   = GOAL_META[key];
          const theme  = actionTheme[key];
          return (
            <React.Fragment key={key + '_label'}>
              <View style={{ width: 44, alignItems: 'center' }}>
                <Text style={{
                  fontSize: 11, fontWeight: '600',
                  color: done ? theme.primary : colors.textTertiary,
                  textAlign: 'center',
                }}>
                  {meta.label}
                </Text>
              </View>
              {!isLast && <View style={{ flex: 1 }} />}
            </React.Fragment>
          );
        })}
      </View>

    </Animated.View>
  );
}
