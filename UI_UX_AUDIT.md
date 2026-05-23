# CronoPet — UI/UX Audit (pré-launch)

> Auditoria sistemática contra `CLAUDE.md` e WCAG 2.2 AA/AAA. Cada finding é taggeado com severidade (C/H/M/L), arquivo:linha, e patch sugerido. Formato espelha `SECURITY.md`.

**Escopo:** 15 telas (`app/`), 33 componentes (`components/`), ~14k LOC TSX. Build #3 (TestFlight) já contém fixes de onboarding overflow + rato Unsplash.

**Severidade:**
- **[C]** Crítico — bloqueia release ou viola WCAG AA explicitamente
- **[H]** Alto — quebra heurística de UX ou regra hard do CLAUDE.md
- **[M]** Médio — débito técnico que vai pesar a partir de v1.1
- **[L]** Baixo — polish / nice-to-have

---

## Sumário executivo

| Categoria | C | H | M | L | Total |
|---|---|---|---|---|---|
| Acessibilidade (leitor de tela) | 0 | 4 | 2 | 0 | 6 |
| Design tokens (cores hardcoded) | 0 | 2 | 1 | 0 | 3 |
| Motion (CLAUDE.md §9) | 0 | 1 | 1 | 0 | 2 |
| Loading/Empty/Error states | 0 | 2 | 1 | 0 | 3 |
| Responsivo / overflow | 0 | 1 | 2 | 0 | 3 |
| Emoji em UI chrome | 0 | 1 | 1 | 0 | 2 |
| Arquitetura / file size | 0 | 0 | 1 | 1 | 2 |
| **Total** | **0** | **11** | **9** | **1** | **21** |

**Bloqueadores de release:** zero. Os [H] em a11y são impeditivos para AAA (leitor de tela) mas o app passa AA visual. Recomendação: fix dos top-5 [H] antes do Apple Review (1–2 dias de trabalho).

---

## §A — Acessibilidade (leitor de tela)

CLAUDE.md exige `accessibilityLabel` em **todo** elemento interativo (regra hard). Auditoria automatizada com `rg` mostra cobertura baixa.

### [H] A-1 — 72/106 `<ScalePress>` sem `accessibilityLabel` (68%)

**Arquivos críticos** (todas as ocorrências sem label):
- `app/edit-profile.tsx` — 6/6 ScalePress sem label
- `app/settings.tsx` — 7/7 sem label (linhas 103, 139, 189, 204, 220, 235)
- `app/invite.tsx` — 3/3 (linha 75 = botão "Copiar código")
- `app/log-detail.tsx` — 3/3 (linha 170 = botão deletar)
- `app/(tabs)/index.tsx` — 11 ScalePress, ~7 sem label

**Impacto:** VoiceOver/TalkBack lê "botão" em vez de "Deletar registro" / "Editar perfil de Rex" / "Copiar código de convite". Quebra Princípio 4.1.2 do WCAG (Name/Role/Value).

**Patch padrão por tipo:**
```tsx
// settings.tsx ações principais
<ScalePress
  onPress={handleEditProfile}
  accessible
  accessibilityRole="button"
  accessibilityLabel={`Editar perfil de ${pet.nome}`}
  accessibilityHint="Abre a tela de edição"
>

// log-detail.tsx delete
<ScalePress
  onPress={handleDelete}
  accessible
  accessibilityRole="button"
  accessibilityLabel="Deletar registro"
  accessibilityHint="Remove permanentemente este registro do histórico"
>

// invite.tsx copy
<ScalePress
  onPress={copyCode}
  accessible
  accessibilityRole="button"
  accessibilityLabel={`Copiar código de convite ${code}`}
  accessibilityHint="Copia o código para a área de transferência"
>
```

### [H] A-2 — 18/18 `<TextInput>` sem `accessibilityLabel` (100%)

- `app/premium.tsx` — 5 inputs (código convite + outros)
- `app/edit-profile.tsx` — 3 inputs (nome, raça, idade)
- `app/(tabs)/medical.tsx` — 6 inputs (vacina, peso, consulta…)
- `app/(tabs)/index.tsx` — 4 inputs (modais de registro)

**Impacto:** leitor de tela diz "campo de texto vazio". Usuário cego não consegue preencher formulários do app.

**Patch:**
```tsx
<TextInput
  value={nome}
  onChangeText={setNome}
  placeholder="Nome do pet"
  accessibilityLabel="Nome do pet"
  accessibilityHint="Digite o nome do seu pet"
/>
```

### [H] A-3 — Touch targets < 44pt sem `hitSlop`

- `components/ui/PremiumTriggerSheet.tsx:57` — botão fechar (X)
- `components/medical/HealthInsightsCard.tsx:207` — toggle compacto

**Patch:**
```tsx
<ScalePress hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} ...>
```

WCAG 2.2 SC 2.5.8 (Level AA, novo no 2.2): mínimo 24×24 CSS px com 24px de espaçamento, ou 44×44. CronPet deve mirar 44×44 (iOS HIG).

### [H] A-4 — Imagens decorativas sem `importantForAccessibility="no"`

- `components/onboarding/IllustrationWelcome.tsx`, `IllustrationSetup.tsx`, `IllustrationRoutine.tsx` — SVGs grandes anunciados pelo VoiceOver como blob de paths.

**Patch:** wrap em View com `importantForAccessibility="no"` + `accessibilityElementsHidden={true}` (iOS).

### [M] A-5 — Falta `accessibilityLiveRegion` em toasts

- `components/ui/ToastRenderer.tsx` — toasts entram via slide mas leitor não anuncia.

**Patch:** adicionar `accessibilityLiveRegion="polite"` no `<Animated.View>` do toast (Android) + `accessibilityRole="alert"` (iOS).

### [M] A-6 — Dynamic Type / fontScale não tratado

Grep `fontScale|allowFontScaling`: **zero** ocorrências. Usuários com texto grande no iOS quebram layouts densos (cards de progresso, tab bar).

**Patch global:** em `app/_layout.tsx`, capar fontScale para ≤ 1.3 OU adicionar `maxFontSizeMultiplier={1.3}` nos `<Text>` críticos (badges, chips). Idealmente testar com Dynamic Type ativo no Settings do iOS.

---

## §B — Design tokens (cores hardcoded)

CLAUDE.md §"Lei de Cores": **proibição absoluta** de hex hardcoded fora de `constants/colors.ts`. Todo arquivo deve usar `useThemeColors()`.

### [H] B-1 — `app/nutrition.tsx` com hex hardcoded

```
nutrition.tsx:265   shadowColor: '#000', ...
nutrition.tsx:521   shadowColor: '#000', ...
nutrition.tsx:682   color: '#ffffff'
nutrition.tsx:842   color: '#ffffff'
nutrition.tsx:968   shadowColor: '#000', ...
```

`#000`/`#fff` literais quebram dark mode parcial (sombras ficam invisíveis no dark, branco em badge sobre fundo claro fica ilegível).

**Patch:** trocar por `colors.shadowColor` (criar token se não existir) e `colors.textOnPrimary`.

### [H] B-2 — `app/premium.tsx` com brand hex espalhado

```
premium.tsx:311  backgroundColor: '#04A29B'  // brand teal
premium.tsx:399  color: '#04A29B'
premium.tsx:599  syncColor = '#036E69' : '#d97706' : '#dc2626'
premium.tsx:610  color: '#04A29B'
premium.tsx:638  backgroundColor: '#059669'
```

Brand teal (#04A29B) deveria ser `colors.brandPrimary`. Status colors deveriam vir de `colors.success/warning/error`.

**Patch:** adicionar `brandPrimary`, `brandPrimaryDark` em `useThemeColors`. Substituir 5 ocorrências.

### [M] B-3 — `components/medical/InsightsSettingsCard.tsx` switch hardcoded

Linha 185–189: `trackColor`, `thumbColor`, `ios_backgroundColor` hardcoded com fallback isDark inline. Já lê `isDark` mas duplica lógica que deveria estar em `useThemeColors`.

**Patch:** expor `colors.switchTrack`, `colors.switchThumb` no hook.

---

## §C — Motion (CLAUDE.md §9)

CLAUDE.md exige uso obrigatório de `useMotion()` em listas. `FadeIn.springify()` direto é **proibido**.

### [H] C-1 — `components/medical/AIHealthAnalysis.tsx` usa `FadeIn` direto

3 ocorrências (linhas 192, 202, 286) sem usar `useMotion()`. Não respeita Reduced Motion sistêmico do usuário em iOS Settings → Accessibility → Motion.

**Patch:**
```tsx
import { useMotion } from '@/hooks/useMotion';
const { entering } = useMotion();
<Animated.View entering={entering(0)} ...>
```

### [M] C-2 — `app/onboarding.tsx` usa `FadeInRight` direto

3 ocorrências (linhas 182, 285, 399). Verifica `useReducedMotion` manualmente — funciona, mas duplica lógica do `useMotion`. Refatorar para usar o hook canônico.

`components/medical/BreedHealthCard.tsx:61` faz isso correto (`reducedMotion ? FadeIn.duration : FadeIn.springify`). Boa referência.

---

## §D — Loading / Empty / Error states

### [H] D-1 — `ActivityIndicator` ainda usado em vez de `Skeleton`

CLAUDE.md: "Skeleton > ActivityIndicator em loading assíncrono".

8 ocorrências de `ActivityIndicator`:
- `app/premium.tsx` (3×) — botões de submit ✅ OK (button spinner é exceção)
- `app/edit-profile.tsx` (2×) — botões de submit ✅ OK
- `app/(tabs)/index.tsx:1264` — botão submit ✅ OK
- `app/(tabs)/medical.tsx` (2×) — botões submit ✅ OK
- `components/medical/AIHealthAnalysis.tsx:193` ❌ — loading de **conteúdo** (análise IA), deveria ser Skeleton

**Patch:** substituir AIHealthAnalysis loading por Skeleton com shape dos cards de insight (rectangle 100% × 80, gap 12, 3 itens).

### [H] D-2 — ErrorBoundary apenas global (expo-router)

Único `ErrorBoundary` é o export default do `app/_layout.tsx` (via expo-router). Telas pesadas (premium, medical, nutrition) com fetch Supabase não têm boundary local. Crash em uma sheet derruba a screen inteira.

**Patch:** wrap `<AIHealthAnalysis>`, `<BreedHealthCard>`, `<WeeklyReportCard>` em ErrorBoundary custom com fallback "Não foi possível carregar — tentar de novo" + retry button.

### [M] D-3 — EmptyState bem coberto, mas `app/(tabs)/index.tsx` sem empty para "nenhum pet"

History (2×), medical (4×), photos (1×) usam `<EmptyState>` corretamente. Home (`(tabs)/index.tsx`) não tem caso de "nenhum pet cadastrado" porque o guard de onboarding garante isso — mas se o pet for deletado dentro do app (settings → delete pet), volta um estado quebrado.

**Patch:** após delete pet, router.replace para `/onboarding`. Ou fallback EmptyState no Home.

---

## §E — Responsivo / overflow

### [H] E-1 — 4 componentes com `space-between` sem ScrollView (risco iPhone SE 1)

Mesmo padrão que quebrou o onboarding em TestFlight:
- `components/ui/WeeklyReportCard.tsx`
- `components/home/DailyProgress.tsx`
- `components/home/CalorieBadge.tsx`
- `components/medical/WeightChart.tsx`

Em iPhone SE 1 (320×568, hoje raro) ou iPhone 13 Mini com Dynamic Type +20%, esses cards podem cortar conteúdo na borda.

**Patch:** auditoria manual em simulador iPhone SE / 13 mini. Se algum cortar, wrap em ScrollView horizontal (para WeightChart) ou aumentar minHeight + ScrollView vertical interno (para WeeklyReportCard).

### [M] E-2 — `app/(tabs)/index.tsx` 1461 LOC

Maior arquivo do projeto. Modais inline (registrar comida, água, etc.) duplicam estrutura. Refatorar para `components/home/LogActionSheet.tsx` reutilizável.

### [M] E-3 — `app/premium.tsx` 1158 LOC + `app/nutrition.tsx` 1143 LOC

Mesma issue. Sub-componentes lógicos (PlanCard, GroupInviteSection, NutritionCalculator) deveriam morar em `components/`.

---

## §F — Emoji em UI chrome (CLAUDE.md §"Iconografia")

CLAUDE.md: emoji é OK em **ações do pet** (comida/água/passeio), mas **NUNCA** em elemento interativo de chrome.

### [H] F-1 — Emojis em CTAs/badges interativos

- `app/premium.tsx:50` — badge `'🔥 MAIS POPULAR'` em PlanCard ⚠️ badge é decorativo, mas está num card clicável (selecionar plano)
- `app/premium.tsx:701` — `<Text style={{ fontSize: 20 }}>⚡</Text>` dentro de elemento de feature
- `app/(tabs)/index.tsx:741` — `<Text>⚡</Text>` em card de upgrade premium (clicável)
- `components/ui/WeeklyReportCard.tsx:212` — `🔥` em badge de streak (card clicável)

**Patch:** trocar `🔥` por `<Flame size={16} strokeWidth={2.4} color={colors.statusWarning} />`, `⚡` por `<Zap size={20}/>` (já são Lucide standard).

### [M] F-2 — `app/+not-found.tsx:9` usa 🐾 como hero icon

Tela de 404. Substituir por `<PawPrint size={72}/>` para consistência com PetPhoto fallback.

---

## §G — Polish / Arquitetura

### [L] G-1 — Arquivos > 800 LOC sem split

`index.tsx` (1461), `premium.tsx` (1158), `nutrition.tsx` (1143), `medical.tsx` (895), `sandbox.tsx` (814).

Não bloqueia release mas afeta velocidade de iteração. Split é trabalho de v1.1.

---

## §H — Coisas que estão BEM (registro positivo)

Não vira finding mas reforça padrões:

1. **Zero `TouchableOpacity` residual** — migração completa para `<ScalePress>`. Excelente.
2. **`useThemeColors` adoção 80%** (39/49 arquivos) — bom. Os 10 sem hook são utilitários puros (illustrations, layouts root).
3. **`SafeAreaView` em 12 telas** + `KeyboardAvoidingView` em 6 — cobertura adequada.
4. **`EmptyState` cobre history/medical/photos** com props consistentes.
5. **`PetPhoto` fallback** (build #3) — extingue dependência de Unsplash, color-coded por tipo.
6. **WCAG 2.2 AA visual** auditado em CLAUDE.md (todas as cores semânticas ≥ 4.5:1).
7. **Dark mode tokens** via `actionTheme` no hook — pattern correto.

---

## §I — Plano de ação (sugestão)

**Antes do submit final (1–2 dias):**
1. A-1 + A-2 (labels em ScalePress + TextInput) — ~3h de trabalho mecânico
2. A-3 (hitSlop) — 10min
3. B-1 + B-2 (hex hardcoded em nutrition + premium) — 1h
4. F-1 (emojis em CTAs trocados por Lucide) — 30min

**v1.1 (próximo sprint):**
5. C-1 + C-2 (motion via useMotion)
6. D-1 + D-2 (Skeleton em AIHealthAnalysis + ErrorBoundary local)
7. A-5 + A-6 (live regions + Dynamic Type cap)
8. E-2 + E-3 + G-1 (split de arquivos gigantes)

**Pós v1.1 (polish):**
9. A-4 (imagens decorativas) — pequeno mas afeta VoiceOver
10. B-3, D-3, E-1, F-2 — débito menor

---

## §J — Validação

Para auditar drift no futuro, rodar:

```bash
# A11y: ScalePress sem label
rg -U "<ScalePress[\s\S]{0,300}?accessibilityLabel" app/ components/ -g '*.tsx' -c

# Hex hardcoded fora de constants/
rg "'#[0-9a-fA-F]{3,8}'" app/ components/ -g '*.tsx' | grep -v "constants/"

# FadeIn direto sem useMotion
rg "FadeIn|FadeInDown|FadeInUp" app/ components/ -g '*.tsx' | rg -v "useMotion|reducedMotion"

# ActivityIndicator em loading de conteúdo (não-button)
rg -B3 -A3 "ActivityIndicator" app/ components/ -g '*.tsx'
```

Adicionar como step em CI quando houver pipeline.

---

_Auditado contra CLAUDE.md vigente. Atualizar este doc sempre que CLAUDE.md mudar._
