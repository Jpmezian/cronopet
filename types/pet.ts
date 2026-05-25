// ─── Tipos globais do domínio Pet ────────────────────────────

export type PetType = 'cachorro' | 'gato' | 'outro';

// ─── Nutrição (Fase 11) ──────────────────────────────────────

export type NutritionGoal    = 'maintain' | 'lose' | 'gain';
export type BodyCondition    = 'thin' | 'ideal' | 'overweight' | 'obese';
export type BaselineActivity = 'low' | 'moderate' | 'high';
export type PetSize          = 'small' | 'medium' | 'large' | 'giant';
export type LifeStage        = 'puppy' | 'adult' | 'senior';

export interface PetProfile {
  /** UUID gerado client-side. Opcional pra back-compat com pets locais
   *  criados antes do refactor multi-pet (DB-002 onda 2). Quando ausente,
   *  store gera um id na primeira mutação e migra a row pra pets[]. */
  id?: string;
  nome: string;
  tipo: PetType;
  raca: string;
  foto: string;       // URI local ou URL remota
  nascimento?: string; // ISO date YYYY-MM-DD (opcional)

  // ── Preferências nutricionais (persistidas, opcionais) ──
  idealWeightKg?:    number;
  nutritionGoal?:    NutritionGoal;
  bodyCondition?:    BodyCondition;
  neutered?:         boolean;
  baselineActivity?: BaselineActivity;
  petSize?:          PetSize;

  /** Anotações gerais do tutor (R3-8): alergias, medicações, manias,
   *  particularidades. Texto livre, sai no PDF veterinário e fica
   *  acessível em edit-profile. Limitado por security/sanitizeNote. */
  notes?: string;
}

/** Chaves das ações diárias rastreáveis */
// R8: 'tosa' adicionada como ação separada do 'banho'. Ambas são
// grooming mas com frequências distintas (banho ~quinzenal, tosa
// ~mensal/bimensal). Counter "dias desde último" pra cada na tab Saúde.
export type ActionKey = 'comida' | 'agua' | 'passeio' | 'xixi' | 'coco' | 'banho' | 'tosa';

/** Como o pet aceitou a comida/água (valor clínico importante) */
export type Acceptance = 'full' | 'partial' | 'refused';

/** Consistência das fezes (indicador de saúde digestiva) */
export type Consistency = 'normal' | 'soft' | 'liquid' | 'hard';

/** Aparência geral (sinal clínico — normal vs alterado) */
export type Appearance = 'normal' | 'abnormal';

/** Um registro de ação — pode ter foto (com EXIF removido) e/ou nota */
export interface ActionLog {
  id: string;
  /** Pet associado (multi-pet). Opcional pra back-compat com logs
   *  criados antes do refactor — esses ficam visíveis em todos os
   *  pets (não podem ser desassociados sem heurística). */
  petId?: string;
  key: ActionKey;
  timestamp: number;
  photo?: string;              // URI local, EXIF já removido
  note?: string;
  quantity?: number;           // gramas — só para 'comida'
  duration?: number;           // minutos — só para 'passeio'
  subActions?: ActionKey[];    // ex: ['xixi','coco'] — só para 'passeio'
  volumeMl?: number;           // ml — só para 'agua'
  acceptance?: Acceptance;     // 'comida' / 'agua' — como o pet aceitou
  consistency?: Consistency;   // 'coco' — consistência das fezes
  appearance?: Appearance;     // 'xixi' / 'coco' — aparência normal ou alterada
}

// ─── Saúde / Médico ───────────────────────────────────────────

export type MedicalEventType =
  | 'vomito' | 'febre' | 'mancando' | 'diarreia'
  | 'coceira' | 'perda_apetite' | 'outro';

export interface MedicalEvent {
  id: string;
  petId?: string;     // DB-002: associação multi-pet (opcional pra back-compat)
  type: MedicalEventType;
  timestamp: number;
  note?: string;
  photo?: string;
}

export interface Vaccine {
  id: string;
  petId?: string;     // DB-002
  nome: string;
  data: string;       // YYYY-MM-DD
  proxima?: string;
  veterinario?: string;
  lote?: string;
  nota?: string;
}

export interface Appointment {
  id: string;
  petId?: string;     // DB-002
  titulo: string;         // Ex: "Consulta anual", "Banho e tosa"
  data: string;           // YYYY-MM-DD
  hora?: string;          // HH:MM
  veterinario?: string;
  nota?: string;
  notificacaoId?: string; // ID da notificação agendada
}

export interface WeightEntry {
  id: string;
  petId?: string;     // DB-002
  peso: number;  // kg
  data: string;  // YYYY-MM-DD
  nota?: string;
}

/** Metadados persistidos entre sessões */
export interface PetState {
  hasOnboarded: boolean;
  /** Pet ATIVO (espelhado de pets[activePetId]). Mantido como source-of-truth
   *  legacy pra back-compat com componentes que fazem useStore(s => s.pet).
   *  Toda escrita em pets[activePetId] também atualiza este campo. */
  pet: PetProfile;
  /** Coleção de pets (DB-002 multi-pet). Chave = pet.id (UUID gerado client).
   *  Migration automática no rehydrate: se vazio mas pet.nome existe,
   *  gera id e popula com 1 entry. */
  pets: Record<string, PetProfile>;
  /** ID do pet atualmente ativo na UI. Switcher altera. */
  activePetId: string;
  streak: number;
  streakShieldCount: number;   // "Proteções de streak" disponíveis (max 1, recarrega semanalmente)
  todayDate: string;           // YYYY-MM-DD
  actionHistory: ActionLog[];
  medicalEvents: MedicalEvent[];
  vaccines: Vaccine[];
  appointments: Appointment[];
  weightHistory: WeightEntry[];
  notificationHour: number;    // Hora do lembrete diário (0-23), default 20
  notificationMinute: number;  // Minuto do lembrete diário (0-59), default 0
  shownMilestones: number[];           // Marcos de streak já exibidos (7, 30, 100)
  shownActivityMilestones: string[];   // Marcos de atividade já celebrados (ex: "passeio-100")
  shownPremiumPrompts: string[];       // IDs de gatilhos Premium já mostrados (não insistir)

  // ── Security ──────────────────────────────────────────────
  /** Face ID / Touch ID lock ao abrir o app */
  biometricLockEnabled: boolean;

  // ── Premium / Assinatura ──────────────────────────────────
  // Fonte da verdade é o StoreKit/RevenueCat quando conectado.
  // Aqui são flags espelhadas no MMKV para resposta instantânea na UI.
  isPremium:        boolean;
  premiumPlan:      'monthly' | 'annual' | null;
  premiumExpiresAt: number | null;       // epoch ms; null = lifetime ou sem plano
  trialStartedAt:   number | null;       // epoch ms; null = nunca iniciou trial
  firstAppOpenAt:   number | null;       // epoch ms; usado pra trigger "7 dias"
}
