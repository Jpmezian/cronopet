import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Kicker } from '@/components/ui/Kicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { WeightCard } from '@/components/health/WeightCard';
import { NutritionCard } from '@/components/health/NutritionCard';
import { AIGate } from '@/components/health/AIGate';
import { AppointmentCard } from '@/components/health/AppointmentCard';
import { VaccineList } from '@/components/health/VaccineList';
import { SymptomCard } from '@/components/health/SymptomCard';
import { WeightModal } from '@/components/health/WeightModal';
import { VaccineModal } from '@/components/health/VaccineModal';
import { AppointmentModal } from '@/components/health/AppointmentModal';
import { SymptomModal } from '@/components/health/SymptomModal';
import { useTheme } from '@/hooks/useTheme';
import { useMotion } from '@/hooks/useMotion';
import { usePremium } from '@/hooks/usePremium';
import { useHealthData } from '@/hooks/useHealthData';
import { usePetStore } from '@/store/usePetStore';

/**
 * MedicalScreen — Saúde Bold v3 (Fase 4 — briefing 08).
 *
 * Substitui SegmentedControl 5-tabs + cards inline pela composição
 * analítica:
 *   1. Header H1 + Kicker
 *   2. WeightCard (peso + chart SVG + delta)
 *   3. NutritionCard (preview clicável → /nutrition)
 *   4. AIGate (paywall placeholder, só se !isPremium)
 *   5. AppointmentCard (próxima consulta destacada)
 *   6. VaccineList (status derivado: aplicada/próxima/atrasada)
 *   7. SymptomCard (preserva fluxo de Ocorrências legacy)
 *
 * R-fase-4 documentados:
 *   1. "Gerar PDF" removido — canônico em Histórico (Fase 3)
 *   2. BreedHealthCard removido (P3 reincorporar no AIGate Pro real)
 *   3. GroomingCard removido — registro segue via Home RegisterStrip
 *   4. Modais legacy preservados em arquivos separados (visual Fase 9)
 *   5. Disclaimer LGPD migra do top pro rodapé do AIGate
 *   6. NutritionCard sem Pills macros (sem dados pra populá-las)
 */
export default function MedicalScreen() {
  const T = useTheme();
  const { entering, sectionEntering } = useMotion();
  const router = useRouter();
  const { isPremium } = usePremium();

  const store = usePetStore();
  const { pet, activePetId } = store;

  // DB-004: filtros multi-pet (items sem petId ficam visíveis em todos)
  const filtered = useMemo(() => {
    const match = <T extends { petId?: string }>(arr: T[]) =>
      arr.filter((x) => !x.petId || x.petId === activePetId);
    return {
      actionHistory: match(store.actionHistory),
      medicalEvents: match(store.medicalEvents),
      vaccines:      match(store.vaccines),
      appointments:  match(store.appointments),
      weightHistory: match(store.weightHistory),
    };
  }, [
    store.actionHistory, store.medicalEvents, store.vaccines,
    store.appointments, store.weightHistory, activePetId,
  ]);

  const data = useHealthData(
    pet, filtered.actionHistory, filtered.vaccines,
    filtered.appointments, filtered.weightHistory,
  );

  // ── Modais + confirms ──────────────────────────────────────
  const [open, setOpen] = useState<'weight' | 'vaccine' | 'appt' | 'symptom' | null>(null);
  const openSheet = useCallback((kind: typeof open) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(kind);
  }, []);
  const close = useCallback(() => setOpen(null), []);

  const confirmRemove = useCallback(
    (kind: 'appt' | 'vaccine' | 'symptom', id: string) => {
      const labelMap = {
        appt:    'Remover consulta?',
        vaccine: 'Remover vacina?',
        symptom: 'Remover ocorrência?',
      };
      const removeMap = {
        appt:    store.removeAppointment,
        vaccine: store.removeVaccine,
        symptom: store.removeMedicalEvent,
      };
      Alert.alert(labelMap[kind], 'Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover',  style: 'destructive', onPress: () => removeMap[kind](id) },
      ]);
    },
    [store.removeAppointment, store.removeVaccine, store.removeMedicalEvent],
  );

  const petLabel = pet.nome || 'seu pet';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={sectionEntering(0)}>
          <Kicker color={T.primary}>{`Prontuário · ${petLabel}`}</Kicker>
          <Text style={[s.h1, { color: T.ink }]} accessibilityRole="header">Saúde</Text>
        </Animated.View>

        <View style={{ marginTop: 22, gap: 20 }}>
          <Animated.View entering={entering(0)}>
            <WeightCard
              latestKg={data.latestKg}
              weightDelta={data.weightDelta}
              latestDate={data.latestWeightDate}
              series={data.weightSeries}
              onRegister={() => openSheet('weight')}
            />
          </Animated.View>

          <Animated.View entering={entering(1)}>
            <NutritionCard
              targetKcal={data.targetKcal}
              intakeKcal={data.intakeKcal}
              ratio={data.intakeRatio}
              hasWeight={data.latestKg !== null}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/nutrition');
              }}
            />
          </Animated.View>

          {!isPremium && (
            <Animated.View entering={entering(2)}>
              <AIGate petNome={petLabel} />
            </Animated.View>
          )}

          <Animated.View entering={entering(3)}>
            <SectionHeader title="Próxima consulta" />
            <AppointmentCard
              next={data.nextAppointment}
              upcoming={data.upcomingAppointments}
              onAdd={() => openSheet('appt')}
              onPressItem={(id) => confirmRemove('appt', id)}
            />
          </Animated.View>

          <Animated.View entering={entering(4)}>
            <SectionHeader
              title="Vacinas"
              actionLabel="Adicionar"
              onActionPress={() => openSheet('vaccine')}
            />
            <VaccineList
              vaccines={data.vaccinesWithStatus}
              onAdd={() => openSheet('vaccine')}
              onPressItem={(id) => confirmRemove('vaccine', id)}
            />
          </Animated.View>

          <Animated.View entering={entering(5)}>
            <SectionHeader title="Ocorrências" />
            <SymptomCard
              recent={filtered.medicalEvents}
              onAdd={() => openSheet('symptom')}
              onPressItem={(id) => confirmRemove('symptom', id)}
            />
          </Animated.View>
        </View>
      </ScrollView>

      <WeightModal      visible={open === 'weight'}  onClose={close} onSave={(p, d, n)   => { store.addWeightEntry(p, d, n); close(); }} />
      <VaccineModal     visible={open === 'vaccine'} onClose={close} onSave={(v)         => { store.addVaccine(v);          close(); }} />
      <AppointmentModal visible={open === 'appt'}    onClose={close} onSave={async (a)   => { await store.addAppointment(a); close(); }} />
      <SymptomModal     visible={open === 'symptom'} onClose={close} onSave={(t, n, p)   => { store.addMedicalEvent(t, n, p); close(); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
  h1:     { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 32, letterSpacing: -1.2, marginTop: 6 },
});
