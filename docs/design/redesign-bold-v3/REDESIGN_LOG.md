# CronoPet — Registro de Redesign

> Documento que registra **tudo** que foi adicionado, alterado ou removido
> no redesign completo do app. Paleta da marca preservada.
> Última atualização: 2026-06-13.

---

## 0. Escopo

Refazer o design de **todas as telas** do CronoPet mantendo a paleta oficial.
Briefing: nada com "cara de IA", fluido, eye-catching, profissional. Público:
tutores brasileiros (pt-BR).

Entregável: protótipo iOS interativo único — `CronoPet Redesign.html`.

---

## 1. PRESERVADO (não mexido)

- **Paleta da marca**: Verdigris `#04A29B` (+deep `#036E69`), Celadon `#9BE4C6`,
  Beige `#E9F1CF`, Ash Brown `#5C493D`, Graphite `#2C2B27`.
- **Cores funcionais de ação**: comida=âmbar `#B45309`, água=azul `#0369A1`,
  passeio=esmeralda `#047857`, xixi=violeta `#7C3AED`, cocô=âmbar escuro `#92400E`,
  banho=azul lavado, tosa=rosa `#BE185D`.
- **Estrutura de abas**: Início / Histórico / Saúde.
- **Tipografia**: Nunito (display 700/800) + fonte de sistema (corpo).
- **Tom de voz**: caloroso, direto, brasileiro, honesto, sem clichê.

---

## 1.4 DIREÇÃO FINAL APROVADA (v3 "Bold") — 2026-06-14

Após v1 (hi-fi padrão) e v2 ("Caderno" editorial) serem recusadas por
"cara de IA", o usuário mandou referência (app pet menta+preto+foto) e
citou **Duolingo, Spotify, Sofascore**. Nova direção **"Bold"** — aprovada:

- **Tipografia**: **Bricolage Grotesque** (display chunky, caráter) + **Hanken
  Grotesk** (corpo). Fim do Nunito/Space Mono.
- **Alto contraste**: painéis **preto-grafite sólido** (metas, streak, análise
  Pro, hero do premium) sobre fundo menta/papel. Sem gradientes "SaaS".
- **Navegação preta flutuante** (pill) com aba ativa em menta.
- **Fotografia**: foto do pet como **círculo grande** (image-slot), avatar do
  tutor, e foto no onboarding. Assets = fotos reais, não vetor.
- **Selo de pata preto gigante** no onboarding (igual a referência).
- **Formas**: cantos bem redondos, pílulas, FAB verdigris.
- **Tons/texturas** via Tweaks: menta / pastel / terroso / sólido (paleta mantida).
- Aplicado em TODAS as telas: Início, Histórico, Saúde, Nutrição, Premium,
  Ajustes, Onboarding.

---

## 1.5 REPAGINADA TOTAL (v2 "Caderno") — 2026-06-14 — SUBSTITUÍDA

Feedback: a v1 ainda tinha "cara de IA". Refeita a organização/composição
das seções e os ícones/assets. Nova direção **editorial "Caderno"**:

- **Composição**: menos cards empilhados; conteúdo respira sobre o papel
  separado por **fios (hairlines)**, como página impressa. Assimetria e
  ritmo variável em vez de grade uniforme.
- **Kickers monoespaçados com índice** ("01 — REGISTRAR") usando **Space Mono**
  (fonte que o próprio repo usa) — dá caráter editorial e ownership.
- **Ícones refeitos**: conjunto **"selo" (stamp)** sólido/preenchido, chunky,
  por ação — substitui os traços finos genéricos estilo Lucide. Bespoke.
- **Sem gradientes**: blocos de cor chapada da marca (streak, premium, hero)
  no lugar dos degradês "SaaS".
- **Tipografia maior e mais confiante** (Nunito 900 nos títulos/números).
- **Masthead editorial**: o nome do pet ("Mel") vira manchete; foto integrada
  pequena com `image-slot`; meta em mono.
- **Onboarding**: ilustrações vetoriais trocadas por **composições gráficas
  do próprio sistema de selos** (sem "storyset"), conforme o brand brief.
- **Paleta**: 100% preservada (apenas tons de papel/ink levemente afinados
  dentro da mesma família quente).

---

## 2. SISTEMA DE DESIGN — o que mudou

| Aspecto | Antes (app RN) | Depois (redesign) |
|---|---|---|
| Logo | Ícone placeholder (sem logo real) | Wordmark "Crono**Pet**" + marca paw em quadrado verdigris |
| Raio de card | 16–24px variado | Escala consistente 16/18/22/26 |
| Sombra | Sombra cinza neutra | Sombra quente tonalizada (graphite/0) |
| Hierarquia de tela | Sem títulos editoriais | Títulos grandes Nunito 800 + subtítulo por tela |
| Hero do pet | Banner com chips escuros | Foto full-bleed + gradiente só atrás do texto + troca de pet inline |
| Metas do dia | Lista de círculos conectados | Card com anel de progresso + trilha conectada + estado "Dia completo" |
| Registro | Grade de botões | Tiles táteis com micro-animação, badge de contagem e feedback de toque |
| Navegação | Tab bar simples | Tab bar + FAB flutuante → bottom sheet de registro rápido |
| Feedback | Haptics nativo | Toast animado + celebração ao fechar o dia |
| Insight | Banner estático | Card caloroso não-alarmista, fecha com "consulte o veterinário" |
| Linha do tempo | Histórico em outra aba | Timeline editorial do dia na Home (reforça "Crono"=tempo) |
| Tema escuro | Existente | Refeito em graphite quente, contraste auditado |
| Animações | Reanimated | CSS translate-only (robustas em print/captura/reduced-motion) |

---

## 3. REGISTRO POR TELA

### Início (Home) — `screens-home.jsx`
- **Adicionado**: header com saudação + data por extenso; hero do pet com
  `image-slot` (tutor arrasta a foto real); troca de pet inline; card de metas
  com anel; grade "Registrar em 1 toque" com 7 ações + micro-animação;
  card de insight caloroso; **linha do tempo do dia** (novo na Home).
- **Mudou**: streak vira chip flamejante sobre a foto; ação registra → toast +
  atualização da timeline em tempo real.

### Histórico (History) — `screens-history.jsx`
- **Adicionado**: hero de sequência (streak) com gradiente da marca + strip da
  semana; gráfico de metas da semana (barras); cards de tendência (água,
  refeições, passeios) com mini-barras e delta vs. semana passada; card de
  relatório PDF pro veterinário.

### Saúde (Medical) — `screens-health.jsx`
- **Adicionado**: gráfico de peso (linha + área SVG) com pill "peso saudável";
  card de plano nutricional; **gate Pro** da análise de saúde (preview borrado +
  cadeado + disclaimer "nunca diagnostica"); card de próxima consulta; lista de
  vacinas com status/próxima dose; card "atenção pra raça".

### Nutrição — `screens-nutrition.jsx`
- **Adicionado**: anel de calorias (consumido/meta); lista de refeições com
  estado feito/pendente; barras de composição (macros); banner de confiança
  (cálculo por raça/idade/peso/atividade + "o veterinário ajusta").

### Premium (Paywall) — `screens-premium.jsx`
- **Refeito** com tom honesto: hero "o grátis já dá conta do essencial";
  4 benefícios; seletor de plano (anual/mensal) com badge "melhor valor";
  CTA + microcopy "sem pegadinha".

### Onboarding — `screens-onboarding.jsx`
- **Refeito**: 3 passos (memória externa / 2 segundos / família), ilustrações
  geométricas simples (sem "storyset"), progresso animado, copy da marca.

### Ajustes (Settings) — `screens-settings.jsx`
- **Adicionado**: card de conta (Pro); card de família com avatares + convite;
  preferências com toggles (tema escuro, Face ID, notificações); seção cuidado;
  seção conta; nota de privacidade local-first.

---

## 4. MANIFESTO DE ARQUIVOS (criados neste projeto)

| Arquivo | Papel |
|---|---|
| `CronoPet Redesign.html` | Shell principal (carrega tudo) |
| `icons.jsx` | Conjunto de ícones stroke estilo Lucide (sem emoji) |
| `ui.jsx` | Tokens de tema (claro/escuro), sistema de ações, primitivos (Card, Button, Pill, ProgressRing, ScalePress, Logo, MiniBars) |
| `data.jsx` | Dados-demo pt-BR (pets, timeline, semana, peso, vacinas, nutrição, família) |
| `app.jsx` | ModalShell, TabBar, FAB, QuickLogSheet, Toast |
| `screens-home.jsx` | Tela Início |
| `screens-history.jsx` | Tela Histórico |
| `screens-health.jsx` | Tela Saúde |
| `screens-nutrition.jsx` | Modal Nutrição |
| `screens-premium.jsx` | Modal Premium |
| `screens-settings.jsx` | Modal Ajustes |
| `screens-onboarding.jsx` | Fluxo Onboarding |
| `main.jsx` | App raiz: estado, navegação, tweaks, mount |
| `ios-frame.jsx` | Moldura de iPhone (starter) |
| `tweaks-panel.jsx` | Painel de Tweaks (starter) |
| `image-slot.js` | Placeholder de imagem arrastável (starter) |
| `REDESIGN_LOG.md` | Este documento |
| `assets/images/*.png` | Ícones importados do repo (referência) |

---

## 5. TWEAKS DISPONÍVEIS
- **Tema escuro** (claro/escuro)
- **Pet ativo** (Mel / Tom — cachorro/gato, metas mudam por tipo)
- **Reabrir onboarding**

---

## 6. NOTAS / PRÓXIMOS PASSOS
- Logo é um wordmark provisório (repo não tinha logo real, só ícone placeholder).
  Quando houver a marca final, substituir o componente `Logo` em `ui.jsx`.
- Fotos de pet usam `image-slot`: o tutor arrasta a imagem real (persiste).
- Telas ainda não desenhadas em detalhe (existem no app, ficaram fora deste
  protótipo): editar-perfil, add-pet, fotos, convite, auth/reset de senha.
  Podem ser adicionadas como novos modais seguindo o mesmo sistema.
