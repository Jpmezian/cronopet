import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sentry from '@sentry/react-native';
import * as Crypto from 'expo-crypto';
import { zustandMMKVStorage } from './storage';
import { sanitizeName, sanitizeNote, INPUT_LIMITS } from '@/lib/security';
import { getBreedSize } from '@/data/breed-meta';
import { getLocalToday, tsToLocalYMD } from '@/lib/dateLocal';
import { track } from '@/services/analytics';
import {
  scheduleDailyReminder,
  scheduleStreakAtRiskReminder,
  cancelAllReminders,
} from '@/services/NotificationService';
import {
  autoSyncPet, autoSyncActionLog, autoSyncDeleteActionLog,
  autoSyncVaccine, autoSyncAppointment, autoSyncWeightEntry,
} from '@/services/SyncService';
import type {
  ActionKey, ActionLog, PetState, PetType, PetProfile,
  MedicalEvent, MedicalEventType, Vaccine,
  Appointment, WeightEntry,
  Acceptance, Consistency, Appearance,
} from '@/types/pet';
import type { CronoPetUser } from '@/types/auth';

// ─── Helpers ───────────────────────────────────────────────────

function getTodayString(): string {
  // R4-2: usa fuso LOCAL pra evitar bug onde registros das 21h BRT
  // viravam "amanhã UTC" e ficavam grudados em "hoje" no dia seguinte.
  return getLocalToday();
}

// Bug fix (2026-05-26): pets.id no schema Supabase é coluna uuid com
// default gen_random_uuid() (migration 017). O makeId antigo gerava
// `${epoch}-${6chars base36}` — formato NÃO compatível com uuid →
// upsert em `pets` falhava com 'invalid input syntax for type uuid',
// silenciado pelo Sentry no autoSyncPet. Sync de pets quebrado desde
// DB-002 onda 1.
//
// action_logs / vaccines / appointments / weight_entries / medical_events
// têm id text; aceitariam o formato antigo, mas Math.random NÃO é CSPRNG
// e a entropia (~36^6 por ms) é frágil em criação concorrente.
//
// Crypto.randomUUID() (expo-crypto >= 12, já dep nesse projeto via
// store/storage.ts) usa PRNG nativo (iOS SecRandomCopyBytes / Android
// SecureRandom) e produz uuid v4 padrão — compatível tanto com colunas
// uuid quanto text.
function makeId(): string {
  return Crypto.randomUUID();
}

// ─── Migration de pets legacy (cleanup pós bug B1) ───────────
//
// IMPORTANTE: este bloco pode ser removido em ~6 meses (≈ 2026-11-26)
// quando todos os beta testers tiverem upgraded pra build com makeId
// uuid + tiverem oportunidade de re-hidratar ao menos uma vez. Aí o
// universo de MMKV contaminado fica vazio. Marcar TODO no calendário.
//
// Contexto: builds antigas (commit < bfc44a8, 2026-05-26) geravam
// `pet.id` no formato `${epoch}-${6 base36}` ou `${epoch}-legacy`,
// que NÃO casa com a coluna uuid de `public.pets`. Cada autoSyncPet
// falhava silenciosamente (Sentry captura, user não vê), então o pet
// permanece apenas no MMKV local. Esta migration troca o id local
// por uuid v4 válido E atualiza todas as referências FK locais
// (`petId` em actionHistory, vaccines, appointments, medical_events,
// weight_entries). Próximo autoSync* depois desse rehydrate vai
// pushar tudo pro cloud com IDs válidos.
//
// Assumption: NENHUM pet legacy chegou a sincronizar no cloud (bug
// B1 quebrou 100% dos pushes — count em prod = 0). Logo, gerar uuid
// novo e re-push NÃO colide com row existente no cloud. Action_logs
// já estão sync (pet_id null antes do schema multi-pet, ou pet_id
// apontando pro legacy local id que o cloud nem conhece).
//
// Edge case improvável: pet legacy que conseguiu sync via cliente
// custom / SQL manual. Mitigation: trigger não existe, RPC inexiste —
// só caminho de criação é o app. Se algum dia for descoberto, a
// remediação é manual (operador troca id no DB).

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_ID_RE = /^\d+-(?:[a-z0-9]{6}|legacy)$/;

export function isLegacyId(id: string | undefined | null): boolean {
  if (typeof id !== 'string' || id.length === 0) return false;
  if (UUID_V4_RE.test(id)) return false;
  return LEGACY_ID_RE.test(id);
}

/**
 * Tipo mínimo que migrateLegacyPetIds aceita — subset do PetStore
 * que sobrevive ao persist + onRehydrateStorage (state hidratado).
 * Mantido inline pra não criar tipo de uso único exportado.
 */
type MigrateState = {
  pets:          Record<string, PetProfile>;
  activePetId:   string;
  pet:           PetProfile;
  actionHistory: ActionLog[];
  medicalEvents: MedicalEvent[];
  vaccines:      Vaccine[];
  appointments:  Appointment[];
  weightHistory: WeightEntry[];
};

/**
 * Mut **in-place** o state pra trocar pet.id legacy → uuid v4.
 * Retorna número de pets migrados (0 = no-op idempotente).
 *
 * Chamado uma vez por boot, dentro de onRehydrateStorage, antes da
 * UI montar. Custo: O(P × (L+V+A+M+W)) onde P=pets legacy, L,V,A,M,W=
 * tamanhos das listas. Pra qualquer device real (P≤3, L≤alguns mil),
 * roda em microssegundos.
 */
export function migrateLegacyPetIds(state: MigrateState): number {
  let migrated = 0;
  if (!state.pets) return 0;

  for (const oldId of Object.keys(state.pets)) {
    if (!isLegacyId(oldId)) continue;

    const pet = state.pets[oldId];
    if (!pet) continue;

    const newId = Crypto.randomUUID();
    const migratedPet: PetProfile = { ...pet, id: newId };

    state.pets[newId] = migratedPet;
    delete state.pets[oldId];

    if (state.activePetId === oldId) {
      state.activePetId = newId;
    }
    if (state.pet?.id === oldId) {
      state.pet = migratedPet;
    }

    const repoint = <T extends { petId?: string }>(list: T[]): T[] =>
      list.map((item) => item.petId === oldId ? { ...item, petId: newId } : item);

    state.actionHistory = repoint(state.actionHistory ?? []);
    state.medicalEvents = repoint(state.medicalEvents ?? []);
    state.vaccines      = repoint(state.vaccines      ?? []);
    state.appointments  = repoint(state.appointments  ?? []);
    state.weightHistory = repoint(state.weightHistory ?? []);

    migrated++;

    // Telemetria — não loga PII (id é UUID, sem dados do pet)
    // eslint-disable-next-line no-console
    console.warn('[migration] legacy pet id replaced', { oldId, newId });
    Sentry.addBreadcrumb({
      category: 'migration',
      message:  'legacy_pet_id_replaced',
      level:    'info',
      data:     { oldId, newId },
    });
  }

  return migrated;
}

function daysBetween(fromDateStr: string, toDateStr: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd).getTime();
  const to   = new Date(ty, tm - 1, td).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Copia URI para Documents + remove EXIF via expo-image-manipulator.
 * Async porque o manipulator é assíncrono.
 *
 * Retorna apenas o FILENAME RELATIVO (ex.: "cronopet_photo_123.jpg"),
 * não a URI absoluta. Isso é o fix do R3-1+4 — iOS muda o container
 * UUID em todo update, então URI absoluta vira inválida. Componentes
 * que renderizam <Image> precisam passar pela função `resolvePhotoUri`
 * de lib/photoPath.ts pra reconstruir a URI atual em runtime.
 * URLs http(s) passam direto.
 */
/**
 * Best-effort: deleta o arquivo físico de uma foto persistida quando o
 * log/evento que a referenciava é removido. Aceita o valor armazenado
 * (filename relativo OU URI legacy absoluta OU URL remota). URLs remotas
 * são ignoradas (não foram baixadas pra cá). Erro de delete não throw.
 */
function deletePhotoFile(stored: string): void {
  if (!stored) return;
  if (stored.startsWith('http://') || stored.startsWith('https://')) return;
  try {
    // Reaproveita o resolver pra reconstruir o full path em runtime
    const filename = stored.startsWith('file://')
      ? stored.slice(stored.lastIndexOf('/') + 1)
      : stored;
    if (!filename) return;
    const target = new File(Paths.document, filename);
    // expo-file-system 19 não throw se arquivo já não existir
    target.delete();
  } catch (err) {
    // Engole — best-effort. Sentry registra pra detectar padrões.
    Sentry.captureException(err, { tags: { op: 'deletePhotoFile' } });
  }
}

async function persistAndStripPhoto(uri: string): Promise<string> {
  if (!uri) return uri;
  try {
    // SECURITY: SEMPRE reencodar via ImageManipulator — remove EXIF
    // incluindo GPS coordinates. Isso se aplica também a URLs remotas
    // (Unsplash default do onboarding pode ter metadata).
    // Se falhar (URL remota inacessível, ex), usamos a URL original.
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // sem transforms geométricos
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    const stripped = result.uri;

    // Copiar para Documents (permanente — sobrevive a updates)
    const filename = `cronopet_photo_${Date.now()}.jpg`;
    const dest = new File(Paths.document, filename);
    const strippedFile = new File(stripped);
    strippedFile.copy(dest);

    // SECURITY (auditoria 2026-05-24, finding #14): purgar arquivos
    // intermediários do cache. Sem isso:
    //   - `stripped`: cópia do ImageManipulator em Library/Caches/ —
    //     contém o JPEG re-encodado (já sem EXIF, mas ocupa espaço).
    //   - `uri` original: file:// do PHPicker iOS em Caches/ —
    //     **AINDA TEM EXIF + GPS originais**. iOS limpa Caches
    //     eventualmente, mas até lá fica acessível via backup iCloud
    //     ou device forensics.
    // Best-effort: try/catch silencioso (picker pode bloquear delete
    // do próprio cache, e o purge eventual do iOS resolve).
    try { strippedFile.delete(); } catch { /* iOS já purgou */ }
    if (uri.startsWith('file://') && uri !== stripped) {
      try { new File(uri).delete(); } catch { /* picker bloqueou */ }
    }

    // Armazena só o filename relativo. O resolver no runtime monta
    // o path completo com o container UUID atual.
    return filename;
  } catch {
    // Fallback graciosamente — mantém input original. Pode ser uma
    // URL http(s) (ex.: Unsplash legacy) que resolve sem ajuste.
    return uri;
  }
}

/** Um dia é completo quando tem ≥1 comida E ≥1 água */
function isDayComplete(logs: ActionLog[], dateStr: string): boolean {
  // R4-2: compara em LOCAL — ver lib/dateLocal.ts
  const day = logs.filter((l) => tsToLocalYMD(l.timestamp) === dateStr);
  return day.some((l) => l.key === 'comida') && day.some((l) => l.key === 'agua');
}

// ─── Interface da Store ────────────────────────────────────────

interface PetStore extends PetState {
  // Onboarding / Perfil
  completeOnboarding: (nome: string, tipo: PetType, raca: string, foto: string, nascimento?: string) => Promise<void>;
  updatePetProfile:   (nome: string, tipo: PetType, raca: string, foto: string, nascimento?: string) => Promise<void>;
  setPetNutrition:    (fields: Partial<Pick<PetProfile,
    'idealWeightKg' | 'nutritionGoal' | 'bodyCondition' |
    'neutered' | 'baselineActivity' | 'petSize' | 'notes'
  >>) => void;

  // Ações diárias
  addActionLog:    (key: ActionKey, photo?: string, note?: string, extra?: {
    quantity?:   number;
    duration?:   number;
    subActions?: ActionKey[];
    volumeMl?:   number;
    acceptance?: Acceptance;
    consistency?: Consistency;
    appearance?: Appearance;
  }) => Promise<void>;
  removeActionLog: (id: string) => void;
  updateActionLog: (id: string, updates: {
    note?:        string;
    timestamp?:   number;
    quantity?:    number;
    duration?:    number;
    volumeMl?:    number;
    acceptance?:  Acceptance;
    consistency?: Consistency;
    appearance?:  Appearance;
  }) => void;

  // Dia / streak
  checkAndResetDay: () => void;
  useStreakShield:  () => void;

  // Configurações de notificação
  setNotificationTime: (hour: number, minute: number) => void;

  // Saúde — eventos
  addMedicalEvent:    (type: MedicalEventType, note?: string, photo?: string) => Promise<void>;
  removeMedicalEvent: (id: string) => void;

  // Vacinas
  addVaccine:    (data: Omit<Vaccine, 'id'>) => void;
  updateVaccine: (id: string, data: Partial<Omit<Vaccine, 'id'>>) => void;
  removeVaccine: (id: string) => void;

  // Consultas
  addAppointment:    (data: Omit<Appointment, 'id' | 'notificacaoId'>) => Promise<void>;
  removeAppointment: (id: string) => void;

  // Peso
  addWeightEntry:    (peso: number, data: string, nota?: string) => void;
  removeWeightEntry: (id: string) => void;

  // ── Multi-pet (DB-002) ────────────────────────────────────
  /** Cria novo pet, gera id, adiciona em pets, switcha pra ele. Retorna o id. */
  addPet: (profile: Omit<PetProfile, 'id'>) => Promise<string>;
  /** Soft-remove pet (mantém histórico). Se era o activePet, troca pra outro. */
  removePet: (id: string) => void;
  /** Troca pet ativo. Espelha em pet (legacy) imediatamente. */
  setActivePet: (id: string) => void;

  // Sync helpers
  hydrateFromCloud: (data: {
    pet?:          PetProfile | null;
    /** DB-002 onda 4: array de todos os pets ativos do group. */
    pets?:         PetProfile[];
    actionLogs:    ActionLog[];
    vaccines:      Vaccine[];
    appointments:  Appointment[];
    weightHistory: WeightEntry[];
  }) => void;
  /** Marca onboarding como completo sem mexer no pet. Usado quando user
   *  já tem pet no cloud (trocou de celular) — pula StepPetType+Setup. */
  markOnboarded: () => void;
  appendRemoteLog: (log: ActionLog) => void;

  resetStore: () => void;

  // ── Dev only: seed demo data ───────────────────────────────
  /** SÓ usar em dev/sandbox. Popula histórico com 14 dias simulados. */
  seedDemoData: (data: {
    actionHistory?: ActionLog[];
    weightHistory?: WeightEntry[];
    vaccines?: Vaccine[];
    appointments?: Appointment[];
  }) => void;

  // ── Milestones de streak ────────────────────────────────────
  markMilestoneShown: (days: number) => void;

  /** Marca um marco de atividade como celebrado (ex: "passeio-100") */
  markActivityMilestoneShown: (id: string) => void;

  /** Marca um gatilho Premium como mostrado (não voltar a mostrar) */
  markPremiumPromptShown: (id: string) => void;

  /** IDs de health insights dismissados pelo tutor */
  dismissedInsightIds: string[];
  /** Dispensa um insight da seção de saúde (não volta a mostrar) */
  dismissInsight: (id: string) => void;
  /** Limpa lista de dismiss (ex: após reset) */
  clearDismissedInsights: () => void;

  /** Insights adiados temporariamente (id → timestamp em ms até quando ficar adiado) */
  snoozedInsights: Record<string, number>;
  /** Adia um insight por N horas (não volta a mostrar até o tempo passar) */
  snoozeInsight: (id: string, hours: number) => void;

  /** Categorias de insight que o tutor desativou (não geram alerta nem aparecem) */
  disabledInsightCategories: string[];
  /** Liga/desliga uma categoria de insight */
  toggleInsightCategory: (category: string, enabled: boolean) => void;

  /** Quantidade de consultas marcadas a partir do banner de alerta */
  alertsHandledCount: number;
  /** Timestamp da última consulta marcada via banner — pra UI de "última ação" */
  alertsHandledLastAt: number | null;
  /** Incrementa contador (chamado pelo CriticalInsightBanner) */
  registerAlertHandled: () => void;

  /** IDs de insights que já viraram push notification — evita duplicar */
  notifiedInsightIds: Record<string, number>;
  /** Marca insight como notificado em determinado timestamp */
  markInsightNotified: (id: string) => void;

  // ── Premium ──────────────────────────────────────────────
  /**
   * Chamado quando o StoreKit/RevenueCat confirma assinatura.
   * Para testes em dev, pode ser chamado via Sandbox toggle.
   */
  setPremiumStatus: (params: {
    isPremium:        boolean;
    plan?:            'monthly' | 'annual' | null;
    expiresAt?:       number | null;
  }) => void;

  /** Marca início de trial (seta `trialStartedAt = now`) */
  startTrial: () => void;

  /** Seta `firstAppOpenAt` se ainda não existir (chamado no layout root) */
  recordFirstAppOpen: () => void;

  /** Ativa/desativa o biometric lock (Face ID / Touch ID) */
  setBiometricLock: (enabled: boolean) => void;

  // ── Auth / Premium ─────────────────────────────────────────
  user:           CronoPetUser | null;
  familyGroupId:  string | null;
  syncStatus:     'idle' | 'syncing' | 'error' | 'synced';
  setUser:           (user: CronoPetUser | null) => void;
  setFamilyGroupId:  (id: string | null) => void;
  setSyncStatus:     (s: 'idle' | 'syncing' | 'error' | 'synced') => void;

  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;

  /**
   * Estilo visual global. Adicionado em 2026-05-22 por feedback
   * TestFlight #12. Opções:
   *   - 'cronopet'      — paleta brand (Celadon/Verdigris/Beige).
   *                       Light/dark seguem themeMode acima.
   *   - 'light-neutral' — paleta cinza-azulado clara (sempre claro).
   *   - 'dark-neutral'  — paleta cinza-azulado escura (sempre escuro).
   *
   * Quando paletteMode é 'light-neutral' ou 'dark-neutral', o themeMode
   * é ignorado (paleta já força light/dark). Default 'cronopet' preserva
   * a experiência atual pra quem não tocar no setting.
   */
  paletteMode: 'cronopet' | 'light-neutral' | 'dark-neutral';
  setPaletteMode: (mode: 'cronopet' | 'light-neutral' | 'dark-neutral') => void;

  /** Tour de boas-vindas (5 cards explicando as features). Aparece
   *  1 vez só, após o onboarding. Setado true quando o user conclui
   *  ou pula. Feedback TestFlight #13. */
  hasCompletedTour: boolean;
  setHasCompletedTour: (v: boolean) => void;

  /** Consentimento opt-in para envio de dados anonimizados pra IA
   *  (Anthropic via Edge Function). LGPD art. 7º I + art. 20. User
   *  pode revogar a qualquer momento em Settings. */
  aiConsentGiven: boolean;
  setAiConsent: (v: boolean) => void;

  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  /**
   * Indica se hydrateFromCloud completou após signIn/cold start.
   * Inicializa `false`. Vira `true` após o pull do Supabase resolver
   * (ou após timeout 5s em `_layout.tsx`). Excluído do `partialize` —
   * é estado runtime derivado de network, não persistido no MMKV.
   *
   * Bug fix (2026-05-27): UI de ações deve gatear input em `false` pra
   * evitar `addActionLog` lendo `activePetId=''` durante a janela de
   * race (~500ms–2s entre auth guard liberar e pull cloud retornar).
   * 4 logs órfãos observados em prod (build #22) por exatamente isso.
   */
  _cloudHydrated: boolean;
  setCloudHydrated: (v: boolean) => void;
}

// ─── Store ─────────────────────────────────────────────────────

export const usePetStore = create<PetStore>()(
  persist(
    (set, get) => ({
      hasOnboarded:      false,
      pet:               { nome: '', tipo: 'cachorro', raca: '', foto: '' },
      // DB-002 onda 2: multi-pet. `pets` é source of truth; `pet`
      // (legacy) é espelhado de pets[activePetId] em toda mutação.
      pets:              {},
      activePetId:       '',
      streak:            0,
      streakShieldCount: 0,
      todayDate:         getTodayString(),
      actionHistory:     [],
      medicalEvents:     [],
      vaccines:          [],
      appointments:      [],
      weightHistory:     [],
      notificationHour:  20,
      notificationMinute: 0,
      shownMilestones:   [],
      shownActivityMilestones: [],
      shownPremiumPrompts: [],
      dismissedInsightIds: [],
      snoozedInsights: {},
      disabledInsightCategories: [],
      alertsHandledCount: 0,
      alertsHandledLastAt: null,
      notifiedInsightIds: {},
      biometricLockEnabled: false,
      isPremium:        false,
      premiumPlan:      null,
      premiumExpiresAt: null,
      trialStartedAt:   null,
      firstAppOpenAt:   null,
      user:          null,
      familyGroupId: null,
      syncStatus:    'idle',
      themeMode: 'system',
      paletteMode: 'cronopet',
      hasCompletedTour: false,
      aiConsentGiven: false,
      _hasHydrated:  false,
      _cloudHydrated: false,

      setThemeMode: (mode) => set({ themeMode: mode }),
      setPaletteMode: (mode) => set({ paletteMode: mode }),
      setHasCompletedTour: (v) => set({ hasCompletedTour: v }),
      setAiConsent: (v) => set({ aiConsentGiven: v }),
      setHasHydrated:   (v) => set({ _hasHydrated: v }),
      setCloudHydrated: (v) => set({ _cloudHydrated: v }),
      setUser:          (user)   => set({ user }),
      setFamilyGroupId: (id)     => set({ familyGroupId: id }),
      setSyncStatus:    (status) => set({ syncStatus: status }),

      // ── Onboarding ─────────────────────────────────────────
      completeOnboarding: async (nome, tipo, raca, foto, nascimento) => {
        const fotoFinal = await persistAndStripPhoto(foto);
        const petId = makeId();
        const nextPet: PetProfile = {
          id: petId,
          nome: sanitizeName(nome, INPUT_LIMITS.PET_NAME_MAX),
          tipo,
          raca: sanitizeName(raca, INPUT_LIMITS.BREED_MAX),
          foto: fotoFinal,
          nascimento,
        };
        set({
          hasOnboarded:      true,
          pet:               nextPet,
          // DB-002: também popular pets[] + activePetId
          pets:              { [petId]: nextPet },
          activePetId:       petId,
          streak:            0,
          streakShieldCount: 0,
          todayDate:         getTodayString(),
          actionHistory:     [],
          medicalEvents:     [],
          vaccines:          [],
          appointments:      [],
          weightHistory:     [],
        });
        track({
          name: 'onboarding_completed',
          props: {
            petType: tipo,
            hasPhoto: !!fotoFinal,
            hasBirthdate: !!nascimento,
          },
        });
        // Sprint AUTH Fase 4: push pra nuvem se logado
        autoSyncPet(nextPet);
      },

      // ── Edição de perfil ───────────────────────────────────
      updatePetProfile: async (nome, tipo, raca, foto, nascimento) => {
        const fotoFinal = await persistAndStripPhoto(foto);
        set((s) => {
          // Feedback TestFlight #7: ao mudar a raça, se o porte estava
          // auto-derivado da raça anterior (não foi mexido manualmente),
          // recalcular pra refletir a nova raça. Heurística: se o petSize
          // atual bate com o que getBreedSize() retornaria pra raça antiga,
          // foi auto-derivado e pode ser regenerado. Caso o user tenha
          // mexido em nutrition e escolhido um porte diferente, respeitar.
          const sanitizedRaca = sanitizeName(raca, INPUT_LIMITS.BREED_MAX);
          const racaChanged = sanitizedRaca !== s.pet.raca || tipo !== s.pet.tipo;
          let nextPetSize = s.pet.petSize;
          if (racaChanged) {
            const wasAutoDerived =
              s.pet.petSize === undefined ||
              s.pet.petSize === getBreedSize(s.pet.raca, s.pet.tipo);
            if (wasAutoDerived) {
              nextPetSize = getBreedSize(sanitizedRaca, tipo);
            }
          }
          const updatedPet: PetProfile = {
            ...s.pet,
            nome: sanitizeName(nome, INPUT_LIMITS.PET_NAME_MAX),
            tipo,
            raca: sanitizedRaca,
            foto: fotoFinal,
            nascimento,
            petSize: nextPetSize,
          };
          // DB-002: espelhar em pets[activePetId] sempre
          const nextPets = s.activePetId
            ? { ...s.pets, [s.activePetId]: updatedPet }
            : s.pets;
          return { pet: updatedPet, pets: nextPets };
        });
        // Sprint AUTH Fase 4: push pra nuvem se logado
        autoSyncPet(get().pet);
      },

      // ── Preferências nutricionais ──────────────────────────
      setPetNutrition: (fields) => {
        // Sanitiza notes ao gravar (XSS guard + length cap). Outros campos
        // são primitivos type-safe pelo TS.
        const safeFields = fields.notes !== undefined
          ? { ...fields, notes: sanitizeNote(fields.notes ?? '') || undefined }
          : fields;
        set((s) => ({ pet: { ...s.pet, ...safeFields } }));
        // SECURITY: só logar quais CAMPOS foram atualizados, não os valores.
        Sentry.addBreadcrumb({
          category: 'nutrition',
          message: 'setPetNutrition',
          level: 'info',
          data: {
            fieldsUpdated: Object.keys(safeFields).filter((k) => (safeFields as any)[k] !== undefined),
          },
        });
      },

      // ── Registro de ação ───────────────────────────────────
      addActionLog: async (key, photo, note, extra) => {
        const current = get();
        const photoFinal = photo ? await persistAndStripPhoto(photo) : undefined;

        // Fail-loud (2026-05-27): se chegamos aqui com pets[] populado
        // mas activePetId vazio, algo escapou do _cloudHydrated guard
        // no FAB da Home. Logar pra Sentry sem fallback automático —
        // pegar primeiro Object.keys(pets)[0] corromperia dado em
        // multi-pet (associaria log ao pet errado).
        const hasActivePet  = !!current.activePetId;
        const hasPetsInStore = Object.keys(current.pets ?? {}).length > 0;
        if (!hasActivePet && hasPetsInStore) {
          Sentry.captureException(
            new Error('addActionLog called with empty activePetId but pets in store'),
            {
              tags:  { op: 'addActionLog_no_active_pet' },
              extra: { petsCount: Object.keys(current.pets).length, key },
            },
          );
        }
        // Caso !hasActivePet && !hasPetsInStore: estado inicial /
        // sem pets — log sem pet_id é legítimo (compat mono-pet
        // legacy). Continua sem warning.

        const newLog: ActionLog = {
          id: makeId(),
          // DB-002: associa log ao pet ativo
          ...(current.activePetId ? { petId: current.activePetId } : {}),
          key,
          timestamp: Date.now(),
          ...(photoFinal ? { photo: photoFinal } : {}),
          ...(sanitizeNote(note ?? '') ? { note: sanitizeNote(note ?? '') } : {}),
          ...(extra?.quantity != null ? { quantity: extra.quantity } : {}),
          ...(extra?.duration != null ? { duration: extra.duration } : {}),
          ...(extra?.subActions?.length ? { subActions: extra.subActions } : {}),
          ...(extra?.volumeMl != null ? { volumeMl: extra.volumeMl } : {}),
          ...(extra?.acceptance ? { acceptance: extra.acceptance } : {}),
          ...(extra?.consistency ? { consistency: extra.consistency } : {}),
          ...(extra?.appearance ? { appearance: extra.appearance } : {}),
        };
        const newHistory = [...current.actionHistory, newLog];
        const today = getTodayString();

        const wasComplete = isDayComplete(current.actionHistory, today);
        const isCompleteNow = isDayComplete(newHistory, today);
        const newStreak = isCompleteNow && !wasComplete
          ? current.streak + 1
          : current.streak;

        set({ actionHistory: newHistory, streak: newStreak });

        track({
          name: 'action_logged',
          props: {
            actionKey: key,
            hasNote: !!sanitizeNote(note ?? ''),
            hasQuantity: extra?.quantity != null,
          },
        });
        if (current.actionHistory.length === 0) {
          const firstOpenMs = current.firstAppOpenAt;
          const days = firstOpenMs ? Math.floor((Date.now() - firstOpenMs) / 86400000) : 0;
          track({ name: 'first_action_logged', props: { actionKey: key, daysSinceOnboarding: days } });
        }
        if (isCompleteNow && !wasComplete) {
          track({
            name: 'daily_goals_completed',
            props: { streak: newStreak, petType: current.pet.tipo },
          });
        }

        // SECURITY: Nunca incluir dados clínicos (quantity, consistency,
        // appearance, volumeMl, etc) em breadcrumbs — são dados de saúde.
        // LGPD/GDPR: dados sensíveis não devem ir pra servidor de 3rd party.
        Sentry.addBreadcrumb({
          category: 'action',
          message: `addActionLog: ${key}`,
          level: 'info',
          data: {
            key,
            hasQuantity:   extra?.quantity != null,
            hasDuration:   extra?.duration != null,
            hasVolume:     extra?.volumeMl != null,
            hasSubActions: (extra?.subActions?.length ?? 0) > 0,
            dayCompleted:  isCompleteNow && !wasComplete,
          },
        });

        // Sprint AUTH Fase 4: push pra nuvem se logado (cobre solo
        // E modo família — helper resolve sessão + group automaticamente)
        autoSyncActionLog(newLog);

        // Notificações fire-and-forget
        const { notificationHour, notificationMinute, pet } = current;
        if (isCompleteNow) {
          cancelAllReminders().catch((err) => {
            Sentry.captureException(err, { tags: { op: 'cancelAllReminders' } });
          });
        } else {
          cancelAllReminders()
            .then(() => scheduleDailyReminder(pet.nome, newStreak, notificationHour, notificationMinute))
            .then(() => scheduleStreakAtRiskReminder(pet.nome, newStreak))
            .catch((err) => {
              Sentry.captureException(err, { tags: { op: 'rescheduleNotifications' } });
            });
        }
      },

      removeActionLog: (id) => {
        // R7-A1: deletar arquivo físico se o log tinha foto. Antes vazava
        // — log removido do store mas o JPG ficava órfão no Documents.
        // Best-effort: erro de delete não bloqueia (file pode já não existir).
        const current = get();
        const log = current.actionHistory.find((l) => l.id === id);
        if (log?.photo) deletePhotoFile(log.photo);
        set((s) => ({ actionHistory: s.actionHistory.filter((l) => l.id !== id) }));
        // Sprint AUTH Fase 4: propagar delete pra nuvem se logado
        autoSyncDeleteActionLog(id);
      },

      updateActionLog: (id, updates) => {
        set((s) => ({
          actionHistory: s.actionHistory.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        }));
      },

      // ── Virada de dia ──────────────────────────────────────
      checkAndResetDay: () => {
        const today = getTodayString();
        const current = get();
        if (current.todayDate === today) return;

        const diff = daysBetween(current.todayDate, today);
        const lastDayWasComplete = isDayComplete(current.actionHistory, current.todayDate);

        let newStreak = current.streak;
        let newShieldCount = current.streakShieldCount;

        if (diff === 1 && lastDayWasComplete) {
          // Ontem completo → mantém streak
        } else if (diff === 1 && !lastDayWasComplete && newShieldCount > 0) {
          // Ontem incompleto mas tem escudo → usa o escudo, mantém streak
          newShieldCount -= 1;
        } else {
          // Qualquer outra situação → zera streak
          newStreak = 0;
        }

        set({ todayDate: today, streak: newStreak, streakShieldCount: newShieldCount });
      },

      // ── Escudo de streak ───────────────────────────────────
      useStreakShield: () => {
        const { streakShieldCount } = get();
        if (streakShieldCount > 0) set({ streakShieldCount: streakShieldCount - 1 });
      },

      // ── Configuração de notificação ────────────────────────
      setNotificationTime: (hour, minute) => {
        set({ notificationHour: hour, notificationMinute: minute });
        // Reagendar com novo horário se houver ações incompletas hoje
        const { actionHistory, pet, streak } = get();
        const today = getTodayString();
        if (!isDayComplete(actionHistory, today)) {
          cancelAllReminders()
            .then(() => scheduleDailyReminder(pet.nome, streak, hour, minute))
            .then(() => scheduleStreakAtRiskReminder(pet.nome, streak))
            .catch((err) => {
              Sentry.captureException(err, { tags: { op: 'setNotificationTime' } });
            });
        }
      },

      // ── Eventos médicos ────────────────────────────────────
      addMedicalEvent: async (type, note, photo) => {
        const photoFinal = photo ? await persistAndStripPhoto(photo) : undefined;
        const activePetId = get().activePetId;
        const event: MedicalEvent = {
          id: makeId(),
          ...(activePetId ? { petId: activePetId } : {}),
          type, timestamp: Date.now(),
          ...(photoFinal ? { photo: photoFinal } : {}),
          ...(sanitizeNote(note ?? '') ? { note: sanitizeNote(note ?? '') } : {}),
        };
        set((s) => ({ medicalEvents: [event, ...s.medicalEvents] }));
        // medical_events tem mapper? Não — skip auto-sync por enquanto.
        // TODO: criar autoSyncMedicalEvent quando mapper existir.
      },

      removeMedicalEvent: (id) => {
        // R7-A1: cleanup foto física (ver removeActionLog)
        const event = get().medicalEvents.find((e) => e.id === id);
        if (event?.photo) deletePhotoFile(event.photo);
        set((s) => ({ medicalEvents: s.medicalEvents.filter((e) => e.id !== id) }));
      },

      // ── Vacinas ────────────────────────────────────────────
      addVaccine: (data) => {
        const activePetId = get().activePetId;
        const vaccine: Vaccine = {
          id: makeId(),
          ...(activePetId ? { petId: activePetId } : {}),
          ...data,
        };
        set((s) => ({ vaccines: [vaccine, ...s.vaccines] }));
        // DB-004: auto-push pra cloud (fire-and-forget se logado)
        autoSyncVaccine(vaccine);
      },
      updateVaccine: (id, data) => {
        set((s) => ({ vaccines: s.vaccines.map((v) => v.id === id ? { ...v, ...data } : v) }));
        // Re-sync com dados atualizados
        const updated = get().vaccines.find((v) => v.id === id);
        if (updated) autoSyncVaccine(updated);
      },
      removeVaccine: (id) => {
        set((s) => ({ vaccines: s.vaccines.filter((v) => v.id !== id) }));
        // TODO: autoSyncDeleteVaccine — sem isso, delete fica só local
      },

      // ── Consultas ──────────────────────────────────────────
      addAppointment: async (data) => {
        const { scheduleAppointmentReminder } = await import('@/services/NotificationService');
        const notifId = await scheduleAppointmentReminder(
          data.titulo,
          data.data,
          data.hora,
        ).catch(() => undefined);
        const activePetId = get().activePetId;
        const appt: Appointment = {
          id: makeId(),
          ...(activePetId ? { petId: activePetId } : {}),
          ...data,
          ...(notifId ? { notificacaoId: notifId } : {}),
        };
        set((s) => ({ appointments: [appt, ...s.appointments] }));
        autoSyncAppointment(appt);
      },

      removeAppointment: (id) => {
        const appt = get().appointments.find((a) => a.id === id);
        if (appt?.notificacaoId) {
          import('@/services/NotificationService')
            .then(({ cancelNotification }) => cancelNotification(appt.notificacaoId!))
            .catch((err) => {
              Sentry.captureException(err, { tags: { op: 'cancelAppointmentNotification' } });
            });
        }
        set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
      },

      // ── Multi-pet (DB-002) ────────────────────────────────────
      addPet: async (profile) => {
        // Detecta se este é o primeiro pet ANTES do set — necessário
        // pra emitir first_pet_added apenas uma vez na vida do user.
        // Source heurístico: se hasOnboarded ainda é false, veio do
        // fluxo de onboarding; senão, veio da tela "Adicionar pet" manual.
        const wasEmpty = Object.keys(get().pets).length === 0;
        const wasOnboardedBeforeAdd = get().hasOnboarded;

        const fotoFinal = await persistAndStripPhoto(profile.foto);
        const petId = makeId();
        const newPet: PetProfile = {
          ...profile,
          id: petId,
          nome: sanitizeName(profile.nome, INPUT_LIMITS.PET_NAME_MAX),
          raca: sanitizeName(profile.raca, INPUT_LIMITS.BREED_MAX),
          foto: fotoFinal,
        };
        set((s) => ({
          pets: { ...s.pets, [petId]: newPet },
          activePetId: petId,
          pet: newPet,  // espelho legado
        }));
        // Sync pra cloud (fire-and-forget se logado)
        autoSyncPet(newPet);

        if (wasEmpty) {
          track({
            name: 'first_pet_added',
            props: { source: wasOnboardedBeforeAdd ? 'manual' : 'onboarding' },
          });
        }
        return petId;
      },

      removePet: (id) => {
        set((s) => {
          // Soft-remove: tira do pets, troca activePetId pra outro pet existente
          const remaining: Record<string, PetProfile> = {};
          for (const [pid, p] of Object.entries(s.pets)) {
            if (pid !== id) remaining[pid] = p;
          }
          const fallbackIds = Object.keys(remaining);
          const nextActiveId = fallbackIds[0] ?? '';
          const nextPet = nextActiveId
            ? remaining[nextActiveId]
            : { nome: '', tipo: 'cachorro' as PetType, raca: '', foto: '' };
          return {
            pets: remaining,
            activePetId: nextActiveId,
            pet: nextPet,
          };
        });
        // TODO ondas futuras: chamar Edge Function pra soft-delete remoto
      },

      setActivePet: (id) => {
        set((s) => {
          const target = s.pets[id];
          if (!target) return s;  // id inválido, no-op
          return { activePetId: id, pet: target };
        });
      },

      // ── Sync helpers ──────────────────────────────────────────
      hydrateFromCloud: ({ pet, pets, actionLogs, vaccines, appointments, weightHistory }) => {
        set((s) => {
          const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
            const map = new Map<string, T>();
            // remote primeiro; local sobrescreve (prioridade local)
            [...remote, ...local].forEach((item) => map.set(item.id, item));
            return Array.from(map.values());
          };

          // DB-002 onda 4: hidratar pets[] do cloud. Merge:
          //   - cloud pets vão pra map; locais (que têm preferências
          //     nutricionais não-syncadas) sobrescrevem por id
          //   - activePetId é primeiro pet do cloud OU o local atual
          //     se já tiver (preserva escolha do user)
          const cloudPetsArr = pets ?? (pet ? [pet] : []);
          const nextPets: Record<string, PetProfile> = { ...s.pets };
          for (const cp of cloudPetsArr) {
            if (!cp.id) continue;
            // Se já tem local com mesmo id, merge (local prevalece em
            // campos nutricionais que não vêm do cloud)
            nextPets[cp.id] = { ...cp, ...(s.pets[cp.id] ?? {}) };
          }
          const cloudIds = cloudPetsArr.map((p) => p.id).filter(Boolean) as string[];
          const nextActiveId = s.activePetId && nextPets[s.activePetId]
            ? s.activePetId
            : (cloudIds[0] ?? '');
          const nextActivePet = nextPets[nextActiveId] ?? s.pet;

          return {
            pet: nextActivePet,
            pets: nextPets,
            activePetId: nextActiveId,
            actionHistory: mergeById(s.actionHistory, actionLogs)
              .sort((a, b) => b.timestamp - a.timestamp),
            vaccines:      mergeById(s.vaccines,      vaccines),
            appointments:  mergeById(s.appointments,  appointments),
            weightHistory: mergeById(s.weightHistory, weightHistory)
              .sort((a, b) => (a.data < b.data ? 1 : -1)),
            // Sinaliza que pull cloud completou — libera UI de ações
            // (gated em _layout.tsx via setCloudHydrated).
            _cloudHydrated: true,
          };
        });
      },

      appendRemoteLog: (log) => {
        set((s) => {
          // Ignora se já existe (proteção contra duplicatas de realtime)
          if (s.actionHistory.some((l) => l.id === log.id)) return s;
          return { actionHistory: [...s.actionHistory, log] };
        });
      },

      // Sprint AUTH Fase 5: usado pelo onboarding quando user signa in
      // num device novo e hydrateFromCloud retorna pet existente → pula
      // direto pro dashboard sem forçar criar pet de novo.
      markOnboarded: () => {
        set({ hasOnboarded: true, todayDate: getTodayString() });
        track({ name: 'onboarding_completed', props: { petType: get().pet.tipo, viaHydration: true } as any });
      },

      // ── Reset completo ────────────────────────────────────
      // Limpa TODO o state — usado em signOut + delete account.
      // Bug fix (2026-05-26): antes esquecia campos multi-pet
      // (pets, activePetId) e auth/premium (user, familyGroupId,
      // isPremium, premiumPlan, premiumExpiresAt). Resultado: ao
      // sair e entrar com outra conta, pets/Pro da conta antiga
      // permaneciam.
      resetStore: () => {
        cancelAllReminders().catch((err) => {
          Sentry.captureException(err, { tags: { op: 'resetStore.cancelReminders' } });
        });
        set({
          hasOnboarded:       false,
          // ── Pet legacy + multi-pet ─────────────────────────
          pet:                { nome: '', tipo: 'cachorro', raca: '', foto: '' },
          pets:               {},
          activePetId:        '',
          // ── Rotina diária ──────────────────────────────────
          streak:             0,
          streakShieldCount:  0,
          todayDate:          getTodayString(),
          actionHistory:      [],
          medicalEvents:      [],
          vaccines:           [],
          appointments:       [],
          weightHistory:      [],
          // ── Notificações ───────────────────────────────────
          notificationHour:   20,
          notificationMinute: 0,
          // ── Milestones / insights ──────────────────────────
          shownMilestones:         [],
          shownActivityMilestones: [],
          shownPremiumPrompts:     [],
          dismissedInsightIds:     [],
          snoozedInsights:         {},
          disabledInsightCategories: [],
          alertsHandledCount:  0,
          alertsHandledLastAt: null,
          notifiedInsightIds:  {},
          // ── Premium (zera Pro da conta antiga) ─────────────
          isPremium:        false,
          premiumPlan:      null,
          premiumExpiresAt: null,
          trialStartedAt:   null,
          // ── Auth (limpa info do user) ──────────────────────
          user:          null,
          familyGroupId: null,
          syncStatus:    'idle',
          // Próximo signIn precisa re-hidratar do cloud — UI volta
          // pro skeleton até pull resolver.
          _cloudHydrated: false,
          // ── UX flags ───────────────────────────────────────
          hasCompletedTour: false,
          aiConsentGiven:   false,
          biometricLockEnabled: false,
          // Preservados intencionalmente (preferência de device,
          // não de conta): themeMode, paletteMode, firstAppOpenAt.
        });
      },

      // ── Milestones ─────────────────────────────────────────
      markMilestoneShown: (days) => {
        set((s) => ({ shownMilestones: [...s.shownMilestones, days] }));
      },
      markActivityMilestoneShown: (id) => {
        set((s) => ({
          shownActivityMilestones: s.shownActivityMilestones.includes(id)
            ? s.shownActivityMilestones
            : [...s.shownActivityMilestones, id],
        }));
      },

      dismissInsight: (id) => {
        set((s) => ({
          dismissedInsightIds: s.dismissedInsightIds.includes(id)
            ? s.dismissedInsightIds
            : [...s.dismissedInsightIds, id],
        }));
      },
      clearDismissedInsights: () => set({ dismissedInsightIds: [] }),

      snoozeInsight: (id, hours) => {
        const until = Date.now() + hours * 60 * 60 * 1000;
        set((s) => ({ snoozedInsights: { ...s.snoozedInsights, [id]: until } }));
      },

      toggleInsightCategory: (category, enabled) => {
        set((s) => {
          const current = new Set(s.disabledInsightCategories);
          if (enabled) current.delete(category);
          else current.add(category);
          return { disabledInsightCategories: Array.from(current) };
        });
      },

      registerAlertHandled: () => {
        set((s) => ({
          alertsHandledCount: s.alertsHandledCount + 1,
          alertsHandledLastAt: Date.now(),
        }));
      },

      markInsightNotified: (id) => {
        set((s) => ({
          notifiedInsightIds: { ...s.notifiedInsightIds, [id]: Date.now() },
        }));
      },

      markPremiumPromptShown: (id) => {
        set((s) => ({
          shownPremiumPrompts: s.shownPremiumPrompts.includes(id)
            ? s.shownPremiumPrompts
            : [...s.shownPremiumPrompts, id],
        }));
      },

      // ── Premium ──────────────────────────────────────────
      setPremiumStatus: ({ isPremium, plan = null, expiresAt = null }) => {
        const wasPremium = get().isPremium;
        set({
          isPremium,
          premiumPlan:      plan,
          premiumExpiresAt: expiresAt,
        });
        // SECURITY: sem expiresAt exato (informação potencialmente identificável)
        Sentry.addBreadcrumb({
          category: 'premium',
          message: isPremium ? 'Subscription activated' : 'Subscription deactivated',
          level: 'info',
          data: { plan: plan ?? 'none' },
        });
        // Track só na transição (não em re-renders)
        if (isPremium && !wasPremium && plan) {
          // Store usa 'annual' mas analytics canonical é 'yearly'
          const trackPlan = plan === 'annual' ? 'yearly' : plan === 'monthly' ? 'monthly' : null;
          if (trackPlan) {
            track({ name: 'premium_purchase_completed', props: { plan: trackPlan } });
          }
        }
      },

      startTrial: () => {
        set((s) => s.trialStartedAt ? s : { trialStartedAt: Date.now() });
        Sentry.addBreadcrumb({
          category: 'premium',
          message: 'Trial started',
          level: 'info',
        });
      },

      recordFirstAppOpen: () => {
        set((s) => s.firstAppOpenAt ? s : { firstAppOpenAt: Date.now() });
      },

      setBiometricLock: (enabled) => {
        set({ biometricLockEnabled: enabled });
        Sentry.addBreadcrumb({
          category: 'security',
          message: `biometric lock ${enabled ? 'enabled' : 'disabled'}`,
          level: 'info',
        });
      },

      // ── Dev only: seed demo data ───────────────────────────
      seedDemoData: (data) => {
        set((s) => ({
          actionHistory: data.actionHistory ?? s.actionHistory,
          weightHistory: data.weightHistory ?? s.weightHistory,
          vaccines:      data.vaccines      ?? s.vaccines,
          appointments:  data.appointments  ?? s.appointments,
        }));
      },

      // ── Peso ───────────────────────────────────────────────
      addWeightEntry: (peso, data, nota) => {
        const activePetId = get().activePetId;
        const entry: WeightEntry = {
          id: makeId(),
          ...(activePetId ? { petId: activePetId } : {}),
          peso, data,
          ...(nota?.trim() ? { nota: nota.trim() } : {}),
        };
        set((s) => ({ weightHistory: [entry, ...s.weightHistory] }));
        // SECURITY: peso é dado de saúde — logar só o ato, não o valor
        Sentry.addBreadcrumb({
          category: 'health',
          message: 'addWeightEntry',
          level: 'info',
        });
        // DB-004: auto-push pra cloud (fire-and-forget se logado)
        autoSyncWeightEntry(entry);
      },
      removeWeightEntry: (id) => {
        set((s) => ({ weightHistory: s.weightHistory.filter((w) => w.id !== id) }));
      },
    }),
    {
      name: 'cronopet-pet-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // DB-002 migration: se store legado (pet.nome existe) mas pets{}
        // está vazio, popular com 1 entry + activePetId. Idempotente —
        // se pets já tem entries, no-op.
        if (state.pet?.nome && Object.keys(state.pets ?? {}).length === 0) {
          // Fallback: gera uuid v4 — id antigo `${epoch}-legacy` quebrava
          // upsert em pets (coluna uuid). Path raro: cobre devices com
          // MMKV pré-DB-002 que migram pra multi-pet sem pet.id setado.
          const petId = state.pet.id ?? Crypto.randomUUID();
          const migratedPet = { ...state.pet, id: petId };
          state.pets = { [petId]: migratedPet };
          state.activePetId = petId;
          state.pet = migratedPet;
        }

        // Migration legacy → uuid v4 (cleanup pós bug B1, 2026-05-26).
        // Idempotente: se nenhum pet legacy, no-op. Pode ser removido
        // em ~2026-11-26 quando todos beta testers tiverem reidratado.
        const migrated = migrateLegacyPetIds(state as unknown as MigrateState);
        if (migrated > 0) {
          Sentry.addBreadcrumb({
            category: 'migration',
            message:  'legacy_pet_ids_batch_migrated',
            level:    'info',
            data:     { count: migrated },
          });
        }

        state.setHasHydrated(true);
      },
      partialize: (state) => {
        const {
          _hasHydrated, setHasHydrated,
          _cloudHydrated, setCloudHydrated,
          completeOnboarding, updatePetProfile,
          addActionLog, removeActionLog, checkAndResetDay, useStreakShield,
          setNotificationTime,
          addMedicalEvent, removeMedicalEvent,
          addVaccine, updateVaccine, removeVaccine,
          addAppointment, removeAppointment,
          addWeightEntry, removeWeightEntry,
          addPet, removePet, setActivePet,
          hydrateFromCloud, appendRemoteLog,
          markOnboarded,
          resetStore,
          setUser, setFamilyGroupId, setSyncStatus,
          setThemeMode,
          markMilestoneShown,
          markActivityMilestoneShown,
          markPremiumPromptShown,
          dismissInsight,
          clearDismissedInsights,
          snoozeInsight,
          toggleInsightCategory,
          registerAlertHandled,
          markInsightNotified,
          setPremiumStatus,
          startTrial,
          recordFirstAppOpen,
          setBiometricLock,
          setPetNutrition,
          seedDemoData,
          ...rest
        } = state;
        return rest;
      },
    }
  )
);
