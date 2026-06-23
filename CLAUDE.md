# CronoPet — Design System & Agent Rules

> Leia este arquivo no início de TODA sessão antes de gerar qualquer código de UI.

---

## Tipografia

| Contexto | Família | Peso | Tamanho |
|---|---|---|---|
| Hero / Onboarding title | `Nunito_800ExtraBold` | 800 | 36px |
| Título de tela | `Nunito_700Bold` | 700 | 24px |
| Título de seção | `Nunito_700Bold` | 700 | 17–20px |
| Botão CTA | `Nunito_700Bold` | 700 | 15–16px |
| Corpo / descrições | Sistema (SF Pro / Roboto) | 400–600 | 13–15px |
| Legenda / hint | Sistema | 400–500 | 11–13px |

**Regra:** Nunito SOMENTE em elementos ≥ 17px com destaque visual. Corpo e legendas sempre fonte do sistema.

---

## Iconografia

- **UI chrome** (tabs, settings, back, trash, edit, plus, botões CTA, títulos de modal): `lucide-react-native` com `size={22}` e `strokeWidth={2}`
- **Ações do pet** (comida, água, passeio, xixi, cocô, banho): Emojis nativos — parte da identidade de marca, NÃO substituir
- **Títulos de seção estáticos** (ex: aba Médico): emojis permitidos como apoio ilustrativo para redução de carga emocional
- **NUNCA** usar emoji em elemento interativo (botão CTA, Tab Bar, controles). Qualquer botão ou ação clicável usa obrigatoriamente Lucide.

### Lucide — mapeamento de uso
| Elemento | Ícone Lucide |
|---|---|
| Tab Home | `Home` |
| Tab Histórico | `BarChart2` |
| Tab Saúde | `HeartPulse` |
| Settings | `Settings` |
| Voltar | `ChevronLeft` |
| Deletar | `Trash2` |
| Editar | `Pencil` |
| Adicionar | `Plus` |
| Copiar | `Copy` |
| Check | `Check` |
| Registrar ocorrência | `Stethoscope` |
| Adicionar vacina | `Syringe` |
| Agendar consulta | `CalendarPlus` |
| Registrar peso | `Scale` |

---

## Paleta de Cores

### Neutros
| Token | Hex |
|---|---|
| text-primary | `#1c1917` |
| text-secondary | `#78716c` |
| text-tertiary | `#a8a29e` |
| text-disabled | `#d6d3d1` |
| bg-screen | `#fafaf9` |
| bg-card | `#ffffff` |
| bg-input | `#f5f5f4` |
| border-light | `#e7e5e4` |

### ⛔ Lei de Cores — PROIBIÇÃO ABSOLUTA DE HARDCODE
**É TERMINANTEMENTE PROIBIDO usar cores hexadecimais hardcoded em qualquer tela ou componente.**
- Neutros de UI: consumir via `useThemeColors()` de `@/hooks/useThemeColors`
- Cores de ação do pet: importar de `@/constants/colors`
- Toda nova tela ou componente DEVE chamar `const { colors, actionTheme, isDark } = useThemeColors()` no topo

### Semântico — ações do pet (WCAG 2.2 AA auditadas)
Todas as cores primárias garantem contraste ≥ 4.5:1 sobre o fundo pastel correspondente.
Dark mode: fundos pastéis viram `rgba(primary, 0.18)` via `actionTheme` retornado pelo hook.
Importar de `@/constants/colors` — NUNCA hardcodar.

| Ação | Primária (texto/ícone) | Fundo | Borda | Contraste |
|---|---|---|---|---|
| comida | `#b45309` amber-700 | `#fffbeb` | `#fde68a` | 4.82:1 ✅ |
| agua | `#0369a1` sky-700 | `#f0f9ff` | `#bae6fd` | 5.76:1 ✅ |
| passeio | `#047857` emerald-700 | `#f0fdf4` | `#bbf7d0` | 5.27:1 ✅ |
| xixi | `#B58100` goldenrod | `#FCE89C` | `#F5D77A` | 3.36:1 ⚠️ large/ícone |
| coco | `#92400e` amber-900 | `#fef3c7` | `#fde68a` | 6.38:1 ✅ |
| banho | `#0369a1` sky-700 | `#f0f9ff` | `#bae6fd` | 5.76:1 ✅ |

### Status
| Token | Hex |
|---|---|
| success | `#059669` |
| warning | `#d97706` |
| error | `#dc2626` |
| info | `#2563eb` |
| pro-gold | `#fbbf24` |

---

## Motion & Microinterações

### ScalePress (obrigatório em TODOS os botões e cards clicáveis)
```
import { ScalePress } from '@/components/ui/ScalePress';
// Substitui TouchableOpacity em qualquer elemento clicável relevante
```
- Scale ao pressionar: `0.96`
- Spring: `{ damping: 15, stiffness: 300 }`

### Haptics (obrigatório)
```typescript
import * as Haptics from 'expo-haptics';

// Ação de sucesso (registrar comida, água etc.)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

// Toque padrão em botão
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Erro / alerta
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

---

## Sombras — padrão Soft

```typescript
// iOS
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.06,
shadowRadius: 8,

// Android
elevation: 2  // máximo 3 para elementos prominentes, nunca > 4
```

---

## Espaçamento & Radius

- Base unit: **4px**
- Padding lateral de tela: `20px`
- Gap entre seções: `20–24px`
- Padding de card: `16–20px`

| Elemento | Radius |
|---|---|
| Modal bottom sheet | 28px (top only) |
| Card grande / pet photo | 24px |
| Card padrão | 16–20px |
| Input / botão CTA | 14–16px |
| Badge / chip | 12px |
| Ícone bg | 8px |

---

## Regras Gerais

1. Background de tela: sempre `#fafaf9` — NUNCA branco puro
2. Cards brancos (`#ffffff`) sobre fundo `#fafaf9` criam profundidade sem sombra pesada
3. Estados desabilitados: `backgroundColor: '#e7e5e4'`, texto `#a8a29e`, sem elevation
4. `activeOpacity` legado: substituir por `ScalePress` progressivamente
5. Spacing sempre múltiplo de 4px
6. NUNCA usar cores fora da paleta documentada sem aprovação explícita
7. Cores semânticas SEMPRE importadas de `@/constants/colors` — nunca hardcoded
8. Novas cores de UI devem ser verificadas para contraste WCAG 2.2 AA (≥ 4.5:1 texto normal, ≥ 3:1 texto grande) antes de serem adicionadas ao sistema
9. **⛔ Uso direto de animações Reanimated em listas é PROIBIDO.**
   - `FadeInDown`, `FadeIn`, `springify()` etc. NUNCA devem ser chamados diretamente em telas
   - O hook `useMotion()` de `@/hooks/useMotion` é OBRIGATÓRIO — é ele que decide entre spring e fade baseado no Reduced Motion do usuário
   - `<ScalePress>` (já integrado) para press feedback — nunca `activeOpacity`
10. **Skeleton > ActivityIndicator** em qualquer estado de loading assíncrono (Supabase, API)
    - Usar `<Skeleton>` de `@/components/ui/Skeleton` com estrutura que imita o card real

---

## Motion Accessibility

### useReducedMotion
Todo componente animado deve verificar `useReducedMotion()` do `react-native-reanimated`.

| Comportamento normal | Com Reduced Motion ativo |
|---|---|
| ScalePress spring bounce | Fade de opacidade 60% → 100% |
| FadeInDown.springify() stagger | FadeIn 150ms sem delay |
| Shared transitions | Fade simples |

### Implementação padrão
```typescript
// Em listas — use sempre o hook
import { useMotion } from '@/hooks/useMotion';
const { entering, sectionEntering } = useMotion();
<Animated.View entering={entering(index)}>

// Em botões — ScalePress já lida internamente
import { ScalePress } from '@/components/ui/ScalePress';
```

---

## GenUI e Neurodesign

> A interface do CronoPet não é passiva. Ela celebra, antecipa e se adapta.

### Princípio 1 — Reforço Positivo Ético (Dopamine by Design)
- Toda conclusão de meta diária (comida + água + passeio) deve gerar uma **microinteração comemorativa**
- A celebração usa `withSequence` + `withSpring` do Reanimated para um pulse suave no componente `<DailyProgress />`
- Sempre acompanhada de `Haptics.notificationAsync(Success)` disparado **apenas na transição** `incompleto → completo` (não em cada log individual)
- Com Reduced Motion ativo: substituir o pulse por fade de opacidade (via `useReducedMotion()`)
- A celebração deve ser **proporcional e não intrusiva** — nunca bloquear o fluxo do usuário

### Princípio 2 — Interface Contextual (GenUI)
A tela Home deve refletir o estado atual do pet, não apenas listar botões estáticos:

| Contexto | Comportamento da UI |
|---|---|
| Manhã + comida não registrada | Greeting: "Bom dia! O {nome} já tomou café?" |
| Tarde + água há >6h | Greeting: "{nome} está hidratado?" |
| 17–18h + passeio não feito (cachorro) | Sugestão de passeio |
| Todos os goals completos | Greeting neutro + celebration card |

**Regra de urgência temporal:**
- `água`: >6h sem registro → botão recebe borda pulsante sutil
- `comida`: >10h sem registro → urgência visual equivalente
- A pulsação usa `withRepeat(withSequence(...))` e é **cancelada** (`cancelAnimation`) quando a ação é registrada
- Com Reduced Motion: borda urgente usa cor sólida sem animação

### Princípio 3 — Metas Diárias Canônicas
```typescript
// Metas core que definem "dia completo"
const DAILY_GOALS: ActionKey[] = ['comida', 'agua', 'passeio']; // cachorro
const DAILY_GOALS_GATO: ActionKey[] = ['comida', 'agua'];       // gato/outro
```

### Componente DailyProgress
- Localização: `components/home/DailyProgress.tsx`
- Props: `todayCounts`, `petTipo`, `petNome`, `streak`
- Chama `useThemeColors()` internamente
- Celebração é gerenciada internamente com `useRef` para detectar a transição `false → true`
- **Nunca** dispara haptics repetidos se o componente re-renderizar com metas já completas

### Loop de QA Visual (Auto-inspeção)
Antes de finalizar qualquer componente novo ou alteração complexa:
1. Verificar que todos os `gap`, `padding`, `margin` são **múltiplos de 4px**
2. Confirmar que cores de texto sobre fundos passam em **WCAG 2.2 AA (≥ 4.5:1)**
3. Simular mentalmente o layout em **dark mode** com `isDark = true`
4. Confirmar que animações têm fallback para `useReducedMotion()`
5. Se MCP visual (Playwright/Screenshot) estiver disponível: tirar screenshot e comparar com CLAUDE.md

---

## Acessibilidade de Leitor de Tela (VoiceOver / TalkBack)

> WCAG 2.2 Nível AA cobre contraste visual. Esta seção garante o Nível AAA para leitores de tela.

### Regras obrigatórias em todo elemento interativo

| Prop | Uso |
|---|---|
| `accessible={true}` | Obrigatório em todo elemento clicável ou informativo |
| `accessibilityRole` | `'button'` para ações, `'header'` para títulos, `'image'` para fotos, `'text'` para texto puro |
| `accessibilityLabel` | Descrição completa e acionável. **Nunca** apenas o emoji ou ícone isolado |
| `accessibilityHint` | Explica o que acontece ao ativar (ex: `"Abre o modal de registro"`) |
| `importantForAccessibility="no"` | Elementos puramente decorativos (ícones acompanhados de label, separadores, emojis de apoio) |

### Exemplos canônicos

```typescript
// ✅ Correto
<ScalePress
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={`Registrar consumo de água. ${count > 0 ? `Registrado ${count} vez hoje.` : 'Não registrado hoje.'}`}
  accessibilityHint="Abre o modal para registrar a hidratação do pet"
>

// ✅ Imagem do pet
<Image
  accessible={true}
  accessibilityRole="image"
  accessibilityLabel={`Foto de ${petNome}`}
/>

// ✅ Decorativo — silenciar leitores
<Text importantForAccessibility="no">🐾</Text>
```

### Regra de nomenclatura de labels
- Labels de ação: `"{Ação} de {contexto}. {Estado atual}."` → `"Registrar comida. Registrado 2 vezes hoje."`
- Labels de navegação: `"Ir para {destino}"` → `"Ir para configurações"`
- Labels de status: descritivo completo sem depender de cor → `"Dia completo. Todas as metas atingidas."`

---

## Dev Sandbox (`/sandbox`)

> Catálogo vivo de todos os componentes de UI — o "Storybook nativo" do CronoPet.

- **Rota:** `app/(dev)/sandbox.tsx`
- **Regra:** Todo novo componente criado em `components/` **DEVE** ser adicionado ao Sandbox com todas as suas variações (estados: default, active, disabled, dark mode)
- **Benefício para o agente:** permite validação visual de todos os componentes em uma única tela sem precisar navegar pelo fluxo completo do app
- A rota `(dev)` é excluída do guard de onboarding em `_layout.tsx`

---

## Sistema de Toast (`useToastStore` + `<ToastRenderer />`)

- **State:** `store/useToastStore.ts` — Zustand store separado (`toasts[]`, `showToast`, `dismissToast`)
- **Renderer:** `components/ui/ToastRenderer.tsx` — montado no root layout, sempre presente
- **Tipos semânticos:** `'success' | 'error' | 'warning' | 'info'` — cores da paleta Status do CLAUDE.md
- **Motion:** `SlideInDown.springify()` (entra pelo topo) / `SlideOutUp` (sai pelo topo); Reduced Motion → `FadeIn` / `FadeOut`
- **Auto-dismiss:** 3 segundos (padrão), configurável por toast
- **Haptics:** disparado no momento em que o toast entra (`Success`, `Error`, `Warning`, `Light` por tipo)
- **Uso:** `const showToast = useToastStore(s => s.showToast); showToast('success', 'Registro salvo!')`
