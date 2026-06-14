# Handoff: CronoPet — Redesign "Bold" (v3)

## Visão geral
Redesign completo do app **CronoPet** (diário de cuidados com pet — iOS/Android).
Mantém 100% da paleta oficial da marca e reorganiza composição, tipografia, ícones
e assets numa direção **"Bold"**: alto contraste (painéis preto-grafite sobre menta),
tipografia chunky, foto do bicho como herói, navegação preta flutuante e selos sólidos.

Cobre 7 telas: **Onboarding, Início, Histórico, Saúde, Nutrição, Premium, Ajustes**.

## Sobre os arquivos deste pacote
Os arquivos `.html`/`.jsx` aqui são **referências de design feitas em HTML/React web** —
protótipos que mostram a aparência e o comportamento pretendidos, **não código de
produção pra copiar e colar**. O codebase real do CronoPet é **React Native + Expo
SDK 54 + TypeScript + NativeWind** (Tailwind RN). A tarefa é **recriar estes designs
no ambiente existente do app**, usando os padrões e libs já estabelecidos
(`lucide-react-native`, `react-native-svg`, `expo-font`, Reanimated, etc.).

Não jogue os `.jsx` web direto no projeto — eles usam `<div>`, CSS e tags web.
Use-os como espelho visual e porte para componentes `react-native`.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamento, raios e interações são finais.
Recrie a UI o mais fiel possível usando as libs e padrões do codebase RN.

---

## Design Tokens

### Cores — modo claro (tom "menta", padrão)
| Token | Hex | Uso |
|---|---|---|
| `bg` | `#E7F4EC` | fundo da tela (varia por tom — ver abaixo) |
| `surfaceTint` | `#D8EFE2` | fundo do hero do pet, trilhas, wells |
| `card` | `#FFFFFF` | cards |
| `ink` | `#1E1C17` | texto primário **e** painéis pretos (`blk`) |
| `ink2` | `#564C3D` | texto secundário |
| `ink3` | `#867C6A` | texto terciário / labels |
| `ink4` | `#ADA48F` | hint / detalhe fraco |
| `rule` | `#E1DCC9` | hairline / divisória |
| `ruleSoft` | `#ECE7D7` | divisória mais leve |
| `primary` | `#04A29B` | verdigris — FAB, ativos, links, gráfico de peso |
| `primaryDeep` | `#036E69` | verdigris escuro (texto pequeno) |
| `onPrimary` | `#FBFAF2` | conteúdo sobre verdigris |
| `mint` | `#9BE4C6` | celadon — aba ativa, anéis, destaques |
| `mintSoft` | `#D8EFE2` | menta diluída (chips, tints) |
| `mintDeep` | `#7ED4B0` | menta mais forte |
| `beige` | `#E9F1CF` | bege da marca (botão soft) |
| `blk` | `#1E1C17` | painel preto-grafite (alto contraste) |
| `onBlk` | `#F6F4EA` | conteúdo sobre preto |

### Tons / texturas (Tweak — `bg` + `surfaceTint`)
A paleta é a mesma; muda só o fundo/superfície:
| Tom | `bg` | `surfaceTint` |
|---|---|---|
| menta (padrão) | `#E7F4EC` | `#D8EFE2` |
| pastel | `#F2F1E9` | `#E7F2E9` |
| terroso | `#EFEAD8` | `#E7E2CB` |
| sólido | `#F4F3EC` | `#EBEFDB` |

### Cores — modo escuro
`bg #1A1916` · `card/panel #252320` · `surfaceTint #2E2C27` · `ink #F3EFE2` ·
`ink2 #CBC2AE` · `ink3 #968C79` · `ink4 #6B6354` · `rule #39362F` ·
`primary #22C3B6` · `mint #9BE4C6` · `blk #0F0E0C` · `onBlk #F3EFE2`.

### Cores funcionais de AÇÃO (códigos visuais — o tutor aprende cada cor)
Não substituir. `tintL` = fundo claro do selo; `tintD` = fundo no dark.
| Ação | `primary` | `tintL` | `tintD` |
|---|---|---|---|
| comida | `#C2620A` | `#FBEAD2` | `rgba(194,98,10,.22)` |
| agua | `#0B7BB5` | `#D7ECF8` | `rgba(11,123,181,.22)` |
| passeio | `#0E8C5A` | `#D3F0DF` | `rgba(14,140,90,.22)` |
| xixi | `#8B43E6` | `#EBDFFB` | `rgba(139,67,230,.22)` |
| coco | `#9A4D14` | `#F0E2CC` | `rgba(154,77,20,.24)` |
| banho | `#0E91A8` | `#D2EEF1` | `rgba(14,145,168,.22)` |
| tosa | `#D11E73` | `#FAD9E8` | `rgba(209,30,115,.22)` |

### Tipografia
- **Display / títulos:** `Bricolage Grotesque`, peso **800** (alguns 700). Tracking negativo.
  - Pacote: `@expo-google-fonts/bricolage-grotesque`.
- **Corpo / UI:** `Hanken Grotesk`, pesos 400–800.
  - Pacote: `@expo-google-fonts/hanken-grotesk`.
- Escala usada:
  | Papel | Família | Tamanho | Peso | Tracking |
  |---|---|---|---|---|
  | H1 de tela ("Histórico", "Saúde") | Bricolage | 38 | 800 | -1.4 |
  | Nome do pet (hero) | Bricolage | 42 | 800 | -1.6 |
  | Título de modal | Bricolage | 26 | 800 | -0.8 |
  | Título de seção | Bricolage | 21 | 800 | -0.6 |
  | Número grande (streak/peso/kcal) | Bricolage | 40–62 | 800 | -1.4 a -2.5 |
  | Corpo | Hanken | 14.5 | 500–600 | — |
  | Eyebrow / label | Hanken | 12 | **800** | UPPERCASE, +1 |
  | Caption | Hanken | 11–12.5 | 700 | — |

### Raios
cards `26` · painéis pretos `28` · hero do pet `30` · selos (stamps) `≈ size*0.32` ·
botões e pills `999` · chips de tag `999` · navegação flutuante `999`.

### Sombras (web → RN: usar `shadow*`/`elevation`)
- Card: `0 14px 30px rgba(52,46,34,0.06)` (claro) / `0.34` (dark)
- Painel preto: `0 16px 36px rgba(52,46,34,0.18)`
- Nav flutuante: `0 14px 34px rgba(52,46,34,0.28)`
- FAB: `0 12px 26px rgba(4,162,155,0.5)`

### Espaçamento
Padding lateral das telas: **20**. Gap vertical entre blocos: **20–22**.
Padding interno de card: **16–22**. Gap em listas/rows: **13–16**.

---

## Telas

### 1. Onboarding (3 passos)
- **Layout:** fundo `surfaceTint` (menta). Topo: logo + "Pular". Centro: herói gráfico
  (passo 1 = **pata preta gigante** `blk` ~210px + foto do pet rotacionada;
  passo 2 = selo de comida grande com anel tracejado + check preto;
  passo 3 = 3 avatares coloridos da família). Abaixo: H1 Bricolage 36 (-1.4),
  parágrafo Hanken 15.5. Rodapé: barra de progresso (segmento ativo = `blk`, flex 3:1) + botão preto full.
- **Copy passo 1:** "Você não precisa lembrar de tudo" / "O CronoPet guarda a rotina do seu bicho por você…"
- **Botão:** "Continuar" (preto) → "Começar a cuidar" no último.

### 2. Início (Home)
- **TopBar:** eyebrow "13 de junho" (verdigris) + "Oi, Marina" (Bricolage 26); à direita
  sino (com bolinha de alerta) + avatar do tutor (foto circular 44).
- **PetHero:** card `surfaceTint` radius 30. Pílula preta de streak ("🔥 12 dias seguidos",
  chama em `#FF9D4D`). Nome do pet Bricolage 42. Pills brancas de raça/idade. À direita:
  **foto circular 104** com disco menta atrás + borda branca 3px + dots de troca de pet.
- **TodayPanel:** **painel preto** (`InkPanel`) com `ProgressRing` (anel menta) "2/3",
  título "Metas de hoje"/"Dia completo!", e os selos das metas (cinza translúcido → cor da ação com check).
- **Registrar:** título de seção + **scroll horizontal de selos** (62px, `radius 21`) por ação,
  com badge de contagem preto. Toque = registra (anima `scale 1.16 rotate -5°`). Abaixo, barra de metas + "2/3 metas".
- **InsightCard:** card âmbar (`#FBEAD2`) com selo de água laranja, eyebrow "DE OLHO", título e texto
  não-alarmista (sempre fecha com "consulte o veterinário" na tela de Saúde).
- **Hoje (timeline):** lista vertical — hora (Hanken 800) na margem, selo da ação, label + nota + autor.

### 3. Histórico
- **StreakHero:** painel preto. Número Bricolage 62 em **menta** + "dias seguidos"; "Recorde 21" à direita.
  Strip da semana (7 quadrados: completo = menta com check; senão contagem).
- **WeekGoalsCard:** card branco, barras (completo = verdigris, parcial = menta), pill "20 de 21".
- **Tendências:** card branco, rows com selo colorido + número grande + `MiniBars` + delta (▲verde/▼laranja).
- **ReportCard:** card branco + botão preto "Gerar PDF".

### 4. Saúde
- **WeightCard:** card branco. "Peso atual" + número 40 + pill "Saudável". Gráfico de linha SVG (verdigris + área).
- **NutritionCard:** card branco clicável → abre modal Nutrição.
- **AIGate:** **painel preto** (Pro). Selo sparkle menta, título "Análise de saúde", pill "Pro" (menta).
  Preview borrado + cadeado. Botão menta "Desbloquear com o Pro". Disclaimer "Nunca diagnostica…".
- **AppointmentCard:** card branco com data (quadrado menta "28 jun") + título + vet.
- **Vacinas:** card branco, rows com ícone de seringa, status (verde aplicada / laranja "Agendar") + próxima dose.

### 5. Nutrição (modal)
- **CalorieHero:** painel preto + `ProgressRing` menta (760/1180), "Faltam 420 kcal".
- **Refeições:** card branco, rows (selo comida; feito = preenchido, pendente = tint) + kcal.
- **Composição:** card branco, 4 barras de macro (proteína/gordura/carbo/fibra, cores de ação).
- **Banner de confiança:** bloco menta — "Meta calculada por raça, idade, peso… o veterinário ajusta."

### 6. Premium (modal)
- **Hero:** **painel preto** com marca d'água de pata menta, pill "Pro", H1 "Cuidar fica ainda mais fácil",
  copy honesta ("O grátis já dá conta do essencial…").
- **Features:** 4 rows com selos verdigris.
- **Planos:** 2 cards selecionáveis (anual destacado com pill "Melhor valor"), radio verdigris.
- **CTA:** botão verdigris "Assinar o Pro" + microcopy "Sem pegadinha."

### 7. Ajustes (modal)
- Card de conta (avatar foto + nome + pill Pro). Card de Família (avatares coloridos + "Convidar").
- Seções Preferências (toggles: tema escuro, Face ID, notificações), Cuidado, Conta (listas em cards brancos).
- Toggle: trilho verdigris quando ativo, knob branco.

---

## Componentes (recriar em RN)
| Componente | Descrição | Nota RN |
|---|---|---|
| `Stamp` | selo: quadrado colorido (`radius size*0.32`) com glifo branco preenchido; `bare` = só o glifo | `react-native-svg` (`<Svg><Path fill>`); paths em `icons.jsx` → `STAMP_GLYPHS` |
| `Icon` | ícones de chrome estilo Lucide (stroke 2.2–2.6) | usar **`lucide-react-native`** (já é dep) |
| `Card` | superfície branca radius 26 + sombra suave | `View` + shadow/elevation |
| `InkPanel` | painel preto-grafite radius 28 (alto contraste) | `View` bg `blk` |
| `Button` | pill; variantes `black`/`primary`/`mint`/`white`/`soft` | `Pressable` + escala no press |
| `Chip` | pílula de filtro (ativa = preta) | — |
| `Pill` | status pequeno (dot/glyph + texto uppercase) | — |
| `TabBar` | **pílula preta flutuante** (abs, `bottom 24`, `left/right 16`); aba ativa = pílula menta com label | `View` absoluto |
| `FAB` | círculo verdigris `+` (abs `right 22 bottom 98`) | — |
| `ProgressRing` | anel SVG | `react-native-svg` `<Circle>` + `strokeDasharray/offset` |
| `ScalePress` | feedback de toque (scale 0.86–0.97) | Reanimated/Animated |
| `SectionHeader` | título Bricolage 21 + "ver tudo" | — |

## Interações & comportamento
- **Registrar (1 toque):** selo/quick-sheet → adiciona evento à timeline do dia, incrementa contagem,
  anima o selo (`scale 1.16 rotate -5°`, 0.32s spring) e dispara **toast** ("Comida registrada").
- **Fechar o dia:** quando todas as metas do tipo do pet são cumpridas → painel pulsa (`scale 1.015`),
  haptic de sucesso e **toast de celebração** ("Dia completo!", fundo verdigris).
- **Quick-log sheet:** bottom sheet (slide-up 0.34s `cubic-bezier(0.22,1,0.36,1)`) com os 7 selos.
- **Trocar de pet:** dots no hero; metas mudam por tipo (cachorro = comida/água/passeio; gato = comida/água).
- **Modais:** slide-up; header sticky com título + botão "x" preto.
- **Tweaks (config):** tema claro/escuro, tom (menta/pastel/terroso/sólido), pet ativo.
- **Animações:** entrada `translateY` (sem opacidade-0 de base, pra não sumir em print/reduced-motion).

## State (mínimo)
`activePetId`, `timelines[petId]` (lista de eventos do dia), `todayCounts` (derivado),
`tab`, `modal`, `sheetOpen`, `toast`, `celebrate`, `dark`, `tone`, `onboarded`.

## Metas canônicas por tipo
`cachorro: [comida, agua, passeio]` · `gato: [comida, agua]`.

## Assets
- **Sem logo oficial no repo** (só um ícone placeholder). Usei um **wordmark provisório**
  ("cronopet" em Bricolage 800 + selo de pata). Trocar quando a marca final existir.
- **Fotos do pet/tutor:** placeholders arrastáveis no protótipo (`<image-slot>`). No RN,
  virar `Image` + image picker (o app já faz EXIF stripping).
- **Ícones de chrome:** `lucide-react-native`. **Selos de ação:** SVG custom (paths inclusos).
- Glifos dos selos (`STAMP_GLYPHS`) e ícones (`ICON_PATHS`) estão em `icons.jsx`.

## Arquivos neste pacote (referência)
- `CronoPet Redesign.html` — shell que carrega tudo (abrir no navegador pra ver o protótipo)
- `ui.jsx` — tokens de tema (`makeTheme`), `TONES`, `ACTIONS`, primitivos
- `icons.jsx` — `ICON_PATHS` (stroke) + `STAMP_GLYPHS` (selos) + `Stamp`/`Icon`
- `app.jsx` — chrome (TabBar preta, FAB, sheet, toast, ModalShell)
- `screens-*.jsx` — cada tela
- `main.jsx` — estado + navegação + tweaks
- `data.jsx` — dados-demo (pt-BR)
- `REDESIGN_LOG.md` — histórico das decisões (v1 → v2 → v3)

## Voz / tom (pt-BR)
Caloroso, direto, brasileiro, honesto. Sem clichê de marketing, sem emoji em rajada,
sem "transforme sua rotina". Saúde nunca diagnostica — sempre "consulte o veterinário".
