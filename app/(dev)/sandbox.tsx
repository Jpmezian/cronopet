/**
 * 🧪 Component Sandbox — Catálogo vivo de todos os componentes de UI do CronoPet.
 *
 * Acessível em: /sandbox (rota (dev) excluída do guard de onboarding)
 * Uso: validação visual de componentes sem navegar pelo fluxo completo do app.
 */
import React, { useState } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { ScalePress } from '@/components/ui/ScalePress';
import { ActionButton } from '@/components/home/ActionButton';
import type { ActionConfig } from '@/components/home/ActionButton';
import { DailyProgress } from '@/components/home/DailyProgress';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Skeleton, SkeletonMemberCard, SkeletonPremiumDashboard,
} from '@/components/ui/Skeleton';
import { CalorieBadge } from '@/components/home/CalorieBadge';
import { NutritionEntryCard } from '@/components/home/NutritionEntryCard';
import { WellnessCard } from '@/components/home/WellnessCard';
import { ChipGroup } from '@/components/ui/ChipGroup';
import type { ChipOption } from '@/components/ui/ChipGroup';
import { WeeklyReportCard } from '@/components/ui/WeeklyReportCard';
import type { DayData } from '@/components/ui/WeeklyReportCard';
import { SocialCardView } from '@/components/ui/SocialCardView';
import { MILESTONE_DATA } from '@/components/ui/MilestoneSheet';
import { useToastStore } from '@/store/useToastStore';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CriticalInsightBanner } from '@/components/home/CriticalInsightBanner';
import { HealthInsightsCard } from '@/components/home/HealthInsightsCard';
import type { HealthInsight } from '@/services/HealthInsights';
import {
  seedActionLogs, seedWeightHistory, seedVaccines, seedAppointments,
} from '@/data/demo-seed';
import type { ActionKey, NutritionGoal } from '@/types/pet';

// ─── Sombra padrão ────────────────────────────────────────────

const softShadow = Platform.OS === 'android'
  ? { elevation: 2 }
  : {
      shadowColor: '#000' as const,
      shadowOffset: { width: 0, height: 2 } as const,
      shadowOpacity: 0.06,
      shadowRadius: 8,
    };

// ─── Seção do catálogo ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useThemeColors();
  return (
    <View style={{ paddingHorizontal: 20, gap: 12 }}>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────

export default function SandboxScreen() {
  const router = useRouter();
  const { colors, actionTheme } = useThemeColors();

  // SECURITY: bloqueia acesso em build de produção. Usuários finais
  // não devem ver dev toggles (especialmente o "Simular Premium").
  // Em dev (__DEV__ === true), permite. Em prod, redireciona.
  if (!__DEV__) {
    React.useEffect(() => {
      router.replace('/(tabs)');
    }, []);
    return null;
  }
  const showToast = useToastStore((s) => s.showToast);

  // ── Estado demo: ActionButton ─────────────────────────────
  const [actionCounts, setActionCounts] = useState<Record<ActionKey, number>>({
    comida: 2, agua: 0, passeio: 1, xixi: 0, coco: 0, banho: 0,
  });
  const urgentActions: Record<ActionKey, boolean> = {
    comida: false, agua: true, passeio: false, xixi: false, coco: false, banho: false,
  };

  // ── Estado demo: DailyProgress ────────────────────────────
  const [dailyState, setDailyState] = useState<'empty' | 'partial' | 'complete'>('partial');
  const progressCounts: Record<ActionKey, number> = {
    comida:  dailyState !== 'empty' ? 1 : 0,
    agua:    dailyState !== 'empty' ? 1 : 0,
    passeio: dailyState === 'complete' ? 1 : 0,
    xixi: 0, coco: 0, banho: 0,
  };

  // ── ActionConfigs via actionTheme (sem hardcode) ──────────
  const allActions: ActionConfig[] = [
    { key: 'comida',  emoji: '🍖', label: 'Comida',  color: actionTheme.comida.primary,  bg: actionTheme.comida.bg,  border: actionTheme.comida.border  },
    { key: 'agua',    emoji: '💧', label: 'Água',    color: actionTheme.agua.primary,    bg: actionTheme.agua.bg,    border: actionTheme.agua.border    },
    { key: 'passeio', emoji: '🐾', label: 'Passeio', color: actionTheme.passeio.primary, bg: actionTheme.passeio.bg, border: actionTheme.passeio.border },
    { key: 'xixi',    emoji: '🪣', label: 'Xixi',    color: actionTheme.xixi.primary,    bg: actionTheme.xixi.bg,    border: actionTheme.xixi.border    },
    { key: 'coco',    emoji: '💩', label: 'Cocô',    color: actionTheme.coco.primary,    bg: actionTheme.coco.bg,    border: actionTheme.coco.border    },
    { key: 'banho',   emoji: '🛁', label: 'Banho',   color: actionTheme.banho.primary,   bg: actionTheme.banho.bg,   border: actionTheme.banho.border   },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <ScalePress
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ChevronLeft size={22} strokeWidth={2} color={colors.textPrimary} />
        </ScalePress>

        <Text style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: 'Nunito_700Bold',
          fontSize: 17,
          color: colors.textPrimary,
        }}>
          Component Sandbox
        </Text>

        {/* Espaçador para centralizar o título */}
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 60, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ════════════════════════════════════════════════════
            1. ScalePress
            ════════════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════════════
            HEALTH INSIGHTS — banner crítico em 3 severidades + lista
            ════════════════════════════════════════════════════ */}
        <Section title="CriticalInsightBanner — alert">
          <CriticalInsightBanner
            insights={[mockInsight('alert', 'weight')]}
            pet={{ nome: 'Bidu', raca: 'Labrador Retriever', tipo: 'cachorro' }}
          />
        </Section>

        <Section title="CriticalInsightBanner — breed match">
          <CriticalInsightBanner
            insights={[mockInsight('alert', 'breed')]}
            pet={{ nome: 'Mel', raca: 'Cavalier King Charles Spaniel', tipo: 'cachorro' }}
          />
        </Section>

        <Section title="CriticalInsightBanner — appetite">
          <CriticalInsightBanner
            insights={[mockInsight('alert', 'appetite')]}
            pet={{ nome: 'Tom', raca: 'Persa', tipo: 'gato' }}
          />
        </Section>

        <Section title="HealthInsightsCard — lista (warning + info)">
          <HealthInsightsCard
            insights={[
              mockInsight('warning', 'hydration'),
              mockInsight('warning', 'stool'),
              mockInsight('info', 'exercise'),
            ]}
            onDismiss={(id) => showToast('info', `Insight "${id}" descartado`)}
          />
        </Section>

        <Section title="ScalePress">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ScalePress
              onPress={() => showToast('info', 'ScalePress pressionado!')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Botão normal"
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                paddingHorizontal: 20,
                paddingVertical: 12,
                ...softShadow,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Normal</Text>
            </ScalePress>

            <ScalePress
              disabled
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Botão desabilitado"
              style={{
                backgroundColor: colors.bgInput,
                borderRadius: 14,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: colors.textDisabled, fontWeight: '600' }}>Disabled</Text>
            </ScalePress>

            <ScalePress
              scaleValue={0.9}
              onPress={() => showToast('info', 'Scale 0.9 ativo!')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Botão com scale maior"
              style={{
                backgroundColor: actionTheme.passeio.bg,
                borderRadius: 14,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: actionTheme.passeio.border,
              }}
            >
              <Text style={{ color: actionTheme.passeio.primary, fontWeight: '600' }}>Scale 0.9</Text>
            </ScalePress>
          </View>
        </Section>

        {/* ════════════════════════════════════════════════════
            2. ActionButton
            ════════════════════════════════════════════════════ */}
        <Section title="ActionButton">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {allActions.map((action) => (
              <ActionButton
                key={action.key}
                action={action}
                count={actionCounts[action.key]}
                isUrgent={urgentActions[action.key]}
                onPress={() =>
                  setActionCounts((prev) => ({
                    ...prev,
                    [action.key]: prev[action.key] + 1,
                  }))
                }
              />
            ))}
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
            💧 Água com urgência ativa · Toque para incrementar
          </Text>
        </Section>

        {/* ════════════════════════════════════════════════════
            3. DailyProgress
            ════════════════════════════════════════════════════ */}
        <Section title="DailyProgress">
          {/* Seletor de estado */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['empty', 'partial', 'complete'] as const).map((state) => {
              const active = dailyState === state;
              return (
                <ScalePress
                  key={state}
                  onPress={() => setDailyState(state)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Estado ${state}`}
                  style={{
                    flex: 1,
                    backgroundColor: active ? actionTheme.passeio.bg : colors.bgInput,
                    borderRadius: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: active ? actionTheme.passeio.border : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: active ? actionTheme.passeio.primary : colors.textSecondary,
                  }}>
                    {state}
                  </Text>
                </ScalePress>
              );
            })}
          </View>

          <DailyProgress todayCounts={progressCounts} petTipo="cachorro" />

          <View style={{ marginTop: 4 }}>
            <DailyProgress todayCounts={{ comida: 1, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0 }} petTipo="gato" />
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            Linha inferior: tipo gato (2 metas)
          </Text>
        </Section>

        {/* ════════════════════════════════════════════════════
            4. EmptyState
            ════════════════════════════════════════════════════ */}
        <Section title="EmptyState">
          <EmptyState
            emoji="🐾"
            title="Nenhum registro ainda"
            subtitle="Registre as atividades do seu pet para acompanhar a rotina dele."
          />
          <EmptyState
            emoji="💊"
            title="Sem vacinas cadastradas"
            subtitle="Adicione a primeira vacina do seu pet e mantenha a saúde em dia."
            ctaLabel="Adicionar vacina"
            onCta={() => showToast('success', 'CTA de EmptyState pressionado!')}
            accentColor={actionTheme.xixi.primary}
            accentBg={actionTheme.xixi.bg}
          />
        </Section>

        {/* ════════════════════════════════════════════════════
            5. Skeleton
            ════════════════════════════════════════════════════ */}
        <Section title="Skeleton">
          {/* Blocos base */}
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              padding: 16,
              gap: 8,
              ...softShadow,
            }}
          >
            <Skeleton width="100%" height={20} borderRadius={8} />
            <Skeleton width="60%"  height={14} borderRadius={6} />
            <Skeleton width="80%"  height={14} borderRadius={6} />
            <Skeleton width="45%"  height={11} borderRadius={5} />
          </View>

          {/* SkeletonMemberCard */}
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              padding: 16,
              ...softShadow,
            }}
          >
            <SkeletonMemberCard />
            <SkeletonMemberCard />
            <SkeletonMemberCard />
          </View>

          {/* SkeletonPremiumDashboard */}
          <SkeletonPremiumDashboard />
        </Section>

        {/* ════════════════════════════════════════════════════
            6. Toast System
            ════════════════════════════════════════════════════ */}
        <Section title="Toast System">
          <View style={{ gap: 8 }}>
            {([
              { type: 'success' as const, label: 'Success',  message: 'Registro salvo com sucesso!' },
              { type: 'error'   as const, label: 'Error',    message: 'Não foi possível salvar. Tente novamente.' },
              { type: 'warning' as const, label: 'Warning',  message: 'Lembre-se de registrar a água do pet.' },
              { type: 'info'    as const, label: 'Info',     message: 'Dados sincronizados com a nuvem.' },
            ]).map(({ type, label, message }) => (
              <ScalePress
                key={type}
                onPress={() => showToast(type, message)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Disparar toast ${type}: ${message}`}
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...softShadow,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                  {label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  Disparar →
                </Text>
              </ScalePress>
            ))}
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            Toasts substituem o ativo atual (fila de 1)
          </Text>
        </Section>

        {/* ═══ DEV TOOLS ═══ */}
        <DevToolsSection />

        {/* ═══ SHARE CARDS PREVIEW ═══ */}
        <ShareCardsPreview />

        {/* ═══ Fase 10-11 ═══ */}

        <Section title="🥗 NutritionEntryCard (Fase 11)">
          <View style={{ gap: 12 }}>
            <NutritionEntryCard targetKcal={null} currentGoal={null} hasWeight={false} />
            <NutritionEntryCard targetKcal={null} currentGoal={null} hasWeight={true} />
            <NutritionEntryCard targetKcal={1240} currentGoal="maintain" hasWeight={true} />
            <NutritionEntryCard targetKcal={980} currentGoal="lose" hasWeight={true} />
            <NutritionEntryCard targetKcal={1610} currentGoal="gain" hasWeight={true} />
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            5 estados: sem peso → com peso sem plano → 3 objetivos
          </Text>
        </Section>

        <Section title="🔥 CalorieBadge (Fase 11)">
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 16 }}>
            <CalorieBadge
              intake={220}
              recommended={250}
              burned={45}
              status="Ingestão adequada para o dia!"
              statusTheme={{
                primary: '#047857',
                bg: '#f0fdf4',
                border: '#bbf7d0',
              }}
            />
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            Métricas + status badge — usado em WellnessCard e na nutrition screen
          </Text>
        </Section>

        <Section title="💚 WellnessCard (Fase 10)">
          <View style={{ gap: 12 }}>
            <WellnessCard todayFoodGrams={70} todayWalkMinutes={30} latestWeightKg={4.5} />
            <WellnessCard todayFoodGrams={120} todayWalkMinutes={0} latestWeightKg={4.5} />
            <WellnessCard todayFoodGrams={30} todayWalkMinutes={45} latestWeightKg={4.5} />
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            3 estados: adequado / acima / abaixo
          </Text>
        </Section>

        <Section title="💊 ChipGroup (Fase 10)">
          <ChipGroupDemo />
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            Chips com seleção única (allowDeselect default) e accessibility
          </Text>
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ChipGroup demo (precisa de state) ───────────────────────

const DEMO_GOAL_OPTS: ChipOption<NutritionGoal>[] = [
  { value: 'maintain', emoji: '⚖️', label: 'Manter peso' },
  { value: 'lose',     emoji: '📉', label: 'Emagrecer' },
  { value: 'gain',     emoji: '📈', label: 'Engordar' },
];

function ChipGroupDemo() {
  const { actionTheme } = useThemeColors();
  const [selected, setSelected] = useState<NutritionGoal | null>('maintain');
  return (
    <ChipGroup<NutritionGoal>
      options={DEMO_GOAL_OPTS}
      selected={selected}
      onSelect={setSelected}
      accentColor={actionTheme.comida.primary}
      accentBg={actionTheme.comida.bg}
      accentBorder={actionTheme.comida.border}
    />
  );
}

// ─── Dev Tools — seed de 14 dias de dados ─────────────────────

function DevToolsSection() {
  const { colors, actionTheme } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);
  const seedDemoData = usePetStore((s) => s.seedDemoData);
  const actionHistory = usePetStore((s) => s.actionHistory);
  const weightHistory = usePetStore((s) => s.weightHistory);
  const isPremium = usePetStore((s) => s.isPremium);
  const setPremiumStatus = usePetStore((s) => s.setPremiumStatus);

  const loadDemo = () => {
    seedDemoData({
      actionHistory: seedActionLogs(),
      weightHistory: seedWeightHistory(),
      vaccines:      seedVaccines(),
      appointments:  seedAppointments(),
    });
    showToast('success', 'Dados demo carregados! 14 dias simulados.');
  };

  const clearAll = () => {
    seedDemoData({
      actionHistory: [],
      weightHistory: [],
      vaccines:      [],
      appointments:  [],
    });
    showToast('info', 'Dados limpos.');
  };

  return (
    <Section title="🧪 Dev Tools">
      <View style={{ gap: 8 }}>
        <View style={{
          backgroundColor: colors.bgCard,
          borderRadius: 12, padding: 14,
          flexDirection: 'row', justifyContent: 'space-between',
        }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Logs atuais no store:
          </Text>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 13 }}>
            {actionHistory.length} ações · {weightHistory.length} pesos
          </Text>
        </View>
        <ScalePress
          onPress={loadDemo}
          accessible accessibilityRole="button"
          accessibilityLabel="Carregar dados demo"
          style={{
            backgroundColor: actionTheme.passeio.primary,
            borderRadius: 12, paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontFamily: 'Nunito_700Bold', fontSize: 14 }}>
            📥 Popular com 14 dias de dados
          </Text>
        </ScalePress>
        <ScalePress
          onPress={clearAll}
          accessible accessibilityRole="button"
          accessibilityLabel="Limpar todos os dados"
          style={{
            backgroundColor: colors.bgInput,
            borderRadius: 12, paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
            🗑️ Limpar dados
          </Text>
        </ScalePress>

        {/* Toggle Premium (dev only) */}
        <View style={{
          backgroundColor: colors.bgCard,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700', fontFamily: 'Nunito_700Bold' }}>
              👑 Simular Premium
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
              {isPremium ? 'ATIVO — Premium simulado' : 'DESATIVADO — usuário free'}
            </Text>
          </View>
          <ScalePress
            onPress={() => {
              setPremiumStatus(isPremium
                ? { isPremium: false, plan: null, expiresAt: null }
                : { isPremium: true, plan: 'annual', expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 }
              );
              showToast('success', isPremium ? 'Premium desativado' : 'Premium ativado (mock)');
            }}
            accessible accessibilityRole="switch"
            accessibilityState={{ checked: isPremium }}
            style={{
              backgroundColor: isPremium ? '#04A29B' : colors.bgInput,
              borderRadius: 18,
              paddingHorizontal: 16, paddingVertical: 8,
            }}
          >
            <Text style={{
              color: isPremium ? '#2C2B27' : colors.textSecondary,
              fontFamily: 'Nunito_700Bold',
              fontSize: 12, fontWeight: '700',
            }}>
              {isPremium ? 'ON' : 'OFF'}
            </Text>
          </ScalePress>
        </View>
      </View>
      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
        Seed gera histórico realista (2 refeições/dia, passeios, xixi/cocô, 2 banhos, 3 registros de peso, vacinas, consulta). Use para testar dashboard, plano nutricional e cards de share com dados reais.
      </Text>
    </Section>
  );
}

// ─── Share Cards Preview ──────────────────────────────────────

function ShareCardsPreview() {
  const { colors } = useThemeColors();
  const pet = usePetStore((s) => s.pet);

  // Dados mock para preview inline
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dailyGrid: DayData[] = DAYS.map((d, i) => ({
    dayLabel: d,
    date: `${10 + i}/04`,
    actions: {
      comida:  i < 6,
      agua:    i < 6,
      passeio: i < 5,
    },
    isComplete: i < 5,
  }));

  return (
    <Section title="📤 Cards de Compartilhamento (Preview)">
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
        Escala reduzida (0.75×) — os cards reais são 360×640 (9:16, formato story)
      </Text>

      <View style={{
        backgroundColor: colors.bgInput,
        borderRadius: 20, padding: 16, alignItems: 'center',
      }}>
        <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', marginBottom: 8 }}>
          RESUMO SEMANAL
        </Text>
        <View style={{ transform: [{ scale: 0.75 }], marginVertical: -80 }}>
          <WeeklyReportCard
            ref={null as any}
            petNome={pet.nome || 'Lolo'}
            petFoto={pet.foto}
            weekLabel="10/04 — 16/04"
            dailyGrid={dailyGrid}
            totals={{ meals: 14, water: 18, walks: 6, walkDuration: 210, foodGrams: 1450 }}
            previousTotals={{ meals: 11, water: 14, walks: 5, walkDuration: 150, foodGrams: 1200 }}
            streak={6}
            latestWeight={5.2}
            previousWeight={5.0}
          />
        </View>
      </View>

      <View style={{
        backgroundColor: colors.bgInput,
        borderRadius: 20, padding: 16, alignItems: 'center', marginTop: 12,
      }}>
        <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', marginBottom: 8 }}>
          MILESTONE (30 DIAS)
        </Text>
        <View style={{ transform: [{ scale: 0.75 }], marginVertical: -80 }}>
          <SocialCardView
            ref={null as any}
            petNome={pet.nome || 'Lolo'}
            petFoto={pet.foto}
            milestone={30}
            streak={30}
          />
        </View>
      </View>

      <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 8 }}>
        Estes cards são renderizados off-screen e exportados como imagem JPEG para compartilhamento no Instagram/WhatsApp.
      </Text>

      {/* ── Streak milestones — todos os marcos catalogados ─────── */}
      <View style={{
        backgroundColor: colors.bgInput,
        borderRadius: 20, padding: 16, marginTop: 12,
      }}>
        <Text style={{
          color: colors.textTertiary, fontSize: 11, fontWeight: '600',
          marginBottom: 12,
        }}>
          STREAK MILESTONES — TODOS OS COPYS
        </Text>
        {Object.entries(MILESTONE_DATA).map(([days, info]) => (
          <View
            key={days}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 24 }}>{info.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.textPrimary, fontWeight: '700',
                fontFamily: 'Nunito_700Bold', fontSize: 14,
              }}>
                {days} dias · {info.title}
              </Text>
              <Text style={{
                color: colors.textSecondary, fontSize: 12,
                marginTop: 2, lineHeight: 17,
              }}>
                {info.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

// ─── Mocks pra showcase do HealthInsights ─────────────────────────────

function mockInsight(
  severity: 'info' | 'warning' | 'alert',
  category: HealthInsight['category'],
): HealthInsight {
  const seed = `${severity}_${category}`;
  switch (category) {
    case 'weight':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Possível perda de peso',
        message: 'Variação de 7,2% nas últimas 2 semanas (12,5kg → 11,6kg).',
        suggestion: 'Recomendamos marcar consulta com o veterinário.',
        detectedAt: Date.now(),
        evidence: { fromKg: 12.5, toKg: 11.6, days: 14, pct: -7.2 },
      };
    case 'breed':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Sinal compatível com predisposição racial',
        message: 'Cavalier King Charles tem alta predisposição a doença da valva mitral. Você registrou 2 episódios compatíveis nos últimos 30 dias.',
        suggestion: 'Mencione esse padrão ao veterinário.',
        detectedAt: Date.now(),
        evidence: { breed: 'Cavalier King Charles Spaniel', condition: 'Doença da valva mitral', hits: 2 },
      };
    case 'appetite':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Queda forte de apetite',
        message: 'Nos últimos 3 dias o pet comeu cerca de 30% do habitual.',
        suggestion: 'Recomendamos avaliação veterinária.',
        detectedAt: Date.now(),
      };
    case 'hydration':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Sem registro de água há mais de 24h',
        message: 'Não há registro de hidratação nas últimas horas.',
        suggestion: 'Confirme se o pet está bebendo água.',
        detectedAt: Date.now(),
      };
    case 'stool':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Possível diarreia',
        message: '3 registros de fezes líquidas em 3 dias.',
        suggestion: 'Mantenha hidratado e procure veterinário se persistir.',
        detectedAt: Date.now(),
      };
    case 'exercise':
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Pet está se exercitando menos que o ideal',
        message: 'Média de 25 min/dia nos últimos 7 dias. Border Collie precisa de ~120 min/dia.',
        suggestion: 'Tente aumentar gradualmente o tempo dos passeios.',
        detectedAt: Date.now(),
      };
    default:
      return {
        id: `mock_${seed}`, severity, category,
        title: 'Insight de teste',
        message: 'Mensagem de exemplo para o sandbox.',
        suggestion: 'Sugestão de exemplo.',
        detectedAt: Date.now(),
      };
  }
}
