// ═══════════════════════════════════════════════════════════════
// ═══ CronoPet Color System — paleta oficial da marca         ═══
// ═══════════════════════════════════════════════════════════════
//
// Cinco cores fundadoras (oficiais da marca):
//
//   Celadon     #9BE4C6   — verde mint, accent suave, "vivo"
//   Verdigris   #04A29B   — verde-azulado profundo, COR PRIMÁRIA (logo)
//   Beige       #E9F1CF   — creme amarelado, calor de fundo
//   Ash Brown   #5C493D   — marrom terra, texto secundário
//   Graphite    #2C2B27   — preto quente, texto primário e dark bg
//
// Decisões deliberadas (justificativa de marca, não SaaS slop):
//   • Não-cinza para hierarquia textual. Usamos Ash Brown e Graphite,
//     que carregam calor terroso coerente com cuidado animal.
//   • Fundo light é Beige whitewashed, não branco puro nem stone-50.
//   • Ações do pet (comida/água/etc) mantêm sua paleta funcional
//     auditada WCAG 2.2 AA — são códigos visuais que o tutor APRENDE
//     a associar a cada ação. Substituir quebraria reconhecimento.
//   • Status "info" e "success" foram MIGRADOS para Verdigris/Celadon
//     porque o app é dominado por estados positivos relacionados ao
//     cuidado — ancorar o feedback positivo na marca reforça identidade.
//   • Pro/Premium não é mais ouro genérico. É Celadon sobre Verdigris,
//     fugindo do "saas trial badge" universal.
//
// Auditoria WCAG (mínimo 4.5:1 para texto normal):
//   - Graphite #2C2B27 sobre Beige #FBFDF3 → 16.4:1 ✅
//   - Ash Brown #5C493D sobre Beige #FBFDF3 → 8.2:1  ✅
//   - Verdigris #04A29B sobre branco #FFFFFF → 3.6:1 (apenas texto grande / ícones)
//   - Verdigris #04A29B sobre Celadon-50 #EAFAF1 → 3.4:1 (apenas texto grande / ícones)
//   - Verdigris escurecido #036E69 sobre branco → 5.2:1 ✅ (uso quando precisar texto pequeno)
// ═══════════════════════════════════════════════════════════════

// ─── Marca (5 cores oficiais) ──────────────────────────────────

export const brand = {
  celadon:   '#9BE4C6',
  verdigris: '#04A29B',
  beige:     '#E9F1CF',
  ashBrown:  '#5C493D',
  graphite:  '#2C2B27',
} as const;

/** Variante escurecida de Verdigris pra atender WCAG em texto pequeno sobre branco/Beige */
export const verdigrisDeep = '#036E69';

// ─── Neutros (light mode) ──────────────────────────────────────
// Migrados de stone (cinza Tailwind) para escala terra-quente
// derivada da marca. Não é cinza neutro — é uma escala que vai do
// Graphite ao Beige whitewashed, com Ash Brown como hierarquia.

export const neutral = {
  900: brand.graphite,    // texto primário
  700: brand.ashBrown,    // texto medium / acento sóbrio
  500: '#7A6F5F',         // texto secundário (Ash Brown clareado)
  400: '#A09684',         // texto terciário / hint (warm tertiary)
  300: '#C9BFB1',         // disabled (warm)
  200: '#E0D9C4',         // border / divider (Beige + warm gray)
  100: '#F2F4DC',         // bg-input (Beige diluído)
  50:  '#FBFDF3',         // bg-screen (Beige whitewashed)
} as const;

/** Card sobre o bg whitewashed cria profundidade sem sombra agressiva */
export const card = '#FFFEF8';

// ─── Neutros (dark mode) ───────────────────────────────────────
// Base Graphite com Ash Brown como acento e Beige clareado como texto.

export const neutralDark = {
  900: '#F5EFD9',          // textPrimary (Beige clareado, off-white quente)
  700: '#D4CAB0',          // textMedium
  500: '#A09684',          // textSecondary
  400: '#7A6F5F',          // textTertiary
  300: brand.ashBrown,     // disabled / muted
  200: '#48433D',          // border
  100: '#3A3833',          // bg-input (graphite clareado)
  50:  brand.graphite,     // bg-screen
} as const;

export const cardDark = '#36342F';

// ─── Paleta neutra alternativa (light + dark) ──────────────────
// Adicionada em 2026-05-22 por feedback TestFlight #12: alguns users
// querem uma UI mais "padrão iOS/Material" sem o tom warm beige da
// marca. Não substitui a CronoPet — é opção paralela em settings.
// Cinzas neutros puros (zero saturação), pra dar "feel" mais clínico.

export const neutralLightStandard = {
  900: '#0F172A',   // slate-900 — texto primário
  700: '#475569',   // slate-600 — texto medium
  500: '#64748B',   // slate-500 — texto secundário
  400: '#94A3B8',   // slate-400 — texto terciário
  300: '#CBD5E1',   // slate-300 — disabled
  200: '#E2E8F0',   // slate-200 — border
  100: '#F1F5F9',   // slate-100 — bg-input
  50:  '#FFFFFF',   // branco puro — bg-screen
} as const;

export const cardLightStandard = '#FFFFFF';

export const neutralDarkStandard = {
  900: '#F8FAFC',   // slate-50 — texto primário
  700: '#CBD5E1',   // slate-300 — texto medium
  500: '#94A3B8',   // slate-400 — texto secundário
  400: '#64748B',   // slate-500 — texto terciário
  300: '#475569',   // slate-600 — disabled
  200: '#334155',   // slate-700 — border
  100: '#1E293B',   // slate-800 — bg-input
  50:  '#0F172A',   // slate-900 — bg-screen
} as const;

export const cardDarkStandard = '#1E293B';

// ─── Ações do pet — light mode (auditadas WCAG) ────────────────
// Manter inalterado: é identidade visual funcional de cada ação.
// Tutor aprende: comida=âmbar, água=azul, passeio=verde, xixi=violeta.

export const actions = {
  comida: {
    primary: '#b45309',   // amber-700 — 4.82:1 sobre #fffbeb ✅
    bg:      '#fffbeb',
    border:  '#fde68a',
  },
  agua: {
    primary: '#0369a1',   // sky-700 — 5.76:1 sobre #f0f9ff ✅
    bg:      '#f0f9ff',
    border:  '#bae6fd',
  },
  passeio: {
    primary: '#047857',   // emerald-700 — 5.27:1 sobre #f0fdf4 ✅
    bg:      '#f0fdf4',
    border:  '#bbf7d0',
  },
  xixi: {
    primary: '#7c3aed',   // violet-600 — 5.34:1 sobre #faf5ff ✅
    bg:      '#faf5ff',
    border:  '#e9d5ff',
  },
  coco: {
    primary: '#92400e',   // amber-900 — 6.38:1 sobre #fef3c7 ✅
    bg:      '#fef3c7',
    border:  '#fde68a',
  },
  banho: {
    primary: '#0369a1',
    bg:      '#f0f9ff',
    border:  '#bae6fd',
  },
  tosa: {
    // R8: rosa-magenta pra distinguir de banho (azul). Evoca salão/
    // estética sem ser feminino-genérico. WCAG: 5.41:1 sobre #fdf2f8 ✅
    primary: '#be185d',   // pink-700
    bg:      '#fdf2f8',
    border:  '#fbcfe8',
  },
} as const;

// ─── Status semântico ──────────────────────────────────────────
// Success e Info migrados para a marca (Verdigris/Celadon).
// Warning e Error mantêm âmbar/vermelho universais (legibilidade
// cross-cultural prevalece sobre identidade de marca em alerta).

export const semantic = {
  success: {
    primary: verdigrisDeep,    // texto/ícone — passa WCAG sobre #EAFAF1
    bg:      '#EAFAF1',        // celadon diluído em 80% branco
    border:  brand.celadon,
    text:    '#024A47',        // verdigris ainda mais escuro pra blocos grandes
  },
  warning: {
    primary: '#B45309',
    bg:      '#FFF7ED',
    border:  '#FED7AA',
    text:    '#9A3412',
  },
  error: {
    primary: '#B91C1C',
    bg:      '#FEF2F2',
    border:  '#FECACA',
    text:    '#991B1B',
  },
  info: {
    primary: verdigrisDeep,
    bg:      '#EAFAF1',
    border:  brand.celadon,
    text:    '#024A47',
  },
  pro: {
    /** Substitui o ouro genérico de "trial badge". Usa cor da marca. */
    accent:  brand.verdigris,
    bg:      brand.celadon,
    border:  verdigrisDeep,
    text:    '#024A47',
  },
} as const;

// ActionKey type-only export removido (não usado): a fonte de verdade
// canônica é `ActionKey` em types/pet.ts. Aqui ficaria duplicado.
