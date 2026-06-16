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

// ═══════════════════════════════════════════════════════════════
// ═══ Sistema Bold v3 (Redesign Bold v3 — Fase 0a, 2026-06-14) ═══
// ═══════════════════════════════════════════════════════════════
//
// Adições coexistem com tokens legacy acima:
//   • Tokens novos (Theme, makeTheme, ACTIONS_V3) usados via useTheme()
//     pelos componentes do redesign.
//   • Tokens legacy (neutral, neutralDark, actions, semantic) continuam
//     servindo os 16 componentes existentes via useThemeColors().
//   • Migration limpa de paletteMode legacy → tone (Q3 aprovada).
//
// Briefing fonte: files-redesign-bold-v3/03-sistema-design.md.

import type { ActionKey } from '@/types/pet';

// ─── Tons (Q3: substitui paletteMode neutral pelos 4 tons) ───
//
// Os 4 tons mudam apenas `bg` + `surfaceTint` no modo claro. Dark mode
// tem um único conjunto de fundos (tons NÃO se aplicam no dark).

export type Tone = 'mint' | 'pastel' | 'terroso' | 'solido';

const TONE_BG_LIGHT: Record<Tone, { bg: string; surfaceTint: string }> = {
  mint:    { bg: '#E7F4EC', surfaceTint: '#D8EFE2' },
  pastel:  { bg: '#F2F1E9', surfaceTint: '#E7F2E9' },
  terroso: { bg: '#EFEAD8', surfaceTint: '#E7E2CB' },
  solido:  { bg: '#F4F3EC', surfaceTint: '#EBEFDB' },
};

// ─── Actions V3 (Q5: hexes do briefing) ───────────────────────
//
// Diferenças vs `actions` legacy:
//   • Comida laranja mais quente (#C2620A vs #b45309)
//   • Banho/água com hue distinto (#0E91A8 vs #0369a1 igual água)
//   • Schema { primary, tintL, tintD } em vez de { primary, bg, border }
//
// Componentes Bold v3 importam via `actionTint(key, dark)`. Componentes
// existentes seguem usando `actions` legacy até migrarem (Fase 8).

export const ACTIONS_V3 = {
  comida:  { primary: '#C2620A', tintL: '#FBEAD2', tintD: 'rgba(194,98,10,0.22)'  },
  agua:    { primary: '#0B7BB5', tintL: '#D7ECF8', tintD: 'rgba(11,123,181,0.22)' },
  passeio: { primary: '#0E8C5A', tintL: '#D3F0DF', tintD: 'rgba(14,140,90,0.22)'  },
  xixi:    { primary: '#8B43E6', tintL: '#EBDFFB', tintD: 'rgba(139,67,230,0.22)' },
  coco:    { primary: '#9A4D14', tintL: '#F0E2CC', tintD: 'rgba(154,77,20,0.24)'  },
  banho:   { primary: '#0E91A8', tintL: '#D2EEF1', tintD: 'rgba(14,145,168,0.22)' },
  tosa:    { primary: '#D11E73', tintL: '#FAD9E8', tintD: 'rgba(209,30,115,0.22)' },
} as const satisfies Record<ActionKey, { primary: string; tintL: string; tintD: string }>;

export function actionTint(key: ActionKey, dark: boolean): { primary: string; tint: string } {
  const a = ACTIONS_V3[key];
  return { primary: a.primary, tint: dark ? a.tintD : a.tintL };
}

// ─── Theme (token object completo retornado por useTheme) ─────

export interface Theme {
  // Fundos / superfícies
  bg:          string;  // fundo da tela
  surfaceTint: string;  // hero do pet, trilhas, wells
  card:        string;  // cards brancos
  panel:       string;  // superfície de painel não-preto
  paper:       string;  // mesma cor de card (docs/PDF)
  sunken:      string;  // superfície afundada (= surfaceTint)

  // Texto (escala terra-quente)
  ink:  string;
  ink2: string;
  ink3: string;
  ink4: string;

  // Linhas
  rule:     string;
  ruleSoft: string;

  // Marca
  primary:     string;  // verdigris (FAB, ativos, gráfico de peso)
  primaryDeep: string;  // verdigris escuro (texto pequeno sobre menta)
  onPrimary:   string;  // conteúdo sobre verdigris
  mint:        string;  // celadon (aba ativa, anéis)
  mintSoft:    string;  // menta diluída (chips, tints)
  mintDeep:    string;  // menta mais forte
  beige:       string;  // bege da marca (botão soft)
  blk:         string;  // painel preto-grafite (alto contraste)
  onBlk:       string;  // conteúdo sobre preto

  // Sombras (RGB string p/ uso em rgba())
  shadow: string;

  // Meta
  isDark: boolean;
  tone:   Tone;
}

export function makeTheme(dark: boolean, tone: Tone): Theme {
  if (dark) {
    return {
      bg:          '#1A1916',
      surfaceTint: '#2E2C27',
      card:        '#252320',
      panel:       '#252320',
      paper:       '#252320',
      sunken:      '#2E2C27',
      ink:         '#F3EFE2',
      ink2:        '#CBC2AE',
      ink3:        '#968C79',
      ink4:        '#6B6354',
      rule:        '#39362F',
      ruleSoft:    '#332F29',
      primary:     '#22C3B6',
      primaryDeep: '#9BE4C6',
      onPrimary:   '#0F2420',
      mint:        '#9BE4C6',
      mintSoft:    'rgba(155,228,198,0.14)',
      mintDeep:    '#22C3B6',
      beige:       '#39362F',
      blk:         '#0F0E0C',
      onBlk:       '#F3EFE2',
      shadow:      '0,0,0',
      isDark:      true,
      tone,
    };
  }
  const t = TONE_BG_LIGHT[tone];
  return {
    bg:          t.bg,
    surfaceTint: t.surfaceTint,
    card:        '#FFFFFF',
    panel:       '#FBFAF2',
    paper:       '#FFFFFF',
    sunken:      t.surfaceTint,
    ink:         '#1E1C17',
    ink2:        '#564C3D',
    ink3:        '#867C6A',
    ink4:        '#ADA48F',
    rule:        '#E1DCC9',
    ruleSoft:    '#ECE7D7',
    primary:     '#04A29B',
    primaryDeep: '#036E69',
    onPrimary:   '#FBFAF2',
    mint:        '#9BE4C6',
    mintSoft:    '#D8EFE2',
    mintDeep:    '#7ED4B0',
    beige:       '#E9F1CF',
    blk:         '#1E1C17',
    onBlk:       '#F6F4EA',
    shadow:      '52,46,34',
    isDark:      false,
    tone,
  };
}

// ─── Memoização de `makeTheme` (Fase 0b — R3 fix) ─────────────
//
// `makeTheme(dark, tone)` retorna um objeto novo a cada chamada.
// `useTheme()` é chamado por cada primitivo da Bold v3 — em telas
// densas (Home com 50+ logs) isso significa centenas de alocações
// de `Theme` por render, todas com o mesmo conteúdo.
//
// Solução: cache externo `Map<key, Theme>` com no máximo 8 entradas
// (2 isDark × 4 tones). Após warm-up no startup, toda chamada de
// `useTheme` retorna a MESMA referência — `React.memo` em primitivos
// passa a poder shortcut shallow-compare em `theme` prop.
//
// Por que `Map` e não `useMemo` por chamador:
//   • `useMemo` aloca closure por componente. 50 componentes na tela
//     = 50 closures separadas, mesmo retornando o mesmo Theme.
//   • Cache externo é compartilhado, max 8 alocações na vida do app.
//   • Zero overhead de subscription/Context.
//
// Edge case: hot-reload em dev pode crescer o cache acima de 8 (se
// renomearmos tones). Em prod, `Tone` é union literal de 4 valores
// e `isDark` boolean — bounded.

const themeCache = new Map<string, Theme>();

export function getMemoizedTheme(dark: boolean, tone: Tone): Theme {
  const key = `${dark ? 'd' : 'l'}-${tone}`;
  let cached = themeCache.get(key);
  if (!cached) {
    cached = makeTheme(dark, tone);
    themeCache.set(key, cached);
  }
  return cached;
}

// ─── Migration legacy paletteMode → cronopet + tone ──────────
//
// Fn pura testável (test:theme). Mapeia paletteMode legacy pros novos
// campos. Idempotente: se entrada já é 'cronopet', preserva themeMode
// e devolve `migrated: false`.
//
//   light-neutral → cronopet + themeMode='light' + tone='mint'
//   dark-neutral  → cronopet + themeMode='dark'  + tone='mint'
//   cronopet      → preserva themeMode atual + tone existente ou 'mint'

export type ThemeModeChoice = 'system' | 'light' | 'dark';

export interface LegacyPaletteInput {
  paletteMode: string;
  themeMode:   ThemeModeChoice;
  tone?:       Tone;
}

export interface PaletteMigrationResult {
  paletteMode: 'cronopet';
  themeMode:   ThemeModeChoice;
  tone:        Tone;
  migrated:    boolean;
}

export function migrateLegacyPalette(input: LegacyPaletteInput): PaletteMigrationResult {
  if (input.paletteMode === 'light-neutral') {
    return { paletteMode: 'cronopet', themeMode: 'light', tone: 'mint', migrated: true };
  }
  if (input.paletteMode === 'dark-neutral') {
    return { paletteMode: 'cronopet', themeMode: 'dark', tone: 'mint', migrated: true };
  }
  return {
    paletteMode: 'cronopet',
    themeMode:   input.themeMode,
    tone:        input.tone ?? 'mint',
    migrated:    false,
  };
}
