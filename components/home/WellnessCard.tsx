import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Flame } from 'lucide-react-native';
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
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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

      <View style={{ marginBottom: 10 }}>
        <CalorieBadge
          intake={est.intake}
          recommended={est.recommended}
          burned={est.burned}
          status={getMessage()}
          statusTheme={statusTheme}
        />
      </View>

      {/* Disclaimer */}
      <Text style={{ color: colors.textTertiary, fontSize: 11, lineHeight: 16 }}>
        Estimativa informativa baseada em médias. Consulte seu veterinário para orientação nutricional.
      </Text>
    </View>
  );
}
