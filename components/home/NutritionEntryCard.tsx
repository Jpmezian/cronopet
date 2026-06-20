import React from 'react';
import { View, Text, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChefHat, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { ScalePress } from '@/components/ui/ScalePress';
import type { NutritionGoal } from '@/types/pet';

interface NutritionEntryCardProps {
  targetKcal:  number | null;       // null quando falta dados
  currentGoal: NutritionGoal | null; // null quando não salvo
  hasWeight:   boolean;
}

const GOAL_LABELS: Record<NutritionGoal, string> = {
  maintain: 'para manter peso',
  lose:     'para emagrecer',
  gain:     'para engordar',
};

const GOAL_EMOJIS: Record<NutritionGoal, string> = {
  maintain: '⚖️',
  lose:     '📉',
  gain:     '📈',
};

export function NutritionEntryCard({
  targetKcal,
  currentGoal,
  hasWeight,
}: NutritionEntryCardProps) {
  const router = useRouter();
  const T = useTheme();

  const goalText = currentGoal ? GOAL_LABELS[currentGoal] : 'personalize seu plano';
  const goalEmoji = currentGoal ? GOAL_EMOJIS[currentGoal] : '🥗';

  return (
    <ScalePress
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/nutrition');
      }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Plano nutricional. ${
        targetKcal !== null
          ? `Meta de ${targetKcal} quilocalorias por dia ${goalText}.`
          : hasWeight
          ? 'Configure seu plano nutricional.'
          : 'Registre o peso do pet para criar um plano nutricional.'
      }`}
      accessibilityHint="Toque para ver rações recomendadas e metas calóricas completas"
      style={{
        backgroundColor: T.card,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        ...(Platform.OS === 'android' ? { elevation: 3 } : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: T.isDark ? 0.25 : 0.07,
          shadowRadius: 8,
        }),
      }}
    >
      {/* Ícone com gradiente sutil */}
      <View style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: ACTIONS_V3.comida.tintL,
        borderWidth: 1,
        borderColor: 'rgba(194,98,10,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ fontSize: 24 }}>{goalEmoji}</Text>
      </View>

      {/* Conteúdo */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <ChefHat size={13} color={ACTIONS_V3.comida.primary} strokeWidth={2.5} />
          <Text style={{
            color: ACTIONS_V3.comida.primary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
            marginLeft: 5,
          }}>
            PLANO NUTRICIONAL
          </Text>
        </View>

        {targetKcal !== null ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{
                color: T.ink,
                fontFamily: 'Nunito_800ExtraBold',
                fontSize: 22,
                fontWeight: '800',
              }}>
                {targetKcal.toLocaleString('pt-BR')}
              </Text>
              <Text style={{
                color: T.ink2,
                fontSize: 13,
                fontWeight: '600',
                marginLeft: 4,
              }}>
                kcal/dia
              </Text>
            </View>
            <Text style={{
              color: T.ink3,
              fontSize: 12,
              marginTop: 1,
            }}>
              {goalText}
            </Text>
          </>
        ) : hasWeight ? (
          <>
            <Text style={{
              color: T.ink,
              fontFamily: 'Nunito_700Bold',
              fontSize: 15,
              fontWeight: '700',
            }}>
              Configurar plano
            </Text>
            <Text style={{
              color: T.ink3,
              fontSize: 12,
              marginTop: 1,
            }}>
              Metas calóricas + rações recomendadas
            </Text>
          </>
        ) : (
          <>
            <Text style={{
              color: T.ink,
              fontFamily: 'Nunito_700Bold',
              fontSize: 15,
              fontWeight: '700',
            }}>
              Plano nutricional
            </Text>
            <Text style={{
              color: T.ink3,
              fontSize: 12,
              marginTop: 1,
            }}>
              Registre o peso para começar
            </Text>
          </>
        )}
      </View>

      <ChevronRight size={20} color={T.ink3} strokeWidth={2} />
    </ScalePress>
  );
}
