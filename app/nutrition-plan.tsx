import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView,
  TextInput, Platform, Modal, KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Check, Info, Scale, TrendingDown,
  TrendingUp, Minus, ChefHat, Stethoscope,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { PetPhoto } from '@/components/PetPhoto';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NutritionTrustBanner } from '@/components/nutrition/NutritionTrustBanner';
import { ChipGroup } from '@/components/ui/ChipGroup';
import type { ChipOption } from '@/components/ui/ChipGroup';
import { usePetStore } from '@/store/usePetStore';
import { useToastStore } from '@/store/useToastStore';
import {
  calculateGoalCalories,
  kcalForGoal,
  estimateLifeStage,
  ageFromBirth,
  petTypeToSpecies,
  type GoalCalories,
} from '@/data/calories';
import {
  recommendFoods, gramsPerDay, monthlyCostEstimate,
  TIER_LABELS, TIER_TONE, FOOD_DISCLAIMER,
  type FoodProduct, type FoodTier,
} from '@/data/foods';
import {
  getBreedHealthProfile, getBreedFoodHints,
} from '@/data/breed-conditions';
import { getBreedSize, PET_SIZE_LABELS, PET_SIZE_WEIGHT_RANGE } from '@/data/breed-meta';
import { estimateWeight } from '@/data/estimateWeight';
import { getLocalToday } from '@/lib/dateLocal';
import type {
  NutritionGoal, BodyCondition, BaselineActivity, PetSize,
} from '@/types/pet';

// ─── Chip options (module scope) ─────────────────────────────

const GOAL_OPTS: ChipOption<NutritionGoal>[] = [
  { value: 'maintain', emoji: '⚖️', label: 'Manter peso' },
  { value: 'lose',     emoji: '📉', label: 'Emagrecer' },
  { value: 'gain',     emoji: '📈', label: 'Engordar' },
];

const BODY_OPTS: ChipOption<BodyCondition>[] = [
  { value: 'thin',       emoji: '🦴', label: 'Magro' },
  { value: 'ideal',      emoji: '✅', label: 'Ideal' },
  { value: 'overweight', emoji: '⚠️', label: 'Sobrepeso' },
  { value: 'obese',      emoji: '🔴', label: 'Obeso' },
];

const ACTIVITY_OPTS: ChipOption<BaselineActivity>[] = [
  { value: 'low',      emoji: '🛋️', label: 'Baixa' },
  { value: 'moderate', emoji: '🚶', label: 'Moderada' },
  { value: 'high',     emoji: '🏃', label: 'Alta' },
];

// Feedback TestFlight #5: portes sem contexto confundiam usuários
// ("o que conta como médio?"). Faixas de peso seguem categorização
// FEDIAF/NRC para cães; gatos sempre caem em 'small'.
const SIZE_OPTS: ChipOption<PetSize>[] = [
  { value: 'small',  label: 'Pequeno', sublabel: 'até 10 kg'    },
  { value: 'medium', label: 'Médio',   sublabel: '10–25 kg'     },
  { value: 'large',  label: 'Grande',  sublabel: '25–45 kg'     },
  { value: 'giant',  label: 'Gigante', sublabel: 'mais de 45 kg' },
];

// ─── Tons de tier → cor do actionTheme ───────────────────────

type Tone = 'neutral' | 'blue' | 'amber' | 'purple';
function getToneColors(
  tone: Tone,
  actionTheme: ReturnType<typeof useThemeColors>['actionTheme'],
  colors: ReturnType<typeof useThemeColors>['colors'],
) {
  switch (tone) {
    case 'amber':   return { primary: actionTheme.comida.primary, bg: actionTheme.comida.bg, border: actionTheme.comida.border };
    case 'blue':    return { primary: actionTheme.agua.primary,   bg: actionTheme.agua.bg,   border: actionTheme.agua.border };
    case 'purple':  return { primary: actionTheme.xixi.primary,   bg: actionTheme.xixi.bg,   border: actionTheme.xixi.border };
    case 'neutral':
    default:        return { primary: colors.textSecondary,       bg: colors.bgInput,         border: colors.border };
  }
}

// ─── Tela principal ──────────────────────────────────────────

export default function NutritionScreen() {
  const router = useRouter();
  const { colors, actionTheme, isDark } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);

  const pet              = usePetStore((s) => s.pet);
  const weightHistory    = usePetStore((s) => s.weightHistory);
  const addWeightEntry   = usePetStore((s) => s.addWeightEntry);
  const setPetNutrition  = usePetStore((s) => s.setPetNutrition);

  const species = petTypeToSpecies(pet.tipo);

  // Peso mais recente do histórico médico
  const latestWeight = useMemo(() => {
    if (weightHistory.length === 0) return null;
    return [...weightHistory]
      .sort((a, b) => b.data.localeCompare(a.data))[0].peso;
  }, [weightHistory]);

  const ageYears = useMemo(() => ageFromBirth(pet.nascimento), [pet.nascimento]);

  // ─── Inputs (inicializam com dados salvos) ─────────────────

  const defaultSize: PetSize = pet.petSize ?? getBreedSize(pet.raca, pet.tipo);

  const [goal, setGoal] = useState<NutritionGoal>(pet.nutritionGoal ?? 'maintain');
  const [bodyCondition, setBodyCondition] = useState<BodyCondition | null>(pet.bodyCondition ?? null);
  const [neutered, setNeutered] = useState<boolean>(pet.neutered ?? false);
  const [activity, setActivity] = useState<BaselineActivity>(pet.baselineActivity ?? 'moderate');
  const [size, setSize] = useState<PetSize>(defaultSize);
  const [idealWeightInput, setIdealWeightInput] = useState<string>(
    pet.idealWeightKg != null ? pet.idealWeightKg.toString() : '',
  );

  // ─── Modal de registro rápido de peso ──────────────────────

  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const handleSaveWeight = useCallback(() => {
    const peso = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(peso) || peso <= 0) {
      showToast('error', 'Digite um peso válido');
      return;
    }
    const today = getLocalToday();
    addWeightEntry(peso, today);
    setWeightInput('');
    setWeightModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('success', 'Peso registrado!');
  }, [weightInput, addWeightEntry, showToast]);

  // ─── Cálculos derivados ────────────────────────────────────

  const lifeStage = useMemo(
    () => estimateLifeStage(ageYears, species, size),
    [ageYears, species, size],
  );

  const idealWeight = useMemo(() => {
    const n = parseFloat(idealWeightInput.replace(',', '.'));
    return isNaN(n) || n <= 0 ? undefined : n;
  }, [idealWeightInput]);

  const goalCalories: GoalCalories | null = useMemo(() => {
    if (latestWeight === null) return null;
    return calculateGoalCalories({
      currentKg: latestWeight,
      idealKg:   idealWeight,
      species,
      lifeStage,
      neutered,
      activity,
    });
  }, [latestWeight, idealWeight, species, lifeStage, neutered, activity]);

  const currentTargetKcal = goalCalories ? kcalForGoal(goalCalories, goal) : 0;

  // ─── Rações recomendadas ───────────────────────────────────

  const recommendedFoods = useMemo(() => {
    const breedProfile = getBreedHealthProfile(pet.raca, pet.tipo);
    return recommendFoods({
      species,
      lifeStage,
      size,
      goal,
      maxResults: 3,
      breedHints: getBreedFoodHints(breedProfile),
    });
  }, [species, lifeStage, size, goal, pet.raca, pet.tipo]);

  // ─── Salvar plano ──────────────────────────────────────────

  const handleSavePlan = useCallback(() => {
    setPetNutrition({
      nutritionGoal:    goal,
      bodyCondition:    bodyCondition ?? undefined,
      neutered,
      baselineActivity: activity,
      petSize:          size,
      idealWeightKg:    idealWeight,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('success', 'Plano nutricional salvo!');
    router.back();
  }, [goal, bodyCondition, neutered, activity, size, idealWeight, setPetNutrition, showToast, router]);

  // ─── Render ───────────────────────────────────────────────

  const modalOverlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(28,25,23,0.35)';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
      }}>
        <ScalePress
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.bgCard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
        </ScalePress>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{
            color: colors.textTertiary,
            fontSize: 11, fontWeight: '700',
            letterSpacing: 1.2,
          }}>
            PLANO NUTRICIONAL
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 20, fontWeight: '800',
              marginTop: 1,
            }}
          >
            {pet.nome}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Pet summary strip ── */}
        <View style={{
          backgroundColor: colors.bgCard,
          borderRadius: 18,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          ...(Platform.OS === 'android' ? { elevation: 2 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6,
          }),
        }}>
          <PetPhoto
            foto={pet.foto}
            tipo={pet.tipo}
            nome={pet.nome}
            size={52}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_700Bold',
              fontSize: 16, fontWeight: '700',
            }}>
              {pet.nome}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
              {[
                pet.raca && pet.raca !== 'Sem raça definida' ? pet.raca : null,
                latestWeight !== null ? `${latestWeight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : null,
                ageYears !== null ? `${ageYears < 1 ? Math.round(ageYears * 12) + ' meses' : Math.floor(ageYears) + (Math.floor(ageYears) === 1 ? ' ano' : ' anos')}` : null,
                lifeStageLabel(lifeStage),
              ].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {/* Warning: idade desconhecida */}
        {ageYears === null && (
          <InfoBanner
            emoji="📅"
            title="Adicione a data de nascimento"
            subtitle="Para estimar a fase de vida (filhote/adulto/sênior) com precisão."
            colors={colors}
            actionTheme={actionTheme}
          />
        )}

        {/* ═══════════ OBJETIVO ═══════════ */}
        <SectionHeader title="OBJETIVO" subtitle="O que você quer alcançar?" />
        <ChipGroup<NutritionGoal>
          options={GOAL_OPTS}
          selected={goal}
          onSelect={(v) => v && setGoal(v)}
          allowDeselect={false}
          accentColor={actionTheme.comida.primary}
          accentBg={actionTheme.comida.bg}
          accentBorder={actionTheme.comida.border}
        />

        {/* ═══════════ METAS CALÓRICAS ═══════════ */}
        <SectionHeader
          title="METAS CALÓRICAS"
          subtitle="Quanto seu pet precisa por dia"
        />

        {latestWeight === null ? (
          <WeightMissingCard
            colors={colors}
            actionTheme={actionTheme}
            weightEstimate={estimateWeight(pet.raca, pet.tipo, pet.nascimento)}
            onUseEstimate={(kg) => {
              // Pré-preenche o modal com o peso estimado pra user só confirmar
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeightInput(kg.toString().replace('.', ','));
              setWeightModalVisible(true);
            }}
            onRegister={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeightModalVisible(true);
            }}
          />
        ) : (
          <GoalCalorieCards
            goals={goalCalories!}
            selected={goal}
            colors={colors}
            actionTheme={actionTheme}
          />
        )}

        {/* ═══════════ PERFIL ═══════════ */}
        <SectionHeader
          title="PERFIL DO PET"
          subtitle="Mais dados = cálculos mais precisos"
        />

        <View style={{ gap: 16 }}>
          {/* Porte */}
          <FormField label="Porte">
            <ChipGroup<PetSize>
              options={SIZE_OPTS}
              selected={size}
              onSelect={(v) => v && setSize(v)}
              allowDeselect={false}
              compact
              accentColor={actionTheme.agua.primary}
              accentBg={actionTheme.agua.bg}
              accentBorder={actionTheme.agua.border}
            />
            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
              {PET_SIZE_LABELS[size]} · {PET_SIZE_WEIGHT_RANGE[size]}
            </Text>
          </FormField>

          {/* Condição corporal */}
          <FormField label="Condição corporal">
            <ChipGroup<BodyCondition>
              options={BODY_OPTS}
              selected={bodyCondition}
              onSelect={setBodyCondition}
              compact
              accentColor={actionTheme.passeio.primary}
              accentBg={actionTheme.passeio.bg}
              accentBorder={actionTheme.passeio.border}
            />
          </FormField>

          {/* Atividade */}
          <FormField label="Nível de atividade">
            <ChipGroup<BaselineActivity>
              options={ACTIVITY_OPTS}
              selected={activity}
              onSelect={(v) => v && setActivity(v)}
              allowDeselect={false}
              accentColor={actionTheme.passeio.primary}
              accentBg={actionTheme.passeio.bg}
              accentBorder={actionTheme.passeio.border}
            />
          </FormField>

          {/* Castrado */}
          <FormField label="Castrado(a)?">
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNeutered(true); }}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected: neutered }}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: neutered ? actionTheme.agua.bg : colors.bgInput,
                    borderWidth: 1.5,
                    borderColor: neutered ? actionTheme.agua.border : colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: neutered ? '700' : '500',
                    color: neutered ? actionTheme.agua.primary : colors.textSecondary,
                  }}>
                    ✓ Sim
                  </Text>
                </ScalePress>
              </View>
              <View style={{ flex: 1 }}>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNeutered(false); }}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected: !neutered }}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: !neutered ? actionTheme.agua.bg : colors.bgInput,
                    borderWidth: 1.5,
                    borderColor: !neutered ? actionTheme.agua.border : colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: !neutered ? '700' : '500',
                    color: !neutered ? actionTheme.agua.primary : colors.textSecondary,
                  }}>
                    ✗ Não
                  </Text>
                </ScalePress>
              </View>
            </View>
          </FormField>

          {/* Peso ideal */}
          <FormField
            label="Peso ideal (kg) — opcional"
            hint={
              bodyCondition && bodyCondition !== 'ideal' && !idealWeightInput
                ? `Estimaremos automaticamente baseado na condição corporal (${BODY_OPTS.find(o => o.value === bodyCondition)?.label.toLowerCase()}).`
                : 'Deixe vazio para usar o peso atual como referência.'
            }
          >
            <TextInput
              value={idealWeightInput}
              onChangeText={setIdealWeightInput}
              placeholder={latestWeight !== null ? `Atual: ${latestWeight.toLocaleString('pt-BR')} kg` : 'Ex: 6.5'}
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              accessible
              accessibilityLabel="Peso ideal em quilogramas"
              style={{
                backgroundColor: colors.bgInput,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.textPrimary,
              }}
            />
          </FormField>
        </View>

        {/* ═══════════ RAÇÕES RECOMENDADAS ═══════════ */}
        <SectionHeader
          title="RAÇÕES RECOMENDADAS"
          subtitle={`${recommendedFoods.length} opções para seu objetivo`}
        />

        {/* Banner de transparência ANTES da lista (feedback TestFlight #9+10):
            usuários sentiam falta de algo que confirmasse "esta recomendação
            é confiável e independente". O disclaimer no rodapé era pequeno
            demais pra carregar essa garantia. */}
        <NutritionTrustBanner />

        <View style={{ gap: 12 }}>
          {recommendedFoods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              targetKcal={currentTargetKcal}
              colors={colors}
              actionTheme={actionTheme}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Disclaimer */}
        <View style={{
          backgroundColor: colors.bgInput,
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <Info size={14} color={colors.textTertiary} strokeWidth={2} style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={{
            color: colors.textTertiary,
            fontSize: 11,
            lineHeight: 16,
            flex: 1,
          }}>
            {FOOD_DISCLAIMER}
          </Text>
        </View>

        {/* ═══════════ COMO CALCULAMOS ═══════════ */}
        <SectionHeader title="COMO CALCULAMOS" />

        <View style={{
          backgroundColor: colors.bgCard,
          borderRadius: 16,
          padding: 18,
          ...(Platform.OS === 'android' ? { elevation: 1 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.18 : 0.04, shadowRadius: 4,
          }),
        }}>
          <ExplanationBlock
            title="RER — Energia de Repouso"
            body="Fórmula NRC (National Research Council): 70 × (peso em kg)^0.75. É a quantidade mínima de calorias para manter funções vitais em repouso."
            colors={colors}
          />
          <Divider colors={colors} />
          <ExplanationBlock
            title="MER — Energia de Manutenção"
            body={`RER × fator de atividade. Cães adultos castrados: 1.6x (ajuste ±0.2 para atividade). Gatos adultos castrados: 1.2x. Filhotes: 2.5-3.0x. Sênior: −0.4 do fator adulto.`}
            colors={colors}
          />
          <Divider colors={colors} />
          <ExplanationBlock
            title="Para emagrecer"
            body="Usamos o RER no peso ideal (ou estimado pela condição corporal). Clampado a 80% do MER atual — nunca recomendamos déficit superior para evitar riscos à saúde. Perda segura: ~1% do peso por semana."
            colors={colors}
          />
          <Divider colors={colors} />
          <ExplanationBlock
            title="Para engordar"
            body="MER atual × 1.3 (superávit de 30%). Ganho seguro é gradual. Se seu pet está muito magro por doença, priorize consulta veterinária."
            colors={colors}
          />
          <Divider colors={colors} />
          <ExplanationBlock
            title="Rações"
            body="Calculamos gramas/dia dividindo a meta calórica pela densidade energética (kcal/100g) de cada ração. Custo mensal = gramas × 30 × preço/kg."
            colors={colors}
          />

          <View style={{
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Stethoscope size={12} color={actionTheme.comida.primary} strokeWidth={2.2} />
              <Text style={{
                color: actionTheme.comida.primary,
                fontSize: 11,
                fontWeight: '700',
                lineHeight: 16,
              }}>
                Disclaimer veterinário
              </Text>
            </View>
            <Text style={{
              color: colors.textTertiary,
              fontSize: 11,
              lineHeight: 16,
              marginTop: 3,
            }}>
              Estas estimativas são informativas e baseadas em médias populacionais. Cada pet é único. Antes de mudar a dieta ou iniciar um plano de perda/ganho de peso, consulte um médico veterinário.
            </Text>
          </View>
        </View>

        {/* ═══════════ SALVAR ═══════════ */}
        <ScalePress
          onPress={handleSavePlan}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Salvar plano nutricional"
          style={{
            backgroundColor: colors.textPrimary,
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          <Check size={20} color={colors.bgScreen} strokeWidth={2.5} />
          <Text style={{
            color: colors.bgScreen,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 16,
            fontWeight: '800',
            marginLeft: 8,
          }}>
            Salvar Plano
          </Text>
        </ScalePress>
      </ScrollView>

      {/* ── Modal rápido de peso ── */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            onPress={() => setWeightModalVisible(false)}
            style={{ flex: 1, backgroundColor: modalOverlay }}
            accessibilityLabel="Fechar modal de peso"
          />
          <View style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 44 : 32,
          }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Scale size={22} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{
                color: colors.textPrimary,
                fontFamily: 'Nunito_800ExtraBold',
                fontSize: 18,
                fontWeight: '800',
                marginLeft: 8,
              }}>
                Registrar peso
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
              Peso atual em kg
            </Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="Ex: 6.5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
              style={{
                backgroundColor: colors.bgInput,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 17,
                color: colors.textPrimary,
                fontFamily: 'Nunito_700Bold',
                marginBottom: 16,
              }}
            />
            <ScalePress
              onPress={handleSaveWeight}
              style={{
                backgroundColor: actionTheme.xixi.primary,
                borderRadius: 16,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Check size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={{
                color: '#ffffff',
                fontFamily: 'Nunito_800ExtraBold',
                fontSize: 16,
                fontWeight: '800',
                marginLeft: 6,
              }}>
                Salvar peso
              </Text>
            </ScalePress>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
// ═══ Sub-componentes (module scope)                         ═══
// ═════════════════════════════════════════════════════════════

function lifeStageLabel(stage: 'puppy' | 'adult' | 'senior'): string {
  if (stage === 'puppy') return 'filhote';
  if (stage === 'senior') return 'sênior';
  return 'adulto';
}

// ─── FormField ───────────────────────────────────────────────

function FormField({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useThemeColors();
  return (
    <View>
      <Text style={{
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </Text>
      {children}
      {!!hint && (
        <Text style={{
          color: colors.textTertiary,
          fontSize: 11,
          marginTop: 4,
          lineHeight: 14,
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// ─── InfoBanner ──────────────────────────────────────────────

function InfoBanner({
  emoji, title, subtitle, colors, actionTheme,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useThemeColors>['colors'];
  actionTheme: ReturnType<typeof useThemeColors>['actionTheme'];
}) {
  return (
    <View style={{
      backgroundColor: actionTheme.agua.bg,
      borderWidth: 1,
      borderColor: actionTheme.agua.border,
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    }}>
      <Text style={{ fontSize: 20, marginRight: 10 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: actionTheme.agua.primary,
          fontFamily: 'Nunito_700Bold',
          fontSize: 13,
          fontWeight: '700',
        }}>
          {title}
        </Text>
        <Text style={{
          color: actionTheme.agua.primary,
          fontSize: 12,
          marginTop: 2,
          lineHeight: 16,
        }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

// ─── WeightMissingCard ───────────────────────────────────────

function WeightMissingCard({
  colors, actionTheme, weightEstimate, onUseEstimate, onRegister,
}: {
  colors: ReturnType<typeof useThemeColors>['colors'];
  actionTheme: ReturnType<typeof useThemeColors>['actionTheme'];
  weightEstimate: ReturnType<typeof estimateWeight>;
  onUseEstimate: (kg: number) => void;
  onRegister: () => void;
}) {
  // Feedback TestFlight R2-4: se temos raça + idade, sugerimos uma faixa
  // razoável pra o user não precisar adivinhar. Mostra como sugestão
  // editável — user pode aceitar e ajustar depois de pesar de verdade.
  const hasEstimate = weightEstimate !== null;

  return (
    <View style={{
      backgroundColor: actionTheme.comida.bg,
      borderWidth: 1,
      borderColor: actionTheme.comida.border,
      borderRadius: 16,
      padding: 18,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Scale size={20} color={actionTheme.comida.primary} strokeWidth={2} />
        <Text style={{
          color: actionTheme.comida.primary,
          fontFamily: 'Nunito_700Bold',
          fontSize: 14,
          fontWeight: '700',
          marginLeft: 8,
        }}>
          Peso não registrado
        </Text>
      </View>
      <Text style={{
        color: actionTheme.comida.primary,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 14,
      }}>
        {hasEstimate
          ? `Sem pesar ainda? Pela raça e idade, uma faixa típica é ${weightEstimate.rangeKg.min}–${weightEstimate.rangeKg.max} kg (médio ~${weightEstimate.estimateKg} kg). Use a sugestão pra começar — você ajusta depois.`
          : 'Registre o peso do seu pet para calcular as metas calóricas personalizadas. Você pode registrar agora mesmo e continuar aqui.'
        }
      </Text>

      {hasEstimate && (
        <ScalePress
          onPress={() => onUseEstimate(weightEstimate.estimateKg)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Usar peso estimado de ${weightEstimate.estimateKg} quilos`}
          style={{
            backgroundColor: actionTheme.comida.bg,
            borderWidth: 1.5,
            borderColor: actionTheme.comida.primary,
            borderRadius: 12,
            paddingVertical: 11,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Text style={{
            color: actionTheme.comida.primary,
            fontFamily: 'Nunito_700Bold',
            fontSize: 13,
            fontWeight: '700',
          }}>
            Usar estimativa: {weightEstimate.estimateKg} kg
          </Text>
        </ScalePress>
      )}

      <ScalePress
        onPress={onRegister}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Registrar peso real agora"
        style={{
          backgroundColor: actionTheme.comida.primary,
          borderRadius: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Scale size={16} color="#ffffff" strokeWidth={2.5} />
        <Text style={{
          color: '#ffffff',
          fontFamily: 'Nunito_700Bold',
          fontSize: 14,
          fontWeight: '700',
          marginLeft: 6,
        }}>
          Registrar peso agora
        </Text>
      </ScalePress>
    </View>
  );
}

// ─── GoalCalorieCards ────────────────────────────────────────

function GoalCalorieCards({
  goals, selected, colors, actionTheme,
}: {
  goals: GoalCalories;
  selected: NutritionGoal;
  colors: ReturnType<typeof useThemeColors>['colors'];
  actionTheme: ReturnType<typeof useThemeColors>['actionTheme'];
}) {
  const cards: Array<{ goal: NutritionGoal; icon: React.ReactNode; label: string; value: number; tone: 'passeio' | 'agua' | 'xixi' }> = [
    { goal: 'maintain', icon: <Minus size={14} color={actionTheme.passeio.primary} strokeWidth={2.5} />,    label: 'Manter',    value: goals.maintain, tone: 'passeio' },
    { goal: 'lose',     icon: <TrendingDown size={14} color={actionTheme.agua.primary} strokeWidth={2.5} />, label: 'Emagrecer', value: goals.lose,     tone: 'agua'    },
    { goal: 'gain',     icon: <TrendingUp size={14} color={actionTheme.xixi.primary} strokeWidth={2.5} />,   label: 'Engordar',  value: goals.gain,     tone: 'xixi'    },
  ];

  return (
    <View style={{ flexDirection: 'row' }}>
      {cards.map((c, i) => {
        const isActive = c.goal === selected;
        const theme = actionTheme[c.tone];
        return (
          <React.Fragment key={c.goal}>
            {i > 0 && <View style={{ width: 8 }} />}
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${c.label}: ${c.value} quilocalorias por dia${isActive ? ', objetivo atual' : ''}`}
              style={{
                flex: 1,
                backgroundColor: isActive ? theme.bg : colors.bgCard,
                borderRadius: 16,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? theme.primary : colors.border,
                paddingVertical: 14,
                paddingHorizontal: 10,
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {c.icon}
                <Text style={{
                  color: isActive ? theme.primary : colors.textSecondary,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  marginLeft: 3,
                  textTransform: 'uppercase',
                }}>
                  {c.label}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: isActive ? theme.primary : colors.textPrimary,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 22,
                  fontWeight: '800',
                  lineHeight: 24,
                }}
              >
                {c.value.toLocaleString('pt-BR')}
              </Text>
              <Text style={{
                color: isActive ? theme.primary : colors.textTertiary,
                fontSize: 10,
                fontWeight: '600',
                marginTop: 1,
              }}>
                kcal/dia
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── FoodCard ────────────────────────────────────────────────

function FoodCard({
  food, targetKcal, colors, actionTheme, isDark,
}: {
  food: FoodProduct;
  targetKcal: number;
  colors: ReturnType<typeof useThemeColors>['colors'];
  actionTheme: ReturnType<typeof useThemeColors>['actionTheme'];
  isDark: boolean;
}) {
  const grams = targetKcal > 0 ? gramsPerDay(targetKcal, food) : null;
  const cost = grams !== null ? monthlyCostEstimate(grams, food) : null;
  const gramsPerMeal = grams !== null ? Math.round(grams / food.mealsPerDay) : null;

  const tier = food.tier;
  const tierLabel = TIER_LABELS[tier];
  const tone = TIER_TONE[tier];
  const toneColors = getToneColors(tone, actionTheme, colors);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${food.brand} ${food.line}, ${tierLabel}${
        grams !== null ? `, ${grams} gramas por dia, custo mensal ${cost?.min} a ${cost?.max} reais` : ''
      }`}
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 18,
        padding: 16,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.22 : 0.06, shadowRadius: 8,
        }),
      }}
    >
      {/* Header: brand + tier badge */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{
            color: colors.textPrimary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 16,
            fontWeight: '800',
          }}>
            {food.brand}
          </Text>
          <Text style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 1,
          }}>
            {food.line}
          </Text>
        </View>
        <View style={{
          backgroundColor: toneColors.bg,
          borderWidth: 1,
          borderColor: toneColors.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{
            color: toneColors.primary,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.4,
          }}>
            {tierLabel.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Descrição */}
      <Text style={{
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 12,
      }}>
        {food.description}
      </Text>

      {/* Features chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
        {food.features.map((feature, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.bgInput,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginRight: 5,
              marginBottom: 5,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {/* Separador */}
      <View style={{
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
      }} />

      {/* Stats: porção + custo */}
      {grams !== null && cost !== null ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
              PORÇÃO DIÁRIA
            </Text>
            <Text style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_700Bold',
              fontSize: 14,
              fontWeight: '700',
            }}>
              {grams} g/dia
            </Text>
          </View>
          {gramsPerMeal !== null && (
            <Text style={{
              color: colors.textTertiary,
              fontSize: 11,
              marginTop: -4,
              marginBottom: 8,
            }}>
              ≈ {food.mealsPerDay} refeições × {gramsPerMeal} g
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
              CUSTO MENSAL
            </Text>
            <Text style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_700Bold',
              fontSize: 14,
              fontWeight: '700',
            }}>
              R$ {cost.min}–{cost.max}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
              DENSIDADE · PREÇO/KG
            </Text>
            <Text style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: '600',
            }}>
              {(food.kcalPer100g / 100).toFixed(1)} kcal/g · R$ {food.priceBRLMin}–{food.priceBRLMax}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={{ color: colors.textTertiary, fontSize: 12, fontStyle: 'italic' }}>
          Registre o peso para calcular porção e custo.
        </Text>
      )}
    </View>
  );
}

// ─── Explanation block ──────────────────────────────────────

function ExplanationBlock({
  title, body, colors,
}: {
  title: string;
  body: string;
  colors: ReturnType<typeof useThemeColors>['colors'];
}) {
  return (
    <View>
      <Text style={{
        color: colors.textPrimary,
        fontFamily: 'Nunito_700Bold',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
      }}>
        {title}
      </Text>
      <Text style={{
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
      }}>
        {body}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useThemeColors>['colors'] }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />;
}
