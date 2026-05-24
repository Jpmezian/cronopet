# CronoPet — Product Overview Técnico

> Snapshot completo das funcionalidades, fluxos de dados e integrações.
> Destinado às equipes de TI / Design / Produto. Atualizado em 2026-05-24
> (commit `96afad1`, build #12 iOS no TestFlight).

---

## 1. Visão geral

**CronoPet** é um app mobile (iOS/Android) de cuidados com pets. Permite ao
tutor registrar a rotina diária (comida, água, passeio, xixi, cocô),
acompanhar saúde (vacinas, consultas, peso, ocorrências, banho/tosa),
visualizar tendências, gerar relatório PDF pra levar ao veterinário, e
opcionalmente compartilhar com família.

**Stack:**
- **Frontend:** React Native 0.81 + Expo SDK 54 (managed workflow)
- **Roteamento:** Expo Router (file-based, app/ directory)
- **State:** Zustand + persist middleware
- **Storage local:** MMKV criptografado (AES-256, chave no Keychain)
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Storage não usado)
- **Pagamentos:** RevenueCat (StoreKit 2 iOS / Google Play Billing Android)
- **Crashes:** Sentry com PII scrubbing
- **Analytics:** PostHog (opcional, fallback stub se key ausente)
- **Build/Deploy:** EAS Build + EAS Submit (não-interativo)

**Tamanho:** ~20.000 LOC TSX/TS, 49 componentes, 12 services, 6 hooks.

---

## 2. Arquitetura de dados

### 2.1 Persistência local (MMKV)

Todo o estado do usuário fica em **MMKV criptografado** (`store/storage.ts`).
A chave de encryption (AES-256) é gerada na primeira execução e guardada
no **iOS Keychain / Android Keystore** via `expo-secure-store`. Se a chave
não puder ser carregada, o app cai em modo degradado (MMKV sem encryption,
loga warning no Sentry).

**Estrutura do store (`store/usePetStore.ts`):**

| Campo | Tipo | O que guarda |
|---|---|---|
| `hasOnboarded` | boolean | Concluiu fluxo inicial |
| `pet` | `PetProfile` | Nome, tipo, raça, foto, nascimento, peso ideal, condição, etc |
| `streak` | number | Dias consecutivos completos |
| `streakShieldCount` | number | Escudos de proteção (max 1, recarrega semanal) |
| `todayDate` | string | YYYY-MM-DD fuso LOCAL (não UTC) |
| `actionHistory` | `ActionLog[]` | Todos os registros: comida, água, passeio, xixi, cocô, banho, tosa |
| `medicalEvents` | `MedicalEvent[]` | Sintomas, vômitos, alterações |
| `vaccines` | `Vaccine[]` | Vacinas aplicadas/agendadas |
| `appointments` | `Appointment[]` | Consultas marcadas |
| `weightHistory` | `WeightEntry[]` | Pesagens cronológicas |
| `notificationHour`/`Minute` | number | Hora do lembrete diário |
| `shownMilestones` | string[] | Marcos já celebrados (não celebrar 2x) |
| `dismissedInsightIds` | string[] | Insights de saúde que o user fechou |
| `snoozedInsights` | Record | Snooze temporário de insights |
| `disabledInsightCategories` | string[] | Categorias desligadas em Settings |
| `notifiedInsightIds` | Record | Anti-spam de push notifications |
| `biometricLockEnabled` | boolean | Trava biométrica do app |
| `isPremium`/`premiumPlan`/`premiumExpiresAt` | — | Status assinatura |
| `trialStartedAt`/`firstAppOpenAt` | number | Triggers temporais |
| `user`/`familyGroupId`/`syncStatus` | — | Auth + sync família |
| `themeMode` | `'system'\|'light'\|'dark'` | Light/dark/auto |
| `paletteMode` | `'cronopet'\|'light-neutral'\|'dark-neutral'` | Paleta visual |
| `hasCompletedTour` | boolean | Welcome tour pós-onboarding |

**Important:** o `partialize` no store remove explicitamente todas as
funções (actions) antes de serializar. Persiste APENAS o state.

### 2.2 Persistência remota (Supabase — opt-in via Pro)

Default: app funciona 100% offline com MMKV. Sync com Supabase ativa
**apenas quando** o user cria/entra num **grupo familiar** (feature Pro).

**Tabelas Postgres** (`supabase/migrations/`):
- `profiles` — id, email, nome, avatar_url (criada por trigger no signUp)
- `family_groups` — id, nome, owner_id, invite_code (6 chars uppercase)
- `family_members` — group_id, user_id, role ('owner'|'member')
- `pets` — perfil do pet compartilhado no grupo
- `action_logs` — réplica do `actionHistory` local com group_id + user_id
- `vaccines` — réplica
- `appointments` — réplica
- `weight_entries` — réplica
- `subscriptions` — estado de assinatura (também atualizado via webhook RC)
- `audit_log` — log de mudanças críticas

**RLS** (Row Level Security) ativo em todas. Cada user só lê/escreve
linhas onde `auth.uid()` é membro do `group_id` (validado via função
`is_group_member()` com `SECURITY DEFINER` + `search_path` fixado —
hardened em migration 004).

**Sync flow:**
- `addActionLog` em modo familiar → fire-and-forget `pushActionLog` via
  realtime channel + insert no Postgres. Outros membros recebem via
  Supabase Realtime subscription.
- `initialFullSync` ao entrar num grupo: push de todos os logs locais
- ⚠️ Débito conhecido: `removeActionLog` NÃO propaga delete (outros
  membros continuam vendo localmente). Documentado em `TECH_AUDIT.md` A-2.

### 2.3 Photos (arquivos físicos)

Fotos do pet + registros + eventos médicos:
1. ImagePicker → recebe URI temporária do sistema
2. `persistAndStripPhoto`: `ImageManipulator.manipulateAsync` re-encoda
   pra JPEG quality 85 (**remove EXIF, incluindo geolocalização** — security)
3. Copia pra `Documents/cronopet_photo_{timestamp}.jpg`
4. Salva apenas o **filename relativo** no MMKV (não path absoluto)
5. No render, `resolvePhotoUri(stored)` (`lib/photoPath.ts`) reconstrói
   URI absoluta com `Paths.document.uri` atual

**Por que filename relativo:** iOS reescreve o container UUID em cada
update — path absoluto vira inválido entre versões. Fix do R3-1+4.

**Cleanup órfão:** `removeActionLog` e `removeMedicalEvent` chamam
`deletePhotoFile(stored)` best-effort (R7-A1).

---

## 3. Funcionalidades por área

### 3.1 Onboarding (`app/onboarding.tsx`)

3 steps com animação spring/fade:

1. **StepWelcome** — logo CronoPet com float suave, 3 feature pills
2. **StepPetType** — seleção cachorro/gato/outro com ilustração
3. **StepPetProfile** — form: nome, raça (autocomplete fuzzy de
   ~80 raças canônicas), foto (ImagePicker), data de nascimento

Após `completeOnboarding`, dispara `WelcomeTour` (5 cards explicando
features). Tour é skippable + persistente (`hasCompletedTour`).

### 3.2 Home / Dashboard (`app/(tabs)/index.tsx`)

Layout vertical, scroll-friendly:

| Seção | O que mostra |
|---|---|
| Greeting | Saudação contextual ("Bom dia! O Rex já tomou café?") |
| PetHero | Foto banner 280px + nome + raça/idade + streak badge + edit |
| Daily Progress | Círculos visuais das metas do dia (refeição+água por padrão) |
| HOJE — Action grid | Botões coloridos: comida, água, passeio, xixi, cocô |
| Weather card | Clima local pra avaliar passeio (asfalto quente, etc.) |
| WellnessCard | Estimativa calórica (NRC 2006) — só se tem peso registrado |
| INSIGHTS | CriticalInsightBanner + HealthInsightsCard (gated Pro) |
| ActivityMilestoneCard | Celebração de marcos (100 passeios, 500 refeições) |
| BirthdayCard | Countdown se aniversário ≤ 30 dias |
| NutritionEntryCard | Link pra tela de plano nutricional |
| Resumo Semanal | Botão pra compartilhar card 9:16 (Stories) |

**Botões de ação:** tap abre modal de registro com campos contextuais:
- Comida: gramas, foto, observação, aceitação (😋/🥄/🙅)
- Água: ml
- Passeio: duração, sub-ações (xixi/cocô), aparência
- Cocô: consistência (normal/mole/líquida/dura)
- Banho/tosa: agora na tab Saúde (R3-7 + R8)

**Reset de dia:** `useEffect` no Home chama `checkAndResetDay()` no mount
**+ AppState listener** que dispara quando o app volta de background.
Compara `todayDate` (LOCAL) com `getLocalToday()`. Atualiza streak.

### 3.3 Histórico (`app/(tabs)/history.tsx`)

- Lista cronológica de todos `actionHistory`
- Filtros: hoje, ontem, últimos 7d, todos
- Filtros por tipo de ação (chips com ícone Lucide)
- Tap num registro → `log-detail` com edição/delete

### 3.4 Saúde (`app/(tabs)/medical.tsx`)

5 abas (SegmentedControl):

| Aba | Conteúdo |
|---|---|
| **Consultas** | Agendamento futuro + histórico passado |
| **Vacinas** | Aplicadas + próximas doses |
| **Peso** | Mini-gráfico + entries cronológicas + estimativa por raça |
| **Higiene** (R8) | Counter "último banho X dias" + "última tosa Y dias" + recomendação por raça + histórico |
| **Ocorrências** | Sintomas, vômitos, anormalidades |

Acima das tabs:
- **BreedHealthCard** — perfil da raça (predisposições, tolerância térmica) — só pra cachorros
- Botão "Gerar Relatório PDF" — exporta tudo via `expo-print` + `expo-sharing`

### 3.5 Nutrição (`app/nutrition.tsx`)

Plano nutricional detalhado:
- Inputs: peso atual, peso ideal, condição corporal, atividade, castrado, porte
- **Estimativa de peso** se não tem registrado (R2-4): faixa típica da
  raça × curva de crescimento (filhote→adulto)
- **NutritionTrustBanner** (3 chips): Sem parceria / NRC+FEDIAF / banco atualizado
- **Cálculo:** RER (NRC 2006: 70 × peso^0.75) × fator atividade ± ajuste
  para emagrecer/engordar
- Lista de rações recomendadas (`data/foods.ts`, 30+ marcas pt-BR)
  com gramas/dia + custo mensal calculados
- Cada FoodCard: tier (econômica/standard/premium/super), kcal/g, preço/kg
- "COMO CALCULAMOS" expandido com fórmulas + disclaimer veterinário

### 3.6 Premium (`app/premium.tsx`)

Paywall + gestão de assinatura + grupo familiar:
- 2 planos: mensal R$ 14,90 / anual R$ 99 — trial 7 dias
- Features Pro: histórico ilimitado, múltiplos pets, família compartilhada,
  backup nuvem, exportação completa, **avisos automáticos de saúde** (R2-10)
- Comparison table free vs Pro
- Se já Pro: mostra plano ativo + expiração + status sync + UI do grupo
  (criar/entrar com código de 6 chars, lista de membros)

### 3.7 Configurações (`app/settings.tsx`)

- **Aparência**: 3 paletas (CronoPet brand / Claro neutro / Escuro neutro)
  com mini-swatches de 3 cores. Submenu light/dark/system só pra CronoPet
- **Notificações**: hora do lembrete diário (botões ▲▼)
- **Avisos de saúde**: toggle por categoria (`InsightsSettingsCard`)
- **Privacidade**: card explicando dados locais + botão "apagar tudo"
- **Sobre**: logo + versão + botão "Ver tour novamente" + disclaimer vet

### 3.8 Outras telas

- `edit-profile.tsx` — edita pet (nome, tipo, raça, foto, nascimento, notas livres)
- `invite.tsx` — código pra entrar em grupo familiar
- `photos.tsx` — galeria de todas fotos cronológica (lightbox modal)
- `log-detail.tsx` — detalhe + edição + delete de um registro
- `(dev)/sandbox.tsx` — catálogo vivo de componentes (excluído de prod)

---

## 4. Lógicas técnicas críticas

### 4.1 Health Insights (`services/HealthInsights.ts`)

Motor heurístico de detecção de padrões. 100% local, sem rede, sem IA.
Roda em todo update do histórico via `useMemo`. **21 detectores**:

| ID | Detecta |
|---|---|
| `weight_variation` | Variação ≥5% em 14d / ≥10% em 30d |
| `weight_trend` | Tendência sustentada (3+ pesagens consecutivas) |
| `appetite_drop` | Recente < 60% baseline (warning) / <40% (alert) |
| `food_refusals` | acceptance=refused/partial em 3+ logs sucessivos |
| `hydration_gap` | Gap >24h durante o dia |
| `diarrhea` | 2+ logs liquid em 3d |
| `constipation` | 3+ hard em 5d OU >36h sem cocô (cachorro) |
| `abnormal_appearance` | Appearance='abnormal' em xixi/coco |
| `recurrent_medical_events` | 2+ do mesmo tipo em 14d |
| `breed_risk_match` | Sintoma + raça predisposta |
| `exercise_deficit` | Cachorro: < 70% do recomendado/raça (R4-2: exige ≥7d uso + ≥3 dias com passeio) |
| `bath_overdue` | ⚠️ **DESATIVADO em R3-2** (falso-positivo, dead code mantido) |
| `thermal_stress` | Raça heat-sensitive em dia >28°C |
| `polydipsia` | Água > 50% acima da média |
| `polyuria` | Xixi > 50% acima da média |
| `polyphagia_with_weight_loss` | Come muito mas perde peso |
| `lethargy` | Queda atividade vs baseline |
| `halitosis` | Logs com `note` contendo "mau hálito" |
| `ear_scratching` | Padrão de coçar orelha em sintomas |
| `periodontal` | Sintomas dentais recorrentes |

**Severities:** `info` < `warning` < `alert`. Cada insight tem ID
estável (mesmo conteúdo = mesmo ID → dismiss persiste).

**Gating Pro:** Free vê `InsightsPremiumGate` com preview do 1º insight
truncado + CTA paywall. Pro vê `HealthInsightsCard` completo.
**Critical insights** (severity=alert) passam livres pra free via
`CriticalInsightBanner` (não esconder emergências).

### 4.2 Streak system

- **Dia completo** = pelo menos 1 comida + 1 água registradas no dia
- `checkAndResetDay()` roda no mount do Home + AppState change
  - Se `todayDate` ≠ today: calcula `diff` (dias)
  - Se diff=1 e ontem foi completo → mantém streak
  - Se diff=1 e ontem incompleto mas tem escudo → consome escudo
  - Senão → zera
- **Milestones** celebrados via `MilestoneSheet` (7, 30, 100 dias)
- **Escudo** recarrega 1× por semana automaticamente (não implementado UI ainda)

### 4.3 Notificações (`services/NotificationService.ts`)

- Permissão: `requestPermissionsAsync` com try/catch + Sentry (R3 hardening)
- **Soft-ask**: `NotificationAskSheet` aparece após 1ª meta completa
  (em vez do prompt nativo direto — princípio de neurodesign)
- **Lembrete diário**: trigger CALENDAR no `expo-notifications`,
  dispara no `notificationHour:Minute` configurado
- **Streak-at-risk**: agendado pras 21h se dia ainda não completo
- **Channels Android**: `cronopet-daily` (DEFAULT) + `cronopet-appointments` (HIGH)
- **Insights críticos**: hook `useSmartHealthNotifications` agenda push
  local quando detecta alert/warning novo (anti-spam via `notifiedInsightIds`)

### 4.4 Pagamentos (`services/purchases.ts`)

Wrapper sobre RevenueCat com 2 modos:
- **`live`**: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` setada → chama SDK real
- **`stub`**: env ausente → simula localmente (DEV)

Atual: build #12 está em **stub** porque a key não está no EAS Production
(release-blocker C-1 do `INTEGRATIONS_AUDIT.md`).

**Dev premium override** (`lib/devPremium.ts`): emails hardcoded
(`rocha3751@gmail.com` + `viniciusvrcoutinho@gmail.com`) ganham
`isPremium=true` automaticamente em signUp/signIn/getSession.

**Flow:**
1. `initPurchases()` em `_layout.tsx` configura SDK
2. Tela `/premium` chama `getOfferings()` + `purchasePackage(pkg)`
3. Listener `addCustomerInfoUpdateListener` atualiza store via `setPremiumStatus`
4. Restore: `restorePurchases()` reativa em outro device do mesmo Apple ID

### 4.5 IA opt-in (Edge Function `health-analysis`)

`supabase/functions/health-analysis/index.ts`:
- Recebe payload **anonimizado** (sem nome, foto, email, user_id)
- Chama API Anthropic com prompt clínico
- Retorna `AIHealthAnalysis` estruturado (summary, observations,
  suggestions, severity)
- **Privacidade:** function não persiste nada. Request → API → response.
- **Segurança:** `verify_jwt = true` (R3 H-3) + CORS allowlist explícita
- **API key:** apenas no servidor (`Deno.env.get('ANTHROPIC_API_KEY')`)

Cliente (`services/AIInsights.ts`) chama via `EXPO_PUBLIC_AI_ENDPOINT`,
cacheia resposta localmente (1×/dia). Feature **Pro opt-in**.

### 4.6 PDF Report (`services/PdfReportService.ts`)

Gera HTML → `expo-print` → `expo-sharing`. Conteúdo:
- Header: foto + nome + raça + idade + data de geração
- Disclaimer veterinário
- Insights heurísticos (filtra category='breed' — R2-9)
- ~~Perfil da raça~~ REMOVIDO em R2-9 (vet pode achar invasivo)
- Anotações do tutor (notes livres do pet — R3-8)
- Resumo 30 dias: contagens por ação + totais (food, walks)
- Vacinas, consultas (futuras+passadas), pesagens
- Ocorrências médicas
- Logs do dia (últimos 30 com fotos)
- Cores WCAG AA (corrigidas em R3-9)

### 4.7 Card compartilhável (`components/ui/WeeklyReportCard.tsx`)

Renderizado off-screen (`position: absolute, left: -9999`), capturado
via `react-native-view-shot` em JPG. Dimensões 360×640 (escala 3× = 1080×1920
para Stories). Layout:
- Header: "RESUMO SEMANAL" + date range
- Hero: foto pet 108px com border accent + nome
- Streak Hero: número 72pt centralizado + emoji 🔥
- 7-day grid: círculos verdes pra dias completos / vazios pra incompletos
- Stats 2x2: refeições / hidratações / passeios / peso (com delta vs semana anterior)
- Footer: 🐾 CronoPet wordmark

Cores: paleta brand Verdigris/Celadon, 3 camadas de View empilhadas
(em vez de SVG gradient — mais robusto pro captureRef).

---

## 5. Integrações externas

| Serviço | Uso | Status |
|---|---|---|
| **Supabase** | Auth + DB + Edge Function | ✅ Produção (`qhbsmvuwuiupdqdrrdov.supabase.co`) |
| **Sentry** | Crash + perf monitoring com PII scrub | ✅ Live (`joao-pedro-mezian/cronopet`) |
| **RevenueCat** | IAP wrapper | ⚠️ Stub mode (key não está no EAS prod) |
| **PostHog** | Product analytics opcional | Opcional (key vazia = stub) |
| **OpenWeatherMap** | Clima local pra passeio | ✅ Free tier (1k calls/dia) |
| **Anthropic API** | IA opt-in Pro | ✅ Via Edge Function (key server-side) |
| **EAS Build** | CI/CD builds iOS/Android | ✅ Configurado, 12 builds enviadas |
| **EAS Submit** | Submission ASC automática | ✅ API Key registrada |
| **App Store Connect** | Distribuição iOS | ✅ App ID 6770387252, TestFlight Internal ativo |
| **Google Play Console** | Distribuição Android | ❌ Não configurado ainda |

---

## 6. Segurança

Auditoria completa em `SECURITY.md`. Highlights:
- **Encryption at rest**: MMKV AES-256 com chave Keychain
- **EXIF stripping**: toda foto re-encodada (remove GPS, device, timestamp)
- **PII scrubbing Sentry**: `beforeSend` + `beforeBreadcrumb` redact email/IP/tokens
- **RLS Postgres**: todas tabelas com row-level security
- **`SECURITY DEFINER` hardening**: search_path fixado (migration 004)
- **PKCE OAuth flow**: configurado no Supabase client
- **Edge Function**: `verify_jwt: true` + CORS allowlist
- **Cleartext traffic**: bloqueado por default (HTTPS only)
- **Permissões mínimas**: blocked READ/WRITE_EXTERNAL_STORAGE (Android)
- **Strings localizadas**: pt-BR pra todas permission requests
- **Biometric lock**: opt-in via `expo-local-authentication` (Face/Touch ID)

---

## 7. Design system

Documentado em `CLAUDE.md`. Regras hard:
- **Tipografia:** Nunito 700/800 pra headers ≥17px, sistema pra body
- **Cores:** **proibido hex hardcoded** (exceto SocialCard que é offscreen).
  Tudo via `useThemeColors()` ou `@/constants/colors`
- **Iconografia:** Lucide pra UI chrome, emoji **só** em ações do pet
  (exceto cocô que tem SVG custom `PoopIcon` — feedback TestFlight)
- **Spacing:** múltiplos de 4px
- **Motion:** `useMotion()` obrigatório em listas (respeita reduced-motion)
- **Touch feedback:** `ScalePress` (substitui TouchableOpacity)
- **Toast:** sistema global via `useToastStore` + `<ToastRenderer />`
- **Acessibilidade:** `accessibilityLabel` obrigatório em interativos

3 paletas suportadas (R7-12):
1. **CronoPet** (brand): Verdigris #04A29B + Celadon + Beige
2. **Light Neutral**: slate-50/900 (iOS Notes look)
3. **Dark Neutral**: slate-900/50

---

## 8. Estado do projeto (build #12)

**Features completas (free + pro):**
- ✅ Onboarding 3 steps
- ✅ Registro de 7 ações (comida, água, passeio, xixi, cocô, banho, tosa)
- ✅ Dashboard contextual com greeting + weather + insights
- ✅ Histórico filtravel + edit + delete + foto
- ✅ Tab Saúde com 5 abas (Consultas, Vacinas, Peso, Higiene, Ocorrências)
- ✅ Plano nutricional com 30+ rações e cálculo NRC 2006
- ✅ PDF veterinário com cores WCAG AA
- ✅ Card compartilhável 9:16 pra Stories
- ✅ 21 detectores de health insights heurísticos
- ✅ Estimativa de peso por raça+idade
- ✅ Auto-fill de porte por raça
- ✅ Notificações locais (lembrete + streak risk)
- ✅ Biometric lock opcional
- ✅ 3 paletas de tema + dark mode
- ✅ Welcome tour pós-onboarding (5 steps com back)
- ✅ Soft-ask permissão notificações
- ✅ Anotações livres do pet

**Features Pro (gated):**
- 🔒 Health Insights completo (free vê só preview)
- 🔒 Histórico ilimitado (free: 30d — não implementado limite ainda)
- 🔒 Múltiplos pets — não implementado ainda
- 🔒 Família compartilhada (criar/entrar grupo) — implementado mas sem
  sync de delete
- 🔒 Backup nuvem (Supabase sync) — funciona em modo família
- 🔒 IA opt-in via Edge Function
- 🔒 Exportação completa de dados

**Release-blockers conhecidos (`INTEGRATIONS_AUDIT.md`):**
- 🔴 RevenueCat API key precisa estar no EAS Production
- 🔴 IAP products no App Store Connect
- 🔴 Apple Paid Apps Agreement Active

**Débitos técnicos (`TECH_AUDIT.md`):**
- ⚠️ Sync delete não propaga em grupo familiar (workaround: feature
  ainda sem users reais)
- ⚠️ 5 arquivos > 800 LOC (split sugerido v1.1)
- ⚠️ `premium.tsx` tem 21 hex `#04A29B` hardcoded (quebra paletas neutras)

**Métricas saúde:**
- TypeScript errors: 0
- Knip unused exports: 0
- Test suites: 14/14 ✓
- LOC: 20.167
- Builds enviadas: 12 (sem regressões em produção)
- Crashes Sentry últimos 30d: 0 reportados em prod (TestFlight só)

---

## 9. Documentos relacionados

- **`SECURITY.md`** — auditoria de segurança detalhada (12 dimensões)
- **`UI_UX_AUDIT.md`** — auditoria UX com severity-tagged findings
- **`TECH_AUDIT.md`** — audit tech de persistência + code health + design
- **`INTEGRATIONS_AUDIT.md`** — checklist Apple Store + IAP + RevenueCat
- **`APP_STORE_SUBMISSION.md`** — pack pronto pra ASC (privacy, ASO, screenshots)
- **`CLAUDE.md`** — design system + regras hard de UI
- **`LAUNCH.md`** — checklist de lançamento
- **`TESTING.md`** — estratégia de testes
- **`README.md`** — setup local pra dev

---

## 10. Fluxos críticos resumidos

### 10.1 Auth + Sync início

```
[App open]
  ↓
_layout.tsx
  ↓ ensureEncryptionKeyReady (Keychain)
  ↓ MMKV criptografado disponível
  ↓ Zustand hidrata
  ↓ initAnalytics + initPurchases (fire-and-forget)
  ↓ getSession (cold start auth)
    ↓ se logado → maybeApplyDevPremium(email)
       → se email match lista dev → setPremiumStatus(isPremium=true)
  ↓ guard de onboarding (se !hasOnboarded → /onboarding)
  ↓ render tabs/home
```

### 10.2 Registro de ação

```
[User tap botão "Comida" no Home]
  ↓ openModal(action)
  ↓ user preenche quantidade + foto (opcional) + nota
  ↓ tap "Salvar"
  ↓ addActionLog(key, photo, note, extra)
    ↓ persistAndStripPhoto: re-encoda + remove EXIF + salva Documents
    ↓ append no actionHistory (MMKV)
    ↓ recalcula streak + dispara haptic Success
    ↓ se virou "dia completo" → MilestoneSheet
    ↓ se em grupo familiar → SyncService.pushActionLog (fire-and-forget)
    ↓ cancela/reagenda lembrete diário
    ↓ Sentry breadcrumb (sem PII)
  ↓ fecha modal + showToast
```

### 10.3 Geração de PDF

```
[User tap "Gerar Relatório" na tab Saúde]
  ↓ generateVetReport(pet, actionHistory, medicalEvents, vaccines, ...)
    ↓ analyzeHealth (heurístico local) — filter !breed category
    ↓ toBase64(petPhoto) se houver
    ↓ computeReportStats (30 dias)
    ↓ buildHtml com sections: header / disclaimer / insights /
                              notes / resumo / vacinas / consultas /
                              peso / ocorrências / logs
    ↓ expo-print.printToFileAsync(html)
    ↓ expo-sharing.shareAsync(uri)
  ↓ user compartilha via WhatsApp/AirDrop/email
```

### 10.4 Insights heurísticos

```
[useMemo recalcula sempre que actionHistory muda]
  ↓ analyzeHealth({ pet, actionHistory, weightHistory, medicalEvents, weather })
    ↓ buildContext: agrupa logs por categoria + breedProfile
    ↓ roda 20 detectores em paralelo (cada um filtra próprios dados)
    ↓ retorna HealthInsight[] ordenado por severity desc
  ↓ filter: dismissedInsightIds + snoozedInsights + disabledCategories
  ↓ render:
    • CriticalInsightBanner (alerts free + pro)
    • HealthInsightsCard (pro) ou InsightsPremiumGate (free)
  ↓ useSmartHealthNotifications agenda push local
    pra novos alerts (anti-spam via notifiedInsightIds)
```

---

_Última atualização: 2026-05-24 (commit `96afad1`, build #12 iOS no TestFlight).
Atualizar este doc a cada release minor._
