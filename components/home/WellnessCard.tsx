import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Flame, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { calculateWellnessEstimate } from '@/data/calories';
import { CalorieBadge } from '@/components/home/CalorieBadge';

interface WellnessCardProps {
  todayFoodGrams:   number;
  todayWalkMinutes: number;
  latestWeightKg:   number;
}

export function WellnessCard({ todayFoodGrams, todayWalkMinutes, latestWeightKg }: WellnessCardProps) {
  const T = useTheme();
  const est = calculateWellnessEstimate(todayFoodGrams, todayWalkMinutes, latestWeightKg);

  // Cor do indicador baseada no balanço
  const ratio    = est.recommended > 0 ? est.intake / est.recommended : 0;
  const isOver   = ratio > 1.1;
  const isUnder  = ratio < 0.9;
  const isOk     = !isOver && !isUnder;

  const statusTheme = isOk
    ? { primary: ACTIONS_V3.passeio.primary, bg: ACTIONS_V3.passeio.tintL, border: 'rgba(14,140,90,0.22)' }
    : { primary: ACTIONS_V3.comida.primary,  bg: ACTIONS_V3.comida.tintL,  border: 'rgba(194,98,10,0.22)' };

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
        backgroundColor: T.card, borderRadius: 20, padding: 20,
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
            color: T.ink, fontFamily: 'Nunito_700Bold',
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
            backgroundColor: T.surfaceTint,
            paddingHorizontal: 8, paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <BookOpen size={10} color={T.ink2} strokeWidth={2.4} />
          <Text style={{
            color: T.ink2,
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

      {/* Disclaimer L5 — texto reforçado conforme parecer jurídico
          (Seção 7.4). Diferenciação explícita de prescrição veterinária. */}
      <Text style={{ color: T.ink3, fontSize: 11, lineHeight: 16 }}>
        Cálculo baseado no <Text style={{ fontWeight: '700' }}>National Research Council (NRC 2006)</Text>: RER × fator de atividade. <Text style={{ fontWeight: '700' }}>Referência informativa, não é prescrição veterinária.</Text> Animais com condições clínicas (renal, diabetes, alergia, gestação) requerem avaliação individualizada por médico-veterinário inscrito no CRMV.
      </Text>
    </View>
  );
}
