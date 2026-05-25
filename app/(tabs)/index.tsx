import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View, Text, Image, Pressable, SafeAreaView,
  Platform, Modal, TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, AppState, Alert, Linking,
} from 'react-native';
// Shared element transitions not available in Reanimated v4.1.7 — kept for future upgrade
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { usePetStore } from '@/store/usePetStore';
import { useWeather } from '@/hooks/useWeather';
import { useThemeColors } from '@/hooks/useThemeColors';
import { requestPermissionsAsync } from '@/services/NotificationService';
import { ScalePress } from '@/components/ui/ScalePress';
import { PetPhoto } from '@/components/PetPhoto';
import { DailyProgress } from '@/components/home/DailyProgress';
import { ActionButton } from '@/components/home/ActionButton';
import type { ActionConfig } from '@/components/home/ActionButton';
import {
  Settings, Check, ChevronDown, Plus, Crown,
  Utensils, Droplet, Footprints, Droplets,
  CheckCircle2, MinusCircle, XCircle, Waves, Square,
  Trophy, CalendarDays, Scale, TrendingUp,
} from 'lucide-react-native';
import { PoopIcon } from '@/components/icons/PoopIcon';
import { getLocalToday, tsToLocalYMD } from '@/lib/dateLocal';
import { NotificationAskSheet } from '@/components/ui/NotificationAskSheet';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';
import { MilestoneSheet } from '@/components/ui/MilestoneSheet';
import { PremiumTriggerSheet } from '@/components/ui/PremiumTriggerSheet';
import { usePremiumTriggers } from '@/hooks/usePremiumTriggers';
import { WellnessCard } from '@/components/home/WellnessCard';
import { NutritionEntryCard } from '@/components/home/NutritionEntryCard';
import { HealthInsightsCard } from '@/components/home/HealthInsightsCard';
import { InsightsPremiumGate } from '@/components/home/InsightsPremiumGate';
import { CriticalInsightBanner } from '@/components/home/CriticalInsightBanner';
import { analyzeHealth } from '@/services/HealthInsights';
import { useSmartHealthNotifications } from '@/hooks/useSmartHealthNotifications';
import { BirthdayCard } from '@/components/home/BirthdayCard';
import { ActivityMilestoneCard } from '@/components/home/ActivityMilestoneCard';
import { PetHero } from '@/components/home/PetHero';
import { QuickStats } from '@/components/home/QuickStats';
import { calculateGoalCalories, kcalForGoal, estimateLifeStage, ageFromBirth, petTypeToSpecies, DEFAULT_FOOD_KCAL_PER_GRAM } from '@/data/calories';
import { getBreedSize } from '@/data/breed-meta';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ChipGroup, QuickAmount } from '@/components/ui/ChipGroup';
import type { ChipOption } from '@/components/ui/ChipGroup';
import { WeeklyReportCard } from '@/components/ui/WeeklyReportCard';
import type { DayData } from '@/components/ui/WeeklyReportCard';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { useToastStore } from '@/store/useToastStore';
import type { ActionKey, PetType, Acceptance, Consistency, Appearance } from '@/types/pet';

// Milestones de streak que disparam MilestoneSheet. Mantido sincronizado
// com MILESTONE_DATA em components/ui/MilestoneSheet.tsx — adicionar aqui
// e lá pra novo marco aparecer.
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;

// ─── Opções dos chips (escopo do módulo) ─────────────────────

const ACCEPTANCE_OPTS: ChipOption<Acceptance>[] = [
  { value: 'full',    Icon: CheckCircle2, label: 'Comeu tudo' },
  { value: 'partial', Icon: MinusCircle,  label: 'Parcial' },
  { value: 'refused', Icon: XCircle,      label: 'Recusou' },
];

const WATER_ACCEPTANCE_OPTS: ChipOption<Acceptance>[] = [
  { value: 'full',    Icon: CheckCircle2, label: 'Bebeu bem' },
  { value: 'partial', Icon: MinusCircle,  label: 'Pouca' },
  { value: 'refused', Icon: XCircle,      label: 'Recusou' },
];

const CONSISTENCY_OPTS: ChipOption<Consistency>[] = [
  { value: 'normal', Icon: CheckCircle2, label: 'Normal' },
  { value: 'soft',   Icon: Waves,        label: 'Mole' },
  { value: 'liquid', Icon: Droplet,      label: 'Líquida' },
  { value: 'hard',   Icon: Square,       label: 'Dura' },
];

const APPEARANCE_OPTS: ChipOption<Appearance>[] = [
  { value: 'normal',   Icon: CheckCircle2, label: 'Normal' },
  { value: 'abnormal', Icon: MinusCircle,  label: 'Alterada' },
];

// ─── Helpers de UI ───────────────────────────────────────────

function FieldLabel({ children, color, mt }: { children: React.ReactNode; color: string; mt?: number }) {
  return (
    <Text style={{
      color, fontSize: 12, fontWeight: '700',
      letterSpacing: 0.4, textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: mt ?? 0,
    }}>
      {children}
    </Text>
  );
}

function inputBoxStyle(colors: { bgInput: string; textPrimary: string }) {
  return {
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    paddingHorizontal: 16 as const,
    paddingVertical: 12 as const,
    fontSize: 15 as const,
    color: colors.textPrimary,
  };
}

function notePlaceholder(key?: ActionKey): string {
  switch (key) {
    case 'comida':  return 'Ex: Começou rápido, mastigou devagar...';
    case 'agua':    return 'Ex: Bebeu muita água hoje';
    case 'passeio': return 'Algo diferente hoje? (latidos, outros cães...)';
    case 'xixi':    return 'Ex: Cor normal, sem cheiro estranho';
    case 'coco':    return 'Ex: Fezes normais, sem restos';
    case 'banho':   return 'Ex: Usei shampoo hipoalergênico';
    default:        return 'Observações (opcional)';
  }
}

// ─── Limiares de urgência temporal ───────────────────────────
const URGENT_WATER_MS = 6  * 60 * 60 * 1000;  // 6 horas
const URGENT_FOOD_MS  = 10 * 60 * 60 * 1000;  // 10 horas

// ─── Helper: alerta quando user nega permissão de notificação ─
// Auditoria adversarial (finding #20): toast genérico "você pode
// mudar em Ajustes" é fraco — user fica perdido no caminho. Alert
// com action button leva direto pro app settings via Linking.
function showNotificationDeniedAlert(): void {
  Alert.alert(
    'Lembretes desativados',
    'Pra ativar lembretes de comida, água e passeio, libere a permissão de notificações de Ajustes do iOS/Android.',
    [
      { text: 'Agora não', style: 'cancel' },
      {
        text: 'Abrir Ajustes',
        onPress: () => {
          // openSettings funciona nos 2 OS — abre a tela de permissões
          // do CronoPet diretamente. Falha silenciosa em caso raro
          // (ex.: dispositivo bloqueado por MDM corporativo).
          Linking.openSettings().catch(() => { /* no-op */ });
        },
      },
    ],
  );
}

// ─── Dashboard ────────────────────────────────────────────────

export default function PetDashboard() {
  const router = useRouter();
  const { colors, actionTheme, isDark } = useThemeColors();

  // ── Cores semânticas adaptadas ao tema ───────────────────────
  const errorBg      = isDark ? 'rgba(220,38,38,0.18)' : '#fef2f2';
  const errorBorder  = isDark ? 'rgba(220,38,38,0.35)' : '#fecaca';
  const errorText    = isDark ? '#fca5a5'              : '#991b1b';
  const errorSubtext = isDark ? '#f87171'              : '#dc2626';
  const modalOverlay = isDark ? 'rgba(0,0,0,0.55)'    : 'rgba(28,25,23,0.35)';

  // ── Ações do pet — dinâmicas via actionTheme ─────────────────
  // Migração 2026-05-15: emojis removidos. Cada ação usa um ícone com
  // semântica clara: Utensils=comida, Droplet=água, Footprints=passeio,
  // Droplets=xixi (gota dupla, distinto da água), PoopIcon=cocô (SVG
  // custom — feedback TestFlight "Sprout não faz sentido"; agora silhueta
  // clássica de tufo, reconhecível sem precisar emoji), Bath=banho.
  // R3-7 (TestFlight): banho NÃO é tarefa diária — sai do dashboard
  // principal. Continua registrável programaticamente (logs antigos
  // ainda renderizam em histórico, photos, etc.) mas o tutor não vê
  // botão grande "Banho" no Home pressionando ele a registrar todo dia.
  const ALL_ACTIONS = useMemo<ActionConfig[]>(() => [
    { key: 'comida',  Icon: Utensils,   label: 'Comida',  color: actionTheme.comida.primary,  bg: actionTheme.comida.bg,  border: actionTheme.comida.border  },
    { key: 'agua',    Icon: Droplet,    label: 'Água',    color: actionTheme.agua.primary,    bg: actionTheme.agua.bg,    border: actionTheme.agua.border    },
    { key: 'passeio', Icon: Footprints, label: 'Passeio', color: actionTheme.passeio.primary, bg: actionTheme.passeio.bg, border: actionTheme.passeio.border },
    { key: 'xixi',    Icon: Droplets,   label: 'Xixi',    color: actionTheme.xixi.primary,    bg: actionTheme.xixi.bg,    border: actionTheme.xixi.border    },
    { key: 'coco',    Icon: PoopIcon,   label: 'Cocô',    color: actionTheme.coco.primary,    bg: actionTheme.coco.bg,    border: actionTheme.coco.border    },
  ], [actionTheme]);

  // ── Store ────────────────────────────────────────────────────
  const pet                = usePetStore((s) => s.pet);
  // DB-002 onda 3: multi-pet UI
  const pets               = usePetStore((s) => s.pets);
  const activePetId        = usePetStore((s) => s.activePetId);
  const setActivePet       = usePetStore((s) => s.setActivePet);
  const streak             = usePetStore((s) => s.streak);
  const isPremium          = usePetStore((s) => s.isPremium);
  const actionHistoryRaw   = usePetStore((s) => s.actionHistory);
  // DB-002 onda 3: filtrar histórico pelo pet ativo. Logs antigos sem
  // petId (pré-migration) ficam visíveis em todos os pets (compat).
  const actionHistory = useMemo(() =>
    actionHistoryRaw.filter((l) => !l.petId || l.petId === activePetId),
  [actionHistoryRaw, activePetId]);
  const addActionLog       = usePetStore((s) => s.addActionLog);
  const checkAndResetDay   = usePetStore((s) => s.checkAndResetDay);
  const shownMilestones    = usePetStore((s) => s.shownMilestones);
  const shownActivityMilestones = usePetStore((s) => s.shownActivityMilestones);
  const markActivityMilestoneShown = usePetStore((s) => s.markActivityMilestoneShown);
  const markMilestoneShown = usePetStore((s) => s.markMilestoneShown);

  const weather = useWeather();
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  // Welcome tour (feedback TestFlight #13): aparece UMA vez após o
  // onboarding inicial. State global no store pra persistir e nunca
  // reaparecer (a menos que user resete via settings).
  const hasCompletedTour    = usePetStore((s) => s.hasCompletedTour);
  const setHasCompletedTour = usePetStore((s) => s.setHasCompletedTour);
  const hasOnboarded        = usePetStore((s) => s.hasOnboarded);
  const showTour            = hasOnboarded && !hasCompletedTour;

  const [modalAction, setModalAction] = useState<ActionConfig | null>(null);
  const [logNote, setLogNote]         = useState('');
  const [logPhoto, setLogPhoto]       = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [logQuantity, setLogQuantity] = useState('');   // gramas — comida
  const [logVolumeMl, setLogVolumeMl] = useState('');   // ml — agua
  const [logDuration, setLogDuration] = useState('');   // minutos — passeio
  const [subXixi, setSubXixi]         = useState(false);
  const [subCoco, setSubCoco]         = useState(false);
  const [logAcceptance,  setLogAcceptance]  = useState<Acceptance | null>(null);
  const [logConsistency, setLogConsistency] = useState<Consistency | null>(null);
  const [logAppearance,  setLogAppearance]  = useState<Appearance | null>(null);

  const weightHistory       = usePetStore((s) => s.weightHistory);
  const medicalEvents       = usePetStore((s) => s.medicalEvents);
  const dismissedInsightIds = usePetStore((s) => s.dismissedInsightIds);
  const dismissInsight      = usePetStore((s) => s.dismissInsight);
  const snoozedInsights     = usePetStore((s) => s.snoozedInsights);
  const disabledInsightCategories = usePetStore((s) => s.disabledInsightCategories);
  const showToast           = useToastStore((s) => s.showToast);

  // ── Health Insights (heurística + raça-aware) ─────────────
  // Snooze ativo conta como dismiss temporário pra a lista do dashboard.
  const effectiveDismissedIds = useMemo(() => {
    const now = Date.now();
    const active = Object.entries(snoozedInsights)
      .filter(([_, until]) => until > now)
      .map(([id]) => id);
    return [...dismissedInsightIds, ...active];
  }, [dismissedInsightIds, snoozedInsights]);

  const healthInsights = useMemo(
    () => analyzeHealth({
      pet: { tipo: pet.tipo, raca: pet.raca, idealWeightKg: pet.idealWeightKg, nascimento: pet.nascimento },
      actionHistory,
      weightHistory,
      medicalEvents,
      dismissedIds: effectiveDismissedIds,
      ambientTempC: weather.temp ?? null,
      disabledCategories: disabledInsightCategories,
    }),
    [pet.tipo, pet.raca, pet.idealWeightKg, pet.nascimento, actionHistory, weightHistory, medicalEvents, effectiveDismissedIds, weather.temp, disabledInsightCategories],
  );

  // Insights brutos (sem dismiss/snooze, mas com categorias respeitadas) —
  // usados pelo banner crítico que tem suas próprias regras de snooze.
  const allInsights = useMemo(
    () => analyzeHealth({
      pet: { tipo: pet.tipo, raca: pet.raca, idealWeightKg: pet.idealWeightKg, nascimento: pet.nascimento },
      actionHistory,
      weightHistory,
      medicalEvents,
      ambientTempC: weather.temp ?? null,
      disabledCategories: disabledInsightCategories,
    }),
    [pet.tipo, pet.raca, pet.idealWeightKg, pet.nascimento, actionHistory, weightHistory, medicalEvents, weather.temp, disabledInsightCategories],
  );

  // Push notification inteligente — agenda alerta pra próxima manhã
  // quando há insight crítico ainda não notificado.
  useSmartHealthNotifications(allInsights, pet);

  // ── Resumo Semanal ────────────────────────────────────────
  const weeklyCardRef = useRef<View>(null);
  const [sharingWeekly, setSharingWeekly] = useState(false);

  // ── Pet switcher ──────────────────────────────────────────
  const [showPetSwitcher,  setShowPetSwitcher]  = useState(false);

  // ── Milestone sheet ───────────────────────────────────────
  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);

  useEffect(() => {
    if (streak === 0) return;
    const pending = STREAK_MILESTONES.find(
      (m) => streak >= m && !shownMilestones.includes(m),
    );
    if (!pending) return;
    // Delay: 3.5s — espera toast sumir + celebração do DailyProgress
    const timer = setTimeout(() => setMilestoneToShow(pending), 3500);
    return () => clearTimeout(timer);
  }, [streak, shownMilestones]);

  // Auto-mark activity milestones após 10s — evita celebrar o mesmo
  // marco indefinidamente, mas dá tempo do usuário ver o card
  useEffect(() => {
    const counts: Record<string, number> = {};
    actionHistory.forEach((l) => { counts[l.key] = (counts[l.key] ?? 0) + 1; });
    const ms: { id: string; count: number }[] = [];
    const MILESTONES: Record<string, number[]> = {
      comida: [50, 100, 250, 500, 1000],
      agua:   [50, 100, 250, 500, 1000],
      passeio:[10, 25, 50, 100, 200, 500],
      xixi:   [100, 500],
      coco:   [100, 500],
      banho:  [5, 10, 25, 50],
    };
    Object.entries(counts).forEach(([k, c]) => {
      const reached = (MILESTONES[k] ?? []).filter((m) => c >= m);
      if (reached.length === 0) return;
      const top = reached[reached.length - 1];
      const id = `${k}-${top}`;
      if (!shownActivityMilestones.includes(id)) {
        ms.push({ id, count: top });
      }
    });
    if (ms.length === 0) return;
    const timer = setTimeout(() => {
      ms.forEach((m) => markActivityMilestoneShown(m.id));
    }, 10000);
    return () => clearTimeout(timer);
  }, [actionHistory, shownActivityMilestones, markActivityMilestoneShown]);

  // ── Premium trigger (prompt contextual) ─────────────────
  // DEV NOTE 2026-05-15: temporariamente desabilitado pra screenshot da home.
  // Reabilitar removendo o `false &&` quando o modal for redesenhado.
  const { pendingTrigger: _pt, dismissTrigger } = usePremiumTriggers();
  const pendingTrigger = false ? _pt : null;
  const [activeTrigger, setActiveTrigger] = useState<typeof pendingTrigger>(null);

  useEffect(() => {
    // Só dispara se há trigger pendente + nenhum outro modal rolando
    // + delay de 4s pra não sobrecarregar a primeira impressão
    if (!pendingTrigger || milestoneToShow !== null || showNotifAsk) return;
    const t = setTimeout(() => setActiveTrigger(pendingTrigger), 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTrigger?.id, milestoneToShow]);

  // ── Soft Ask de notificações ──────────────────────────────
  const [showNotifAsk, setShowNotifAsk] = useState(false);
  // Só dispara se ainda não pediu permissão e notifStatus é undetermined
  const handleFirstComplete = useCallback(() => {
    if (notifStatus === 'undetermined') {
      // Pequeno delay para não colidir com a animação de celebração
      setTimeout(() => setShowNotifAsk(true), 1200);
    }
  }, [notifStatus]);

  // R4-2: chama no mount + sempre que o app volta de background.
  // Sem o AppState listener, user que deixava o app aberto às 23h e
  // voltava às 01h continuava com "todayDate=ontem" até reabrir o app
  // do zero. Combinado com o fix UTC→local em getTodayString, garante
  // virada de dia confiável.
  useEffect(() => {
    checkAndResetDay();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAndResetDay();
    });
    return () => sub.remove();
  }, [checkAndResetDay]);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => setNotifStatus(status))
      .catch(() => setNotifStatus('denied'));
  }, []);

  // ── Contagens de hoje + métricas de wellness ─────────────
  const { todayCounts, todayFoodGrams, todayWalkMinutes } = useMemo(() => {
    const today = getLocalToday();
    const counts: Record<ActionKey, number> = {
      comida: 0, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0, tosa: 0,
    };
    let foodGrams = 0;
    let walkMinutes = 0;
    actionHistory.forEach((log) => {
      if (tsToLocalYMD(log.timestamp) === today) {
        counts[log.key] = (counts[log.key] ?? 0) + 1;
        if (log.subActions) {
          log.subActions.forEach((sub) => { counts[sub] = (counts[sub] ?? 0) + 1; });
        }
        if (log.key === 'comida' && log.quantity) foodGrams += log.quantity;
        if (log.key === 'passeio' && log.duration) walkMinutes += log.duration;
      }
    });
    return { todayCounts: counts, todayFoodGrams: foodGrams, todayWalkMinutes: walkMinutes };
  }, [actionHistory]);

  const latestWeight = useMemo(() => {
    if (weightHistory.length === 0) return null;
    return [...weightHistory].sort((a, b) => b.data.localeCompare(a.data))[0].peso;
  }, [weightHistory]);

  const nutritionTargetKcal = useMemo(() => {
    if (latestWeight === null) return null;
    const species = petTypeToSpecies(pet.tipo);
    const size = pet.petSize ?? getBreedSize(pet.raca, pet.tipo);
    const ageYears = ageFromBirth(pet.nascimento);
    const lifeStage = estimateLifeStage(ageYears, species, size);
    const goals = calculateGoalCalories({
      currentKg: latestWeight,
      idealKg: pet.idealWeightKg,
      species,
      lifeStage,
      neutered: pet.neutered ?? false,
      activity: pet.baselineActivity ?? 'moderate',
    });
    return kcalForGoal(goals, pet.nutritionGoal ?? 'maintain');
  }, [latestWeight, pet.tipo, pet.petSize, pet.raca, pet.nascimento, pet.idealWeightKg, pet.neutered, pet.baselineActivity, pet.nutritionGoal]);

  // Label de progresso calórico para o botão Comida
  // Só ativa se: usuário configurou um plano (`pet.nutritionGoal` salvo)
  // E há registros com quantidade hoje
  const comidaProgressLabel = useMemo<string | undefined>(() => {
    if (nutritionTargetKcal === null || pet.nutritionGoal === undefined) return undefined;
    if (todayFoodGrams <= 0) return undefined;
    const intakeKcal = Math.round(todayFoodGrams * DEFAULT_FOOD_KCAL_PER_GRAM);
    return `${intakeKcal}/${nutritionTargetKcal} kcal`;
  }, [nutritionTargetKcal, pet.nutritionGoal, todayFoodGrams]);

  // ── Stats agregados para QuickStats ──────────────────────
  const { daysComplete, daysActive } = useMemo(() => {
    const byDay: Record<string, Set<ActionKey>> = {};
    actionHistory.forEach((log) => {
      const day = tsToLocalYMD(log.timestamp);
      if (!byDay[day]) byDay[day] = new Set();
      byDay[day].add(log.key);
    });
    let complete = 0;
    Object.values(byDay).forEach((set) => {
      if (set.has('comida') && set.has('agua')) complete += 1;
    });
    return {
      daysComplete: complete,
      daysActive:   Object.keys(byDay).length,
    };
  }, [actionHistory]);

  const actions = useMemo(() =>
    pet.tipo === 'gato' ? ALL_ACTIONS.filter((a) => a.key !== 'passeio') : ALL_ACTIONS,
  [ALL_ACTIONS, pet.tipo]);

  const totalDone     = actions.filter((a) => (todayCounts[a.key] ?? 0) > 0).length;
  const isDayComplete = (todayCounts['comida'] ?? 0) >= 1 && (todayCounts['agua'] ?? 0) >= 1;
  const currentHour   = new Date().getHours();
  const streakAtRisk  = !isDayComplete && currentHour >= 18 && streak > 0;
  const showWellnessCard = latestWeight !== null && todayFoodGrams > 0;

  // ── Contagem de fotos (para entry point da galeria) ──────
  const photoCount = useMemo(() => {
    return actionHistory.filter((l) => !!l.photo).length;
  }, [actionHistory]);

  // ── Dados do resumo semanal ──────────────────────────────
  const weeklyData = useMemo(() => {
    const now   = new Date();
    const days: DayData[] = [];
    const DAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    type Totals = { meals: number; water: number; walks: number; walkDuration: number; foodGrams: number };
    const empty = (): Totals => ({ meals: 0, water: 0, walks: 0, walkDuration: 0, foodGrams: 0 });
    const totals = empty();
    const previousTotals = empty();

    // Semana atual: 7 dias até hoje (i=6..0)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = tsToLocalYMD(d.getTime());
      const dayLogs = actionHistory.filter(
        (l) => new Date(l.timestamp).toISOString().slice(0, 10) === ds,
      );
      const acts: Record<string, boolean> = {};
      (['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho'] as const).forEach((k) => {
        acts[k] = dayLogs.some((l) => l.key === k);
      });
      const cmplt = dayLogs.some((l) => l.key === 'comida') && dayLogs.some((l) => l.key === 'agua');
      days.push({
        dayLabel: DAYS[d.getDay()],
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        actions: acts,
        isComplete: cmplt,
      });
      totals.meals += dayLogs.filter((l) => l.key === 'comida').length;
      totals.water += dayLogs.filter((l) => l.key === 'agua').length;
      totals.walks += dayLogs.filter((l) => l.key === 'passeio').length;
      dayLogs.forEach((l) => {
        if (l.key === 'passeio' && l.duration) totals.walkDuration += l.duration;
        if (l.key === 'comida' && l.quantity) totals.foodGrams += l.quantity;
      });
    }

    // Semana anterior: 7 dias entre 13 e 7 dias atrás (i=13..7)
    for (let i = 13; i >= 7; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = tsToLocalYMD(d.getTime());
      const dayLogs = actionHistory.filter(
        (l) => new Date(l.timestamp).toISOString().slice(0, 10) === ds,
      );
      previousTotals.meals += dayLogs.filter((l) => l.key === 'comida').length;
      previousTotals.water += dayLogs.filter((l) => l.key === 'agua').length;
      previousTotals.walks += dayLogs.filter((l) => l.key === 'passeio').length;
      dayLogs.forEach((l) => {
        if (l.key === 'passeio' && l.duration) previousTotals.walkDuration += l.duration;
        if (l.key === 'comida' && l.quantity) previousTotals.foodGrams += l.quantity;
      });
    }

    const start = new Date(now); start.setDate(start.getDate() - 6);
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;

    // Peso da semana anterior (mais recente registrado em D-7..D-13)
    const weekAgoTs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const previousWeight = (() => {
      const old = weightHistory.filter((w) => {
        const [y, m, d] = w.data.split('-').map(Number);
        return new Date(y, m - 1, d).getTime() <= weekAgoTs;
      });
      if (old.length === 0) return null;
      return [...old].sort((a, b) => b.data.localeCompare(a.data))[0].peso;
    })();

    // Houve algum log na semana anterior? Só mostrar deltas se sim
    const hasPreviousData =
      previousTotals.meals > 0 ||
      previousTotals.water > 0 ||
      previousTotals.walks > 0;

    return {
      dailyGrid: days,
      weekLabel: `${fmt(start)} — ${fmt(now)}`,
      totals,
      previousTotals: hasPreviousData ? previousTotals : undefined,
      previousWeight,
    };
  }, [actionHistory, weightHistory]);

  const handleShareWeekly = useCallback(async () => {
    if (!weeklyCardRef.current) return;
    setSharingWeekly(true);
    try {
      const uri = await captureRef(weeklyCardRef.current, { format: 'jpg', quality: 0.92 });
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
    } catch {
      showToast('error', 'Não foi possível compartilhar.');
    } finally {
      setSharingWeekly(false);
    }
  }, [showToast]);

  // ── Urgência temporal ─────────────────────────────────────
  // Calcula o último timestamp de cada ação (global, não só hoje)
  const lastActionTime = useMemo<Record<ActionKey, number | null>>(() => {
    const map: Record<ActionKey, number | null> = {
      comida: null, agua: null, passeio: null, xixi: null, coco: null, banho: null, tosa: null,
    };
    actionHistory.forEach((log) => {
      const prev = map[log.key];
      if (prev === null || log.timestamp > prev) map[log.key] = log.timestamp;
    });
    return map;
  }, [actionHistory]);

  // Mapa booleano de urgência por ação — recalculado quando o histórico muda
  const urgentMap = useMemo<Record<ActionKey, boolean>>(() => {
    if (actionHistory.length === 0) {
      // Primeiro uso: sem urgência (evita falsos alertas)
      return { comida: false, agua: false, passeio: false, xixi: false, coco: false, banho: false, tosa: false };
    }
    const now = Date.now();
    const urgentWater = lastActionTime.agua   === null || (now - lastActionTime.agua)   > URGENT_WATER_MS;
    const urgentFood  = lastActionTime.comida === null || (now - lastActionTime.comida) > URGENT_FOOD_MS;
    return {
      comida: urgentFood,
      agua:   urgentWater,
      passeio: false,
      xixi:    false,
      coco:    false,
      banho:   false,
      tosa:    false,
    };
  }, [lastActionTime, actionHistory.length]);

  const handleEnableNotifications = useCallback(async () => {
    // Antes haptics era chamado direto — em devices antigos podia throw
    // antes do request, abortando o fluxo todo. Agora envolvemos tudo.
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* haptic ausente — segue */ }
    const granted = await requestPermissionsAsync(); // já é try/catch-safe
    try {
      Haptics.notificationAsync(
        granted
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch { /* segue */ }
    setNotifStatus(granted ? 'granted' : 'denied');
    if (granted) {
      showToast('success', 'Lembretes ativados!');
    } else {
      showNotificationDeniedAlert();
    }
  }, [showToast]);

  const openModal = useCallback((action: ActionConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalAction(action);
    setLogNote('');
    setLogPhoto(null);
    setLogQuantity('');
    setLogVolumeMl('');
    setLogDuration('');
    setSubXixi(false);
    setSubCoco(false);
    setLogAcceptance(null);
    setLogConsistency(null);
    setLogAppearance(null);
  }, []);

  const handlePickLogPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) setLogPhoto(result.assets[0].uri);
  }, []);

  const handleSaveLog = useCallback(async () => {
    if (!modalAction || saving) return;
    setSaving(true);

    const extra: {
      quantity?:    number;
      duration?:    number;
      subActions?:  ActionKey[];
      volumeMl?:    number;
      acceptance?:  Acceptance;
      consistency?: Consistency;
      appearance?:  Appearance;
    } = {};

    if (modalAction.key === 'comida') {
      if (logQuantity.trim()) {
        const q = parseInt(logQuantity, 10);
        if (q > 0) extra.quantity = q;
      }
      if (logAcceptance) extra.acceptance = logAcceptance;
    }
    if (modalAction.key === 'agua') {
      if (logVolumeMl.trim()) {
        const v = parseInt(logVolumeMl, 10);
        if (v > 0) extra.volumeMl = v;
      }
      if (logAcceptance) extra.acceptance = logAcceptance;
    }
    if (modalAction.key === 'passeio') {
      if (logDuration.trim()) {
        const d = parseInt(logDuration, 10);
        if (d > 0) extra.duration = d;
      }
      const subs: ActionKey[] = [];
      if (subXixi) subs.push('xixi');
      if (subCoco) subs.push('coco');
      if (subs.length > 0) extra.subActions = subs;
    }
    if (modalAction.key === 'xixi') {
      if (logAppearance) extra.appearance = logAppearance;
    }
    if (modalAction.key === 'coco') {
      if (logConsistency) extra.consistency = logConsistency;
      if (logAppearance) extra.appearance = logAppearance;
    }

    await addActionLog(
      modalAction.key,
      logPhoto ?? undefined,
      logNote || undefined,
      Object.keys(extra).length > 0 ? extra : undefined,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    setModalAction(null);
  }, [modalAction, logNote, logPhoto, logQuantity, logVolumeMl, logDuration, subXixi, subCoco, logAcceptance, logConsistency, logAppearance, saving, addActionLog]);

  // ── Greeting contextual ───────────────────────────────────
  const greeting = getSmartGreeting(pet.nome, todayCounts, pet.tipo, isDayComplete, currentHour);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header compacto */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>{greeting}</Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPetSwitcher(true); }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Pet atual: ${pet.nome}. Toque para trocar de pet.`}
              scaleValue={0.97}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
            >
              <Text style={{
                color: colors.textPrimary, fontSize: 26, fontWeight: '800',
                fontFamily: 'Nunito_800ExtraBold',
              }}>
                {pet.nome}
              </Text>
              <ChevronDown size={20} strokeWidth={2.5} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            </ScalePress>
          </View>
          <ScalePress
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Configurações"
            style={{
              backgroundColor: colors.bgCard, borderRadius: 14, width: 44, height: 44,
              alignItems: 'center', justifyContent: 'center',
              ...(Platform.OS === 'android' ? { elevation: 2 } : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6 }),
            }}
          >
            <Settings size={20} color={colors.textPrimary} strokeWidth={2} />
          </ScalePress>
        </View>

        {/* Pet Hero redesenhado */}
        <PetHero
          nome={pet.nome}
          foto={pet.foto}
          tipo={pet.tipo}
          raca={pet.raca}
          idadeLabel={pet.nascimento ? getPetAge(pet.nascimento) : undefined}
          streak={streak}
        />

        {/* Banner crítico — só aparece com insight severity=alert ativo */}
        <CriticalInsightBanner insights={allInsights} pet={pet} />

        {/* Quick Stats Strip — sem emoji, ícones Lucide */}
        <QuickStats
          stats={[
            {
              Icon: Trophy,
              value: String(daysComplete),
              label: daysComplete === 1 ? 'dia completo' : 'dias completos',
            },
            {
              Icon: CalendarDays,
              value: String(daysActive),
              label: daysActive === 1 ? 'dia ativo' : 'dias ativos',
            },
            latestWeight !== null
              ? { Icon: Scale, value: `${latestWeight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}kg`, label: 'peso atual' }
              : { Icon: TrendingUp, value: `${totalDone}/${actions.length}`, label: 'metas de hoje' },
          ]}
        />

        {/* Progresso diário */}
        <DailyProgress
          todayCounts={todayCounts}
          petTipo={pet.tipo}
          onFirstComplete={handleFirstComplete}
        />

        {/* Celebration (sobe quando dia completo) */}
        {isDayComplete && (
          <View style={{
            backgroundColor: actionTheme.passeio.bg,
            borderWidth: 2, borderColor: actionTheme.passeio.border,
            borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 36, marginRight: 14 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: actionTheme.passeio.primary, fontFamily: 'Nunito_700Bold', fontSize: 15 }}>
                {pet.nome} está cuidado hoje!
              </Text>
              <Text style={{ color: actionTheme.passeio.primary, fontSize: 13, marginTop: 3 }}>
                Rotina completa · {streak} {streak === 1 ? 'dia' : 'dias'} de sequência 🔥
              </Text>
            </View>
          </View>
        )}

        {/* Streak at risk */}
        {streakAtRisk && (
          <View style={{
            backgroundColor: actionTheme.comida.bg,
            borderWidth: 1, borderColor: actionTheme.comida.border,
            borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: actionTheme.coco.primary, fontFamily: 'Nunito_700Bold', fontSize: 13 }}>
                Ofensiva em risco! ({streak} {streak === 1 ? 'dia' : 'dias'})
              </Text>
              <Text style={{ color: actionTheme.comida.primary, fontSize: 12, marginTop: 2 }}>
                {pet.nome} ainda precisa de comida e água hoje
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════ Seção HOJE ═══════════ */}
        <SectionHeader
          title="HOJE"
          subtitle={`${totalDone} de ${actions.length} ${actions.length === 1 ? 'registrada' : 'registradas'}`}
        />

        {/* Action grid — foco principal do dashboard.
            Layout adapta ao número de ações pra evitar "1 sozinho na
            última linha" (era o caso de gato: 4 ações em layout de 3
            colunas → o 4º virava um retangulão esticado embaixo).
            Regras: 4 ações → 2x2; demais → 3 colunas (cachorro tem 5
            ações → 3+2, com os 2 últimos alinhados à esquerda). */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -4 }}>
          {actions.map((action) => (
            <ActionButton
              key={action.key}
              action={action}
              count={todayCounts[action.key] ?? 0}
              isUrgent={urgentMap[action.key]}
              onPress={() => openModal(action)}
              progressLabel={action.key === 'comida' ? comidaProgressLabel : undefined}
              cols={actions.length === 4 ? 2 : 3}
            />
          ))}
        </View>

        {/* Weather — feedback TestFlight R2-3: antes ficava entre nutrição
            e resumo semanal, sem conexão semântica nenhuma. Aqui, logo
            abaixo dos botões de ação, fica claro o uso: "Vai registrar
            passeio? Olha o clima primeiro". Posição contextual. */}
        {weather.loading ? (
          <View style={{ backgroundColor: colors.bgInput, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🌤️</Text>
            <Text style={{ color: colors.textTertiary, fontWeight: '700', fontSize: 13 }}>Obtendo clima...</Text>
          </View>
        ) : weather.asfaltoQuente ? (
          <View style={{ backgroundColor: errorBg, borderWidth: 1, borderColor: errorBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🌡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: errorText, fontWeight: '700', fontSize: 13 }}>Asfalto quente — evite passeios agora</Text>
              <Text style={{ color: errorSubtext, fontSize: 12, marginTop: 2 }}>{weather.temp}°C · risco de queimadura nas patas</Text>
            </View>
          </View>
        ) : weather.temp !== null ? (
          <View style={{ backgroundColor: actionTheme.passeio.bg, borderWidth: 1, borderColor: actionTheme.passeio.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🌤️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: actionTheme.passeio.primary, fontWeight: '700', fontSize: 13 }}>Clima ideal pra passeio</Text>
              <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, marginTop: 2 }}>{weather.temp}°C · {weather.descricao}</Text>
            </View>
          </View>
        ) : null}

        {/* IA de Bem-Estar (Calorias) — se aplicável */}
        {showWellnessCard && (
          <WellnessCard
            todayFoodGrams={todayFoodGrams}
            todayWalkMinutes={todayWalkMinutes}
            latestWeightKg={latestWeight!}
          />
        )}

        {/* ═══════════ Seção INSIGHTS ═══════════ */}
        <SectionHeader title="INSIGHTS" />

        {/* Sinais de saúde — heurística de padrões clínicos.
            R2-10: feature agora é Pro. Free vê gate com preview do
            1º insight (titulo truncado) + CTA pra paywall. Pro vê o
            card completo com todos os insights. CriticalInsightBanner
            (acima) continua livre — alertas críticos sempre passam. */}
        {healthInsights.length > 0 && (
          isPremium ? (
            <HealthInsightsCard
              insights={healthInsights}
              onDismiss={dismissInsight}
            />
          ) : (
            <InsightsPremiumGate
              insightCount={healthInsights.length}
              previewInsight={healthInsights[0]}
            />
          )
        )}

        {/* Marco de atividade (ex: "100 passeios com Lolo!") */}
        <ActivityMilestoneCard
          actionHistory={actionHistory}
          petNome={pet.nome}
          shownMilestones={shownActivityMilestones}
        />

        {/* Birthday countdown (só se ≤ 30 dias do aniversário) */}
        {pet.nascimento && (
          <BirthdayCard petNome={pet.nome} nascimento={pet.nascimento} />
        )}

        <NutritionEntryCard
          targetKcal={nutritionTargetKcal}
          currentGoal={pet.nutritionGoal ?? null}
          hasWeight={latestWeight !== null}
        />

        {/* Resumo Semanal */}
        <ScalePress
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleShareWeekly();
          }}
          disabled={sharingWeekly}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Gerar resumo semanal"
          accessibilityHint="Compartilha um card visual com o resumo dos últimos 7 dias"
          style={{
            backgroundColor: colors.bgCard, borderRadius: 16,
            paddingHorizontal: 16, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center',
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6,
            }),
          }}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: actionTheme.agua.bg,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 12,
          }}>
            <Share2 size={18} color={actionTheme.agua.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14, fontFamily: 'Nunito_700Bold' }}>
              {sharingWeekly ? 'Gerando...' : 'Resumo Semanal'}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>
              Card compartilhável dos últimos 7 dias
            </Text>
          </View>
        </ScalePress>

        {/* Galeria de fotos (só se houver fotos registradas) */}
        {photoCount > 0 && (
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/photos');
            }}
            accessible accessibilityRole="button"
            accessibilityLabel={`Ver galeria de fotos. ${photoCount} ${photoCount === 1 ? 'foto registrada' : 'fotos registradas'}.`}
            accessibilityHint="Abre uma linha do tempo visual com todas as fotos do pet"
            style={{
              backgroundColor: colors.bgCard, borderRadius: 16,
              paddingHorizontal: 16, paddingVertical: 14,
              flexDirection: 'row', alignItems: 'center',
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6,
              }),
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: actionTheme.xixi.bg,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 18 }}>📷</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14, fontFamily: 'Nunito_700Bold' }}>
                Galeria de fotos
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>
                {photoCount} {photoCount === 1 ? 'foto' : 'fotos'} · linha do tempo visual
              </Text>
            </View>
          </ScalePress>
        )}

        {/* Notification banner (se ainda não decidiu) */}
        {notifStatus === 'undetermined' && (
          <ScalePress
            onPress={handleEnableNotifications}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Ativar lembretes diários"
            accessibilityHint="Solicita permissão para enviar notificações de rotina"
          >
            <View style={{
              backgroundColor: actionTheme.comida.bg,
              borderWidth: 1, borderColor: actionTheme.comida.border,
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 20, marginRight: 12 }}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: actionTheme.coco.primary, fontWeight: '700', fontSize: 13 }}>Ativar lembretes diários</Text>
                <Text style={{ color: actionTheme.comida.primary, fontSize: 12, marginTop: 2 }}>
                  Nunca esqueça a rotina do {pet.nome}
                </Text>
              </View>
              <Text style={{ color: actionTheme.comida.primary, fontWeight: '700', fontSize: 12 }}>Ativar</Text>
            </View>
          </ScalePress>
        )}

        {/* PRO Card — no final */}
        <ScalePress onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/premium'); }}>
          <View style={{
            backgroundColor: colors.textPrimary, borderRadius: 16,
            paddingHorizontal: 16, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#04A29B', borderRadius: 12,
              width: 40, height: 40,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 18 }}>👨‍👩‍👦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.bgScreen, fontFamily: 'Nunito_700Bold', fontSize: 13 }}>Compartilhe a rotina do {pet.nome}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Toda a família acompanha em tempo real</Text>
            </View>
            <View style={{ backgroundColor: '#04A29B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 11 }}>PRO</Text>
            </View>
          </View>
        </ScalePress>
      </ScrollView>

      {/* Quick-Log Modal */}
      <Modal
        visible={!!modalAction}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAction(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={{ flex: 1, backgroundColor: modalOverlay }}
            onPress={() => setModalAction(null)}
            accessibilityLabel="Fechar modal"
          />
          <View style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingTop: 8,
            maxHeight: '88%',
          }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>

            {/* Header fixo */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 24, marginBottom: 16,
            }}>
              {modalAction && (
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: modalAction.color,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <modalAction.Icon size={24} strokeWidth={2.2} color="#FFFEF8" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_800ExtraBold', fontSize: 20, fontWeight: '800' }}>
                  {modalAction?.label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                  {todayCounts[modalAction?.key ?? 'comida'] > 0
                    ? `Registrado ${todayCounts[modalAction?.key ?? 'comida']}x hoje`
                    : 'Primeiro registro hoje'}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: Platform.OS === 'ios' ? 40 : 28,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Foto picker ── */}
              <ScalePress
                onPress={handlePickLogPhoto}
                accessible
                accessibilityRole="button"
                accessibilityLabel={logPhoto ? 'Alterar foto' : 'Adicionar foto opcional'}
                accessibilityHint="Abre a galeria para escolher uma foto"
                scaleValue={0.98}
                style={{
                  borderRadius: 14, overflow: 'hidden', marginBottom: 16,
                  borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
                }}
              >
                {logPhoto ? (
                  <Image source={{ uri: logPhoto }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                ) : (
                  <View style={{ height: 72, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22, marginBottom: 2 }}>📷</Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Adicionar foto (opcional)</Text>
                  </View>
                )}
              </ScalePress>

              {/* ═══ COMIDA ═══ */}
              {modalAction?.key === 'comida' && (
                <>
                  <FieldLabel color={colors.textSecondary}>Quantidade (g)</FieldLabel>
                  <QuickAmount
                    values={[50, 100, 150, 200]}
                    unit="g"
                    onPick={(v) => setLogQuantity(String(v))}
                    currentValue={logQuantity ? parseInt(logQuantity, 10) : undefined}
                    accentColor={actionTheme.comida.primary}
                    accentBg={actionTheme.comida.bg}
                    accentBorder={actionTheme.comida.border}
                  />
                  <TextInput
                    value={logQuantity} onChangeText={setLogQuantity}
                    placeholder="Ou digite: ex. 175"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric" maxLength={5}
                    style={inputBoxStyle(colors)}
                  />

                  <FieldLabel color={colors.textSecondary} mt={16}>Como aceitou?</FieldLabel>
                  <ChipGroup<Acceptance>
                    options={ACCEPTANCE_OPTS}
                    selected={logAcceptance}
                    onSelect={setLogAcceptance}
                    accentColor={actionTheme.comida.primary}
                    accentBg={actionTheme.comida.bg}
                    accentBorder={actionTheme.comida.border}
                  />
                </>
              )}

              {/* ═══ ÁGUA ═══ */}
              {modalAction?.key === 'agua' && (
                <>
                  <FieldLabel color={colors.textSecondary}>Quantidade (ml)</FieldLabel>
                  <QuickAmount
                    values={[50, 100, 200, 300]}
                    unit="ml"
                    onPick={(v) => setLogVolumeMl(String(v))}
                    currentValue={logVolumeMl ? parseInt(logVolumeMl, 10) : undefined}
                    accentColor={actionTheme.agua.primary}
                    accentBg={actionTheme.agua.bg}
                    accentBorder={actionTheme.agua.border}
                  />
                  <TextInput
                    value={logVolumeMl} onChangeText={setLogVolumeMl}
                    placeholder="Ou digite: ex. 250"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric" maxLength={5}
                    style={inputBoxStyle(colors)}
                  />

                  <FieldLabel color={colors.textSecondary} mt={16}>Como bebeu?</FieldLabel>
                  <ChipGroup<Acceptance>
                    options={WATER_ACCEPTANCE_OPTS}
                    selected={logAcceptance}
                    onSelect={setLogAcceptance}
                    accentColor={actionTheme.agua.primary}
                    accentBg={actionTheme.agua.bg}
                    accentBorder={actionTheme.agua.border}
                  />
                </>
              )}

              {/* ═══ PASSEIO ═══ */}
              {modalAction?.key === 'passeio' && (
                <>
                  <FieldLabel color={colors.textSecondary}>Duração (min)</FieldLabel>
                  <QuickAmount
                    values={[15, 30, 45, 60]}
                    unit="min"
                    onPick={(v) => setLogDuration(String(v))}
                    currentValue={logDuration ? parseInt(logDuration, 10) : undefined}
                    accentColor={actionTheme.passeio.primary}
                    accentBg={actionTheme.passeio.bg}
                    accentBorder={actionTheme.passeio.border}
                  />
                  <TextInput
                    value={logDuration} onChangeText={setLogDuration}
                    placeholder="Ou digite: ex. 25"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric" maxLength={3}
                    style={inputBoxStyle(colors)}
                  />

                  <FieldLabel color={colors.textSecondary} mt={16}>Durante o passeio</FieldLabel>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <ScalePress
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSubXixi(!subXixi); }}
                        accessible
                        accessibilityRole="switch"
                        accessibilityLabel="Fez xixi durante o passeio"
                        accessibilityState={{ checked: subXixi }}
                        style={{
                          borderRadius: 14, paddingVertical: 12,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: subXixi ? actionTheme.xixi.bg : colors.bgInput,
                          borderWidth: 1.5,
                          borderColor: subXixi ? actionTheme.xixi.border : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 16, marginRight: 6 }}>🪣</Text>
                        <Text style={{
                          fontSize: 13, fontWeight: subXixi ? '700' : '500',
                          color: subXixi ? actionTheme.xixi.primary : colors.textSecondary,
                        }}>
                          Fez xixi
                        </Text>
                      </ScalePress>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ScalePress
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSubCoco(!subCoco); }}
                        accessible
                        accessibilityRole="switch"
                        accessibilityLabel="Fez cocô durante o passeio"
                        accessibilityState={{ checked: subCoco }}
                        style={{
                          borderRadius: 14, paddingVertical: 12,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: subCoco ? actionTheme.coco.bg : colors.bgInput,
                          borderWidth: 1.5,
                          borderColor: subCoco ? actionTheme.coco.border : colors.border,
                        }}
                      >
                        <PoopIcon
                          size={16}
                          color={subCoco ? actionTheme.coco.primary : colors.textSecondary}
                          strokeWidth={2.2}
                        />
                        <Text style={{
                          fontSize: 13, fontWeight: subCoco ? '700' : '500',
                          color: subCoco ? actionTheme.coco.primary : colors.textSecondary,
                          marginLeft: 6,
                        }}>
                          Fez cocô
                        </Text>
                      </ScalePress>
                    </View>
                  </View>
                </>
              )}

              {/* ═══ XIXI ═══ */}
              {modalAction?.key === 'xixi' && (
                <>
                  <FieldLabel color={colors.textSecondary}>Aparência</FieldLabel>
                  <ChipGroup<Appearance>
                    options={APPEARANCE_OPTS}
                    selected={logAppearance}
                    onSelect={setLogAppearance}
                    accentColor={actionTheme.xixi.primary}
                    accentBg={actionTheme.xixi.bg}
                    accentBorder={actionTheme.xixi.border}
                  />
                </>
              )}

              {/* ═══ COCÔ ═══ */}
              {modalAction?.key === 'coco' && (
                <>
                  <FieldLabel color={colors.textSecondary}>Consistência</FieldLabel>
                  <ChipGroup<Consistency>
                    options={CONSISTENCY_OPTS}
                    selected={logConsistency}
                    onSelect={setLogConsistency}
                    accentColor={actionTheme.coco.primary}
                    accentBg={actionTheme.coco.bg}
                    accentBorder={actionTheme.coco.border}
                  />

                  <FieldLabel color={colors.textSecondary} mt={16}>Aparência</FieldLabel>
                  <ChipGroup<Appearance>
                    options={APPEARANCE_OPTS}
                    selected={logAppearance}
                    onSelect={setLogAppearance}
                    accentColor={actionTheme.coco.primary}
                    accentBg={actionTheme.coco.bg}
                    accentBorder={actionTheme.coco.border}
                  />
                </>
              )}

              {/* ── Nota (comum a todos) ── */}
              <FieldLabel color={colors.textSecondary} mt={16}>
                {modalAction?.key === 'passeio' ? 'Algo anormal?' : 'Observações'}
              </FieldLabel>
              <TextInput
                value={logNote}
                onChangeText={setLogNote}
                placeholder={notePlaceholder(modalAction?.key)}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={200}
                style={{
                  backgroundColor: colors.bgInput, borderRadius: 14,
                  paddingHorizontal: 16, paddingVertical: 12,
                  fontSize: 15, color: colors.textPrimary,
                  textAlignVertical: 'top', minHeight: 72,
                  marginBottom: 20,
                }}
              />

              {/* ── Registrar ── */}
              <ScalePress
                onPress={handleSaveLog}
                disabled={saving}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Registrar ${modalAction?.label.toLowerCase() ?? 'ação'}`}
                style={{
                  borderRadius: 16, height: 56,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: modalAction?.color ?? colors.textPrimary,
                }}
              >
                {saving
                  ? <ActivityIndicator color="#ffffff" />
                  : <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Check size={18} color="#ffffff" strokeWidth={2.5} />
                      <Text style={{ color: '#ffffff', fontFamily: 'Nunito_800ExtraBold', fontSize: 16, marginLeft: 6 }}>
                        Registrar {modalAction?.label}
                      </Text>
                    </View>
                }
              </ScalePress>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Pet Switcher Modal ── */}
      <Modal
        visible={showPetSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPetSwitcher(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: modalOverlay }}
          onPress={() => setShowPetSwitcher(false)}
          accessibilityLabel="Fechar seletor de pet"
        />
        <View style={{
          backgroundColor: colors.bgCard,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24, paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        }}>
          {/* Alça */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>
          <Text style={{
            fontFamily: 'Nunito_700Bold', fontSize: 17,
            color: colors.textPrimary, marginBottom: 16,
          }}>
            Trocar de pet
          </Text>

          {/* Lista TODOS os pets do user. Click no não-ativo troca activePetId.
              DB-002 onda 3: agora multi-pet funciona de verdade. */}
          {Object.values(pets).map((p) => {
            const isActive = p.id === activePetId;
            return (
              <ScalePress
                key={p.id}
                onPress={() => {
                  if (isActive) { setShowPetSwitcher(false); return; }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActivePet(p.id!);
                  setShowPetSwitcher(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${p.nome}${isActive ? ', pet ativo' : ', tocar pra ativar'}`}
                accessibilityState={{ selected: isActive }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: isActive ? actionTheme.passeio.bg : colors.bgCard,
                  borderRadius: 16, padding: 14, marginBottom: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? actionTheme.passeio.border : colors.border,
                }}
              >
                <PetPhoto foto={p.foto} tipo={p.tipo} nome={p.nome} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Nunito_700Bold', fontSize: 15,
                    color: isActive ? actionTheme.passeio.primary : colors.textPrimary,
                  }}>
                    {p.nome}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {p.raca && p.raca !== 'Sem raça definida' ? p.raca : 'Sem raça definida'}
                  </Text>
                </View>
                {isActive && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: actionTheme.passeio.primary }} />
                )}
              </ScalePress>
            );
          })}

          {/* Botão Adicionar pet — agora funcional (DB-002 onda 3 ✓) */}
          <ScalePress
            onPress={() => {
              setShowPetSwitcher(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTimeout(() => router.push('/add-pet'), 200);
            }}
            accessibilityRole="button"
            accessibilityLabel="Adicionar novo pet"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: colors.bgInput,
              borderRadius: 16, padding: 14, marginTop: 4,
              borderWidth: 1, borderColor: colors.border,
              borderStyle: 'dashed',
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: '#fef3c7',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={20} strokeWidth={2.5} color="#04A29B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textPrimary }}>
                Adicionar outro pet
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Crie um perfil novo
              </Text>
            </View>
          </ScalePress>
        </View>
      </Modal>

      {/* ── Soft Ask de Notificações ── */}
      {/* Welcome tour — aparece UMA vez após o onboarding. Persiste via store. */}
      <WelcomeTour
        visible={showTour}
        petNome={pet.nome}
        onComplete={() => setHasCompletedTour(true)}
      />

      <NotificationAskSheet
        visible={showNotifAsk}
        petNome={pet.nome}
        onConfirm={(granted) => {
          // Antes setava 'granted' incondicional → quando user negava
          // o diálogo nativo, o store assumia ok e tentava agendar
          // (crashava em alguns devices). Agora reflete o status real.
          setShowNotifAsk(false);
          setNotifStatus(granted ? 'granted' : 'denied');
          if (granted) {
            showToast('success', 'Lembretes ativados!');
          } else {
            showNotificationDeniedAlert();
          }
        }}
        onDismiss={() => setShowNotifAsk(false)}
      />

      {/* ── Weekly Report off-screen ── */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }} accessible={false} importantForAccessibility="no-hide-descendants">
        <WeeklyReportCard
          ref={weeklyCardRef}
          petNome={pet.nome}
          petFoto={pet.foto}
          weekLabel={weeklyData.weekLabel}
          dailyGrid={weeklyData.dailyGrid}
          totals={weeklyData.totals}
          previousTotals={weeklyData.previousTotals}
          streak={streak}
          latestWeight={latestWeight}
          previousWeight={weeklyData.previousWeight}
        />
      </View>

      {/* ── Milestone de streak ── */}
      <MilestoneSheet
        milestone={milestoneToShow}
        petNome={pet.nome}
        petFoto={pet.foto}
        streak={streak}
        onClose={() => {
          if (milestoneToShow !== null) markMilestoneShown(milestoneToShow);
          setMilestoneToShow(null);
        }}
      />

      {/* ── Premium trigger contextual ── */}
      <PremiumTriggerSheet
        trigger={activeTrigger}
        onDismiss={() => {
          if (activeTrigger) dismissTrigger(activeTrigger.id);
          setActiveTrigger(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Greeting contextual ──────────────────────────────────────

function getSmartGreeting(
  nome: string,
  counts: Record<ActionKey, number>,
  tipo: PetType | undefined,
  isDayComplete: boolean,
  hour: number,
): string {
  const timeGreet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Dia completo: saudação neutra (celebration card já está visível)
  if (isDayComplete) return timeGreet;

  // Manhã + comida não registrada
  if (hour < 12 && (counts['comida'] ?? 0) === 0) {
    return `${timeGreet}! ${nome} já tomou café?`;
  }

  // Tarde + água não registrada
  if (hour >= 12 && hour < 18 && (counts['agua'] ?? 0) === 0) {
    return `${nome} está hidratado hoje?`;
  }

  // Final de tarde + cachorro sem passeio
  if (hour >= 17 && hour < 19 && tipo === 'cachorro' && (counts['passeio'] ?? 0) === 0) {
    return `Hora do passeio do ${nome}?`;
  }

  return timeGreet;
}

// ─── Utilitários ──────────────────────────────────────────────

function getPetAge(nascimento: string): string {
  const [y, m, d] = nascimento.split('-').map(Number);
  if (!y || !m || !d) return '';
  const birth  = new Date(y, m - 1, d);
  const now    = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1)  return 'Recém-nascido';
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}
