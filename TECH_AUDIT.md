# CronoPet — Tech Audit (2026-05-23)

> Auditoria abrangente pré-lançamento. Cobre: persistência de dados,
> dead code, integração Apple Store, design system. Espelha o formato
> de severidade do `SECURITY.md` e `UI_UX_AUDIT.md`.

**Status geral:** App tecnicamente sólido. 4 issues encontradas e
**3 já fixadas no commit deste audit**. 1 issue é débito conhecido (sync
delete não propaga em família) com workaround. Tudo limpo pra App Store
exceto os 2 blockers descritos em `INTEGRATIONS_AUDIT.md` (RevenueCat
key + IAP products).

---

## §A — Persistência de dados

### [H] A-1 — Fotos órfãs no Documents ✅ FIX APLICADO

**Antes:** `removeActionLog` e `removeMedicalEvent` removiam o registro
do store mas deixavam o JPG correspondente em `Documents/`. Cada delete
deixava ~200kb de lixo. Usuário power-user com 1000 deletes acumulava
~200mb de fotos órfãs invisíveis.

**Fix:** novo helper `deletePhotoFile(stored)` no `store/usePetStore.ts`
que reconstrói o path absoluto via filename relativo (cobre tanto formato
canônico novo quanto URI legacy) e chama `File.delete()`. Best-effort
(erro não throw — file pode já não existir). URLs http(s) são ignoradas
(não foram baixadas pra cá).

Aplicado em `removeActionLog` e `removeMedicalEvent`. Vacinas/consultas
não têm foto, não precisam.

### [M] A-2 — Sync delete não propaga em grupo familiar

**Estado:** `SyncService.pushActionLog` é chamado no `addActionLog`
quando o user é membro de grupo familiar. **Não há `pushRemoveLog`**.
Quando user A deleta um registro, user B continua vendo localmente
até forçar resync via `initialFullSync`.

**Workaround:** v1 não documenta família compartilhada como "real-time
sync delete". Usuários veem o registro até sair/voltar do grupo.

**Fix futuro:** adicionar `pushRemoveActionLog(groupId, logId)` →
`DELETE FROM family_action_logs WHERE id = ?` (com RLS check) e
chamar no `removeActionLog` se `familyGroupId && user`. Não é blocker
v1 — feature família compartilhada é Pro e ainda não tem usuários reais.

### ✅ A-3 — MMKV encryption

`store/storage.ts` usa chave AES-256 gerada no Keychain via
`ensureEncryptionKeyReady()`. Se chave indisponível, modo degradado
(MMKV sem encryption) é usado mas Sentry registra. Pattern correto.

### ✅ A-4 — Photo storage agora persiste entre updates

Filename relativo via `lib/photoPath.ts` + `resolvePhotoUri` no
runtime. Sobrevive a iOS container UUID changes (fix R3-1+4).

### ✅ A-5 — Date local (não UTC)

`lib/dateLocal.ts` substituiu todo `toISOString().slice(0,10)`. Reset
de dia funciona no fuso do user (fix R4-2). 8 callsites migrados.

### ✅ A-6 — Sanitização de input

`lib/security.ts` exporta `sanitizeName`, `sanitizeNote`, `escapeHtml`.
Aplicado em `updatePetProfile`, `setPetNutrition` (notas), addActionLog
(note). XSS guard + length cap em todos os campos free-text.

---

## §B — Code health

### [M] B-1 — `nativewind` + `react-native-css-interop` unused ✅ FIX

**Antes:** ambas deps no package.json. Único callsite era
`app/+not-found.tsx` com classes Tailwind.

**Fix:** reescrito `+not-found.tsx` em StyleSheet inline com
`useThemeColors`. `npm uninstall nativewind react-native-css-interop`
executado. Bundle ~280kb menor.

### [M] B-2 — Arquivos gigantes (acima de 800 LOC)

| Arquivo | LOC | Recomendação |
|---|---|---|
| `services/HealthInsights.ts` | 1667 | Split em 14 detectores separados (1 por heurística). Mantém o `analyzeHealth` orchestrator slim. |
| `app/(tabs)/index.tsx` | 1528 | Extrair modais de registro (comida/água/passeio/xixi/coco) em `components/home/LogModal/*`. ~600 LOC podem virar componentes. |
| `app/nutrition.tsx` | 1205 | `<FoodCard>`, `<NutritionForm>`, `<GoalCalorieCards>` pra `components/nutrition/`. |
| `app/premium.tsx` | 1165 | Sub-componentes: PlanCard, FamilyGroupSection, ComparisonTable. |
| `app/(tabs)/medical.tsx` | 897 | Modais de vacina/consulta/peso em `components/medical/`. |

**Não bloqueia release** — funciona OK. Mas afeta velocidade de iteração
e isolamento de mudanças. Trabalho de v1.1 sprint.

### [L] B-3 — `detectBathOverdue` dead code

Função `services/HealthInsights.ts:687` desabilitada em R3-2 mas
mantida no source com `eslint-disable @typescript-eslint/no-unused-vars`.
Decisão consciente: pode virar opt-in futuro. Sem ação.

### ✅ B-4 — TypeScript strict mode

`npx tsc --noEmit` retorna 0 errors. `interface`/types corretos.
Zero `any` espalhado nos arquivos críticos auditados.

### ✅ B-5 — Zero TouchableOpacity / activeOpacity

Migração completa pra `ScalePress` (CLAUDE.md compliance §9).
`hitSlop` prop adicionado pra cobrir touch targets pequenos.

### ✅ B-6 — Tests passing

14 suites verdes (`npm run test:all`). HealthInsights, sync mappers,
PDF helpers, util functions todos com cobertura.

---

## §C — Apple Store integration

> Detalhe completo no `INTEGRATIONS_AUDIT.md`. Resumo:

### 🔴 C-1 — RevenueCat KEY ausente em EAS Production (release-blocker)

**Estado:** `EXPO_PUBLIC_REVENUECAT_IOS_KEY` não está no EAS env.
`services/purchases.ts` roda em modo STUB. Apple vai rejeitar.

**Pendente (você):** ver `INTEGRATIONS_AUDIT.md` §B-1 com 4 passos.

### 🔴 C-2 — Apple Paid Apps Agreement (release-blocker)

Verificar status "Active" em ASC > Agreements.

### ✅ C-3 — Demais integrações OK

- Supabase URL + anon key + publishable key ✓
- Sentry DSN + auth token ✓
- OpenWeatherMap key ✓
- App Store Connect API Key registrada no EAS ✓
- Bundle ID `com.cronopet.app` ✓
- Apple Team `7RSGWY462K` ✓
- ITSAppUsesNonExemptEncryption: false ✓
- Privacy strings localizadas pt-BR pra camera, photos, location ✓
- Sentry organization/project linkados via plugin ✓

### ✅ C-4 — Dev premium (você + sócio)

`lib/devPremium.ts` com lista hardcoded. AuthService chama em
signUp/signIn/getSession. Funciona ortogonal a C-1.

---

## §D — Design system review

### ⚠️ D-1 — `app/premium.tsx`: 21+ hex `#04A29B` hardcoded

Esse arquivo (1165 LOC) tem brand color hardcoded em 21+ lugares em
vez de `colors.tabActive` / `brand.primary` do `useThemeColors`.

**Impacto:** dark mode e paleta neutra (R7-12) não afetam essas
strings — sempre vão renderizar verdigris brand mesmo no escuro.

**Trabalho:** refactor mecânico, ~30 min. Sed `'#04A29B'` →
`brand.primary` + adicionar `const { brand } = useThemeColors()`.
Não bloqueia release (a cor é mesmo a brand e renderiza igual no
modo cronopet) mas QUEBRA visual no modo light-neutral/dark-neutral.

### ✅ D-2 — Zero hex hardcoded nas outras telas

`nutrition.tsx` tem `'#ffffff'` em 2 lugares (texto sobre dark)
— aceitável pra contraste explícito. Demais arquivos limpos.

### ✅ D-3 — Tipografia

- `Nunito_700Bold` / `Nunito_800ExtraBold` usado consistentemente em headers
- Body usa font do sistema (SF Pro iOS)
- Conforme CLAUDE.md

### ✅ D-4 — Spacing 4px multiples

Audit visual confirma padding/margin majoritariamente em múltiplos de 4
(8, 12, 14, 16, 18, 20, 24). Algumas exceções (1, 2, 3) são intencionais
(separadores, ajustes finos).

### ✅ D-5 — Cocô icon migration completa

`PoopIcon` SVG custom em **todos** os callsites:
- `ALL_ACTIONS` (home grid)
- `DailyProgress` (chip progress)
- `log-detail` (header + sub-action chips)
- `ActivityMilestoneCard`
- `photos.tsx` (badge thumbnail)
- `constants/actionIcons.ts` (mapping central — usado por history)
- Sub-action chip "Fez cocô" no modal de passeio

### ✅ D-6 — Iconografia

Lucide pra UI chrome (Settings, Trash, Edit, Plus, Check, etc.) —
zero emoji em elementos interativos. Emojis preservados em ações do
pet (comida/água/passeio/xixi/banho) como identidade de marca,
exceto cocô que tem SVG (PoopIcon).

---

## §E — Rotina de operação

### ✅ E-1 — CI/CD

- EAS Build configurado em 3 perfis (development/preview/production)
- Submit automatizado via App Store Connect API Key
- Source maps pro Sentry via `SENTRY_AUTH_TOKEN`
- 6 builds enviadas sem falha (b3 → b8) em ~30min cada

### ✅ E-2 — Secrets management

- `.env` local (gitignored)
- `~/.cronopet-secrets/` pra tokens com chmod 600
- EAS env com sensitive flag pra prod
- Zero secret no histórico git (verificado via filter-branch anterior)

### ✅ E-3 — Migrations Supabase

4 migrations versionadas em `supabase/migrations/`:
- 001 RLS policies
- 002 RLS adapted
- 003 fix recursion
- 004 security hardening (SECURITY DEFINER search_path)

Validator anti-regressão na 004 — qualquer nova função SECURITY
DEFINER sem search_path falha o `db push`.

### ✅ E-4 — Sentry PII scrubbing

`beforeSend` + `beforeBreadcrumb` redact email/IP/auth tokens e
session cookies. Aplicado em M-4 da security audit anterior.

---

## §F — Plano de ação sugerido

**Pré-release público:**
1. ✅ Aplicar fixes deste audit (já feito: A-1 fotos órfãs, B-1 nativewind)
2. 🔴 Resolver C-1 (RevenueCat key + IAP products) — ver INTEGRATIONS_AUDIT.md
3. 🔴 Confirmar C-2 (Paid Apps Agreement Active)
4. ⚠️ D-1 (refactor `premium.tsx` hex → tokens) — 30min, opcional mas
   recomendado se quiser as paletas neutras funcionarem 100%

**v1.1 (próximo sprint):**
5. B-2 split de arquivos gigantes (HealthInsights, index, premium, nutrition)
6. A-2 sync delete em grupo familiar
7. B-3 decidir se mantém ou remove `detectBathOverdue`

**Polish contínuo:**
- Reproduzir cycles de TestFlight feedback → fix → build
- Cada 5 features novas, rodar `npx knip` + `npx tsc --noEmit` + tests

---

## §G — Health metrics atuais

| Métrica | Valor |
|---|---|
| LOC totais (app+components+services+store) | 20.167 |
| Arquivos TSX/TS | 49 |
| TypeScript errors | 0 |
| Knip unused exports | 0 |
| Test suites passando | 14/14 |
| ESLint errors | 0 |
| Migrations Supabase | 4 |
| EAS builds últimos 7 dias | 6 (b3→b8) |
| Submissions TestFlight | 6 |
| Tasks completed neste audit | 5 (R7-A/B/C/D/E) |

---

_Atualizar este doc a cada release minor ou quando descobrir issue
sistêmica. Pareia com `SECURITY.md`, `UI_UX_AUDIT.md`, `INTEGRATIONS_AUDIT.md`._
