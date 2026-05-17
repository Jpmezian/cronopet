# Plano de Testes — CronoPet

> Estratégia para chegar em "shippable com confiança" — não 100% coverage.
> Foca em **lógica de negócio crítica**, **regressões frequentes** e
> **bordas que LLMs introduzem sem perceber**.

---

## Onde já estamos hoje (2026-05-17)

| Área | Tipo | Cobertura | Como rodar |
|---|---|---|---|
| `services/HealthInsights.ts` (40 detectores) | Gold dataset sintético (51 casos) | 46/46 prefixos de ID | `npm run test:health` |
| `data/calories.ts` (NRC nutrition) | 10 casos contra ref NRC + edge | RER/MER/lose-floor/life-stage | `npm run test:calories` |
| `data/breed-conditions.ts` (lookup) | 10 casos (exact/partial/fuzzy/SRD) | Matching + fallback defensivo | `npm run test:breeds` |
| `lib/fuzzy.ts` (autocomplete) | 7 casos por camada | Exact/prefix/substring/fuzzy | `npm run test:fuzzy` |
| `lib/security.ts` (input + rate limit) | 7 casos com time mock | Sanitize/strength/email/rate | `npm run test:security` |
| `store/useToastStore.ts` | 5 casos | showToast/dismiss/duration | `npm run test:toast` |
| `store/usePetStore.ts` | 15 casos | CRUD + streak + dismiss/snooze/toggle | `npm run test:pet` |
| `hooks/usePremium.ts` (`computePremiumStatus`) | 9 casos | Trial + paid + expiração + sobreposição | `npm run test:premium` |
| `hooks/usePremiumTriggers.ts` (`pickPremiumTrigger`) | 10 casos | 5 triggers + prioridade + shownPrompts | `npm run test:triggers` |
| `hooks/useThemeColors.ts` (`pickIsDark`) | 3 casos | dark/light/system override | `npm run test:theme` |
| **Total Wave 1+2+3+4** | **127 casos** | **<80ms full run** | `npm run test:all` |
| E2E iOS | Maestro flows | Onboarding (1 flow) | `npm run test:e2e` |
| Type safety | `tsc --noEmit` | 100% (incl. tsconfig.test.json) | `npm run typecheck` |
| Dead code | `knip` | 100% clean | `npx knip` |

Todo o resto (UI, animações, motion) é validado manualmente via
`/sandbox` (catálogo nativo) ou no device.

**Bugs reais encontrados pelos testes durante construção:**
- `data/calories.ts:ageFromBirth` aceitava datas inválidas silenciosamente
  (`2026-13-99` virava `~Jan/2027` via auto-normalize do `new Date`).
  Corrigido com validação de range + round-trip check.

---

## Princípios

1. **Lógica determinística merece testes unitários.** Detectores, cálculos
   nutricionais, sync mapping, parsing — onde input → output é
   reproduzível, vale o investimento.
2. **UI muda toda semana, não testar com snapshot.** Snapshot tests
   geram falsa segurança e quebram a cada decisão de design. Para UI,
   confiamos em screenshot review via `/sandbox`.
3. **Stores e hooks devem ter testes de comportamento.** Eles encapsulam
   estado crítico (multi-pet, premium, themeMode, milestones). Bug aqui
   é silencioso e propaga.
4. **E2E só pra fluxos com risco financeiro/dados.** Onboarding,
   checkout premium, exportação de PDF, account deletion. Não E2E pra
   "consigo abrir a tela X".
5. **Cada bug encontrado em produção vira um caso de regressão.** O
   gold dataset (`__tests__/health-insights/cases.ts`) é o modelo.

---

## Bateria — wave by wave

### Wave 1 — Já implementado ✅
- [x] `HealthInsights` gold dataset (51 casos curados, 46/46 detectores cobertos)
- [x] Maestro E2E onboarding

### Wave 2 — Pure logic units ✅
- [x] `data/calories.ts` (10 casos, NRC reference values)
- [x] `data/breed-conditions.ts` (10 casos, exact/partial/fuzzy/SRD fallback)
- [x] `lib/fuzzy.ts` (7 casos, todas as camadas do matcher)
- [x] `lib/security.ts` (7 casos, com time mock pra rate limit)
- [x] Mini-framework compartilhado em `__tests__/_lib/assert.ts`
- [x] `tsconfig.test.json` + stub de `expo-crypto` pra rodar security em Node
- [ ] `lib/email-typo-suggest.ts` (no projeto web, separado) — Wave 2b futura

### Wave 3 — Stores ✅
- [x] `useToastStore` (5 casos — showToast/dismiss/duration/fila-de-1)
- [x] `usePetStore` (15 casos — onboarding/CRUD/streak/dismiss/snooze/toggle/reset)
- [x] 7 stubs nativos em `__tests__/_stubs/` (mmkv, secure-store, file-system,
      image-manipulator, sentry, notifications, sync) — todos no
      `tsconfig.test.json` paths
- [x] Runner híbrido sync/async em `assert.ts` (IIFE interno awaita cada
      caso sequencialmente; suite files chamam `runSuite(...)` sem await)

### Wave 4 — Hooks ✅
- [x] `usePremium.ts`: extraído `computePremiumStatus(input)` pura,
      testada com 9 casos (free, pago ativo/expirado, trial dia 3/8,
      sobreposição pago+trial, daysSinceFirstOpen floor, trialDaysLeft ceil)
- [x] `usePremiumTriggers.ts`: extraído `pickPremiumTrigger(input)` pura,
      testada com 10 casos (premium não vê, threshold de cada um dos 5
      triggers, prioridade, shownPrompts respeitado, esgotamento da fila)
- [x] `useThemeColors.ts`: extraído `pickIsDark(themeMode, scheme)` pura,
      testada com 3 casos (override dark/light vs system)
- [x] Stub `react-native.ts` adicionado pra suportar `useColorScheme`
      import top-level (hook real ainda precisa de renderHook pra ser
      testado end-to-end — fora do escopo desta wave)

### Wave 4 fora do escopo (futuro)
- [ ] `useMotion.ts`: requer stub completo de `react-native-reanimated`
      ou refactor pra retornar shape em vez de Reanimated objects
- [ ] `useSmartHealthNotifications.ts` + `useWeather.ts`: side-effecting
      hooks (notif scheduling, fetch) — testes seriam de integração via
      Maestro ou exigem stubs muito grandes

### Wave 2 (especificação original — referência)

Arquivos sem dependência de React/Native — testáveis com `tsx` direto,
sem Jest config.

| Arquivo | O que testar | Casos sintéticos sugeridos |
|---|---|---|
| `data/calories.ts` | RER, DER, MER, GoalCalories. Saída comparada com NRC reference values. | 8 — cão adulto manutenção, cão obeso lose, gato sênior gain, neutered, puppy growth, edge case 0kg, edge case 200kg, life-stage transitions |
| `data/breed-conditions.ts` | `getBreedHealthProfile` matching: exact, partial, fuzzy. | 10 — match exato (Labrador), partial ("Labrador Retriever Chocolate"), fuzzy ("lavrador"), null para "outro", fallback vira-lata em string vazia, breeds com acentos |
| `lib/fuzzy.ts` | `fuzzyMatch`, `bestMatch`. | 6 — exact, prefix, substring, fuzzy típico, no-match, min-score filter |
| `lib/security.ts` | `checkRateLimit`/`recordRateLimitAttempt`/`clearRateLimit`. Tempo simulado com `Date.now` mockado. | 5 — 1ª tentativa allowed, 5ª tentativa allowed, 6ª blocked, lockout expira, reset clears |
| `lib/email-typo-suggest.ts` (web) | Damerau-Levenshtein, KNOWN_DOMAINS coverage. | 8 — gmial→gmail, yaho→yahoo, hotnail→hotmail, joao.con→joao.com, válido sem sugestão, sem @, domínio desconhecido |

**Setup:** Mesma pattern do `__tests__/health-insights/`. Cada arquivo
ganha seu próprio `cases.ts` + `run.ts` enxuto. Script no `package.json`:

```json
{
  "scripts": {
    "test:health":   "tsx __tests__/health-insights/run.ts",
    "test:calories": "tsx __tests__/calories/run.ts",
    "test:breeds":   "tsx __tests__/breeds/run.ts",
    "test:fuzzy":    "tsx __tests__/fuzzy/run.ts",
    "test:security": "tsx __tests__/security/run.ts",
    "test:all":      "npm run test:health && npm run test:calories && npm run test:breeds && npm run test:fuzzy && npm run test:security"
  }
}
```

### Wave 3 — Stores (prioridade ALTA)

Zustand stores. Podem rodar em Node usando `zustand/vanilla` para os
testes — não precisa de React. Pra testar o middleware persist com
MMKV, mockamos o storage adapter.

| Store | Comportamento crítico | Casos |
|---|---|---|
| `usePetStore` | `addAction`, `editAction`, `deleteAction`, `setPet`, milestones (`markActivityMilestoneShown`), dismiss persistente de insights, `addWeight`/`editWeight` retroativo, `toggleInsightCategory` | 15 casos. Cobrir cada CRUD + edge: editar log antigo não muda dayKey errado, deletar log idempotente, dismiss persiste cross-reload |
| `useToastStore` | `showToast` enfileira, `dismissToast` remove por id, auto-dismiss após N ms | 4 casos |

**Setup:**
```ts
// __tests__/store/usePetStore.test.ts
import { usePetStore } from '@/store/usePetStore';
beforeEach(() => usePetStore.getState().reset()); // adicionar reset() ao store p/ testes
```

### Wave 4 — Hooks (prioridade MÉDIA)

Hooks puros (sem efeitos colaterais) podem ser testados com
`@testing-library/react-hooks` ou via simples `renderHook` em
`react-test-renderer`. Hooks com side-effect (notifications, weather)
ficam pra integration.

| Hook | Casos |
|---|---|
| `useMotion` | reduced-motion=true retorna FadeIn, false retorna spring com stagger crescente |
| `usePremium` | isPremium quando store true, false default, premium nunca expira em DEV |
| `usePremiumTriggers` | Trigger correto para 2º pet, sync, family-sharing, export |
| `useThemeColors` | dark mode override, light default, actionTheme reflete tema |

### Wave 5 — Services (prioridade MÉDIA)

| Service | O que testar | Casos |
|---|---|---|
| `PdfReportService` | Geração do PDF não quebra em pet sem peso, sem eventos, com 0 logs. Headers contêm nome correto. | 6 |
| `SyncService` | `pullFromCloud` mapeia campos Supabase corretamente; `pushToCloud` envia delta minimal; conflict resolution favorece local em caso de timestamp empate | 5 |
| `NotificationService` | `scheduleSmartReminder` calcula próximo trigger respeitando quiet hours; cancela duplicatas; respeita disabled categories | 4 |

**Mocks necessários:**
- Supabase client → fake response builder
- `expo-notifications` → record schedule calls in array
- `expo-file-system` → in-memory fs

### Wave 6 — E2E Maestro (prioridade BAIXA, mas crítico onde está)

Cobertura atual: apenas onboarding. Adicionar:

1. **Premium purchase flow** — DEV stub triggers, gates UI atualizam, restore funciona
2. **PDF export + share** — gera, abre share sheet, verifica filename
3. **Account deletion** — confirma, limpa MMKV, redireciona pra auth
4. **Multi-pet switch** — adicionar 2º pet, switch entre eles, contagens não vazam
5. **Health insight dismiss** — dismiss persiste após restart

Cada flow é 1 arquivo `.yaml` em `.maestro/`. Rodar: `npm run test:e2e`.

### Wave 7 — Visual regression (prioridade BAIXA)

Pra UI: ScreenshotBot-style via Maestro `takeScreenshot` em frames
canônicos do `/sandbox`. Comparação manual em PR (não automático —
não temos baseline server).

Frames sugeridos:
- ActionButton (default / pressed / disabled / dark)
- HealthInsightsCard (vazio / 3 cards / com critical)
- DailyProgress (0/3, 1/3, 3/3 celebration)
- PetHero (com foto, sem foto, gato vs cachorro)

---

## Anti-patterns que os testes devem capturar

Lista de bugs que JÁ ACONTECERAM ou são patterns que LLMs introduzem:

1. **Threshold de borda em janelas de dias.** Helpers que shiftam timestamps
   por horas podem jogar entradas pra fora da janela. (Gold dataset case 21
   pegou esse durante construção.)
2. **breedKey mismatch.** `'Dogue Alemão'` não bate em breedKey `'gran danes'`
   sem mapeamento explícito. Cobrir com fuzzy test.
3. **`isSenior()` em pets sem `nascimento`.** Composto que requer senior
   deve retornar false silenciosamente, não throw.
4. **Sync push sem connectivity.** SyncService deve enfileirar não falhar.
5. **MMKV encryption key rotacionada.** `resetStorageInstance()` deve ser
   chamável sem deixar app num estado quebrado.
6. **Insight ID com dayKey timezone.** Se `dayKey` muda na virada de
   meia-noite, dismiss de ontem não persiste pra hoje (esperado, mas
   testar que NÃO persiste em vez de persistir errado).
7. **WCAG contrast em modo dark.** Toda cor de texto sobre fundo dark
   deve ser auditada (snapshot manual com `/sandbox` em dark).

---

## O que NÃO testar (decisão consciente)

- Layouts visuais (snapshot tests). Caem a cada mudança de design system.
- Animações timing exato. Validar via `useReducedMotion` mock retorna
  fallback correto — não testar curves.
- Strings de copy. Mudam toda semana com revisões editoriais.
- 3rd-party SDK internals (Supabase, Sentry, RevenueCat). Mockamos a
  boundary; o que importa é como reagimos ao retorno.

---

## CI futuro

Quando montar GitHub Actions:

```yaml
name: tests
on: [pull_request, push]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci
      - run: npm run typecheck
      - run: npx knip
      - run: npm run test:all
```

E2E (Maestro) requer macOS runner — separar em job opcional manual:

```yaml
  e2e-ios:
    runs-on: macos-latest
    if: github.event_name == 'workflow_dispatch'
    steps: [...]
```

---

## Métricas a perseguir (pragmática, não dogma)

| Métrica | Hoje | Meta 1 mês | Meta 3 meses |
|---|---|---|---|
| Cobertura `services/` | 0% (exceto HealthInsights 100%) | 50% | 80% |
| Cobertura `data/` (puro) | ~100% via gold (só HealthInsights) | 80% | 90% |
| Cobertura `store/` | 0% | 70% | 85% |
| Cobertura `components/` | 0% | 0% (sandbox-only) | 20% (snapshot de invariantes) |
| `knip` clean | ✅ | ✅ | ✅ |
| Tempo full test:all | <1s | <5s | <30s |

Coverage % via `c8` (sem instrumentação de build) quando os runners
unitários forem montados.

---

## Próximos passos imediatos

1. ✅ Gold dataset HealthInsights (51 casos)
2. ✅ Wave 2 completa: calories + breeds + fuzzy + security (34 casos)
3. ✅ Wave 3 completa: toast + pet store (20 casos, 7 stubs nativos)
4. ✅ Wave 4 completa: hooks puros extraídos (22 casos)
5. ✅ `npm run test:all` rodando full Wave 1+2+3+4 em <80ms
6. ✅ GitHub Action ativo: typecheck + knip + test:all em todo PR/push
7. ✅ Wave 2b feita (no projeto web — 9 casos)
8. ⏭️  Wave 5 (futuro): SyncService com mock Supabase, PdfReportService
9. ⏭️  Wave 4b (futuro): useMotion via stub Reanimated
