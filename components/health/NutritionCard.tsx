import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Stamp } from '@/components/ui/Stamp';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface NutritionCardProps {
  /** Calorias-alvo do dia (null se faltam dados de peso/idade). */
  targetKcal: number | null;
  /** Calorias estimadas ingeridas hoje. */
  intakeKcal: number;
  /** Razão intake/target em [0..1]. */
  ratio:      number;
  /** Tem registro de peso pra fazer estimativa? */
  hasWeight:  boolean;
  /** Tap → abre tela de nutrição. */
  onPress:    () => void;
}

/**
 * NutritionCard Bold v3 (briefing 08 § NutritionCard).
 *
 * Card branco clicável. Stamp comida + bloco título/subtítulo + ProgressRing
 * pequeno à direita (vs. arrow sozinha do briefing — ProgressRing dá leitura
 * imediata sem inventar dados de macros).
 *
 * Sem Pills de proteína/carbo/gordura — app não trackeia macros. Mostrar
 * Pills com números inventados seria AI slop. Aqui só calorias.
 *
 * Estados:
 *   • Tem peso + target → "X / Y kcal" + ring proporcional
 *   • Sem peso         → "Registre o peso pra ativar"
 *   • Tem peso sem plano → "Personalize seu plano"
 */
export const NutritionCard = React.memo(function NutritionCard({
  targetKcal, intakeKcal, ratio, hasWeight, onPress,
}: NutritionCardProps) {
  const T = useTheme();

  let title: string;
  let subtitle: string;
  if (targetKcal !== null && targetKcal > 0) {
    title = 'Plano nutricional';
    subtitle = `${intakeKcal.toLocaleString('pt-BR')} / ${targetKcal.toLocaleString('pt-BR')} kcal hoje`;
  } else if (hasWeight) {
    title = 'Personalize o plano';
    subtitle = 'Defina objetivo pra calcular calorias';
  } else {
    title = 'Plano nutricional';
    subtitle = 'Registre o peso pra ativar';
  }

  const showRing = targetKcal !== null && targetKcal > 0;

  return (
    <ScalePress
      onPress={onPress}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint="Abre a tela de plano nutricional"
    >
      <Card padding={18}>
        <View style={styles.row}>
          <Stamp glyph="comida" size="md" tint="solid" />

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: T.ink }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: T.ink2 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {showRing ? (
            <ProgressRing
              progress={ratio}
              size="sm"
              strokeWidth={6}
              color={T.primary}
              trackColor={T.ruleSoft}
            />
          ) : (
            <ChevronRight size={20} color={T.ink3} strokeWidth={2.4} />
          )}
        </View>
      </Card>
    </ScalePress>
  );
});

NutritionCard.displayName = 'NutritionCard';

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  subtitle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
