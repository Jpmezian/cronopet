import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Kicker } from '@/components/ui/Kicker';
import { ScalePress } from '@/components/ui/ScalePress';
import { CalorieHero } from '@/components/nutrition/CalorieHero';
import { MealList } from '@/components/nutrition/MealList';
import { DistributionCard } from '@/components/nutrition/DistributionCard';
import { ConfidenceBanner } from '@/components/nutrition/ConfidenceBanner';
import { useTheme } from '@/hooks/useTheme';
import { useMotion } from '@/hooks/useMotion';
import { useNutritionData } from '@/hooks/useNutritionData';
import { usePetStore } from '@/store/usePetStore';

/**
 * NutritionScreen — Bold v3 (Fase 5 — briefing 09).
 *
 * Tela analítica do dia: CalorieHero (target/intake/ring) + lista
 * de refeições + distribuição por slot + ConfidenceBanner.
 *
 * Divergências documentadas (R-fase-5):
 *   1. Editor de plano legacy MOVIDO pra /nutrition-plan (era /nutrition).
 *      Calls do NutritionCard (Saúde Fase 4) e NutritionEntryCard (Home)
 *      agora entregam a análise — fluxo coerente com o que esses cards
 *      prometem visualmente.
 *   2. MacrosCard do briefing SUBSTITUÍDO por DistributionCard (sem
 *      tracker de macros real — fabricar seria AI slop).
 *   3. Empty state de refeição leva pra Home (registro inline duplicaria
 *      RegisterStrip; mantém um único fluxo de input).
 */
export default function NutritionScreen() {
  const T = useTheme();
  const { entering, sectionEntering } = useMotion();
  const router = useRouter();

  const pet              = usePetStore((s) => s.pet);
  const activePetId      = usePetStore((s) => s.activePetId);
  const actionHistoryRaw = usePetStore((s) => s.actionHistory);
  const weightHistoryRaw = usePetStore((s) => s.weightHistory);

  // DB-004: filtros multi-pet (items sem petId visíveis em todos)
  const actionHistory = useMemo(() =>
    actionHistoryRaw.filter((l) => !l.petId || l.petId === activePetId),
  [actionHistoryRaw, activePetId]);
  const weightHistory = useMemo(() =>
    weightHistoryRaw.filter((w) => !w.petId || w.petId === activePetId),
  [weightHistoryRaw, activePetId]);

  const data = useNutritionData(pet, actionHistory, weightHistory);

  const petLabel = pet.nome || 'seu pet';

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };
  const goPlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/nutrition-plan');
  };
  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  };
  // Tap em refeição: por enquanto vai pro log-detail existente
  const onPressMeal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/log-detail?id=${id}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={s.headerRow}>
        <ScalePress
          onPress={goBack}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={[s.backBtn, { backgroundColor: T.surfaceTint }]}
        >
          <ChevronLeft size={22} color={T.ink} strokeWidth={2.4} />
        </ScalePress>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        <Animated.View entering={sectionEntering(0)}>
          <Kicker color={T.primary}>{`Plano · ${petLabel}`}</Kicker>
          <Text style={[s.h1, { color: T.ink }]} accessibilityRole="header">
            Nutrição
          </Text>
        </Animated.View>

        <View style={{ marginTop: 22, gap: 20 }}>
          <Animated.View entering={entering(0)}>
            <CalorieHero
              targetKcal={data.targetKcal}
              intakeKcal={data.intakeKcal}
              ratio={data.ratio}
              remainingKcal={data.remainingKcal}
              hasWeight={data.hasWeight}
              mealsWithoutQuantity={data.mealsWithoutQuantity}
              onAdjustPlan={goPlan}
              onRegisterWeight={goPlan}
            />
          </Animated.View>

          <Animated.View entering={entering(1)}>
            <MealList
              meals={data.meals}
              onPressMeal={onPressMeal}
              onRegister={goHome}
            />
          </Animated.View>

          <Animated.View entering={entering(2)}>
            <DistributionCard
              distribution={data.distribution}
              hasMeals={data.meals.length > 0}
            />
          </Animated.View>

          <Animated.View entering={entering(3)}>
            <ConfidenceBanner />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 8 },
  backBtn:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scroll:    { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  h1:        { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 32, letterSpacing: -1.2, marginTop: 6 },
});
