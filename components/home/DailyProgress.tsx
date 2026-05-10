import React, { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActionKey, PetType } from '@/types/pet';

// ─── Metas canônicas diárias ──────────────────────────────────

const GOALS_CACHORRO: ActionKey[] = ['comida', 'agua', 'passeio'];
const GOALS_GATO: ActionKey[]     = ['comida', 'agua'];

const GOAL_META: Record<ActionKey, { emoji: string; label: string }> = {
  comida:  { emoji: '🍖', label: 'Comida'  },
  agua:    { emoji: '💧', label: 'Água'    },
  passeio: { emoji: '🐾', label: 'Passeio' },
  xixi:    { emoji: '🪣', label: 'Xixi'    },
  coco:    { emoji: '💩', label: 'Cocô'    },
  banho:   { emoji: '🛁', label: 'Banho'   },
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

  const goals     = petTipo === 'gato' ? GOALS_GATO : GOALS_CACHORRO;
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
          <Text style={{
            fontWeight: '700', fontSize: 12,
            color: allComplete ? actionTheme.passeio.primary : colors.textTertiary,
          }}>
            {allComplete ? 'Completo 🏆' : `${doneCount} de ${goals.length}`}
          </Text>
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
              {/* Nó */}
              <View style={{ alignItems: 'center', flex: 0 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: done ? theme.bg   : colors.bgInput,
                  borderWidth: 2,
                  borderColor:    done ? theme.border : colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
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
