import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Flame, BookOpen } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { calculateWellnessEstimate } from '@/data/calories';
import { CalorieBadge } from '@/components/home/CalorieBadge';

interface WellnessCardProps {
  todayFoodGrams:   number;
  todayWalkMinutes: number;
  latestWeightKg:   number;
}

export function WellnessCard({ todayFoodGrams, todayWalkMinutes, latestWeightKg }: WellnessCardProps) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const est = calculateWellnessEstimate(todayFoodGrams, todayWalkMinutes, latestWeightKg);

  // Cor do indicador baseada no balanço
  const ratio    = est.recommended > 0 ? est.intake / est.recommended : 0;
  const isOver   = ratio > 1.1;
  const isUnder  = ratio < 0.9;
  const isOk     = !isOver && !isUnder;

  const statusTheme = isOk
    ? { primary: actionTheme.passeio.primary, bg: actionTheme.passeio.bg, border: actionTheme.passeio.border }
    : { primary: actionTheme.comida.primary, bg: actionTheme.comida.bg, border: actionTheme.comida.border };

  const getMessage = (): string => {
    if (isOk) return 'Ingestão adequada para o dia!';
    if (isOver) {
      const extra = est.balance;
      return `${extra} kcal acima do ideal. Que tal uma brincadeira extra?`;
    }
    const deficit = Math.abs(est.balance);
    return `${deficit} kcal abaixo do recomendado.`;
  };

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Estimativa de calorias. Ingestão: ${est.intake} quilocalorias. Recomendado: ${est.recommended} quilocalorias. ${getMessage()}`}
      style={{
        backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8,
        }),
      }}
    >
      {/* Header com badge da fonte ao lado do título — feedback TestFlight
          #6: usuários queriam saber "de onde vem essa estimativa". Antes
          ficava só no disclaimer minúsculo embaixo. Agora a fonte (NRC
          2006) aparece na mesma linha do título, antes mesmo dos números. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: statusTheme.bg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Flame size={18} color={statusTheme.primary} strokeWidth={2} />
          </View>
          <Text style={{
            color: colors.textPrimary, fontFamily: 'Nunito_700Bold',
            fontSize: 16, fontWeight: '700',
          }}>
            Estimativa de Calorias
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel="Baseado em fórmula do National Research Council, edição 2006"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.bgInput,
            paddingHorizontal: 8, paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <BookOpen size={10} color={colors.textSecondary} strokeWidth={2.4} />
          <Text style={{
            color: colors.textSecondary,
            fontSize: 10, fontWeight: '700',
            letterSpacing: 0.3,
          }}>
            NRC 2006
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <CalorieBadge
          intake={est.intake}
          recommended={est.recommended}
          burned={est.burned}
          status={getMessage()}
          statusTheme={statusTheme}
        />
      </View>

      {/* Disclaimer expandido — explica origem da fórmula e o que ela é/não é */}
      <Text style={{ color: colors.textTertiary, fontSize: 11, lineHeight: 16 }}>
        Cálculo baseado no <Text style={{ fontWeight: '700' }}>National Research Council (NRC 2006)</Text>: fórmula RER × fator de atividade. Estimativa informativa, não substitui orientação veterinária.
      </Text>
    </View>
  );
}
