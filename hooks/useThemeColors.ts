// ═══════════════════════════════════════════════════════════════
// ═══ Hook de tokens visuais — paleta oficial CronoPet        ═══
// ═══════════════════════════════════════════════════════════════
//
// Suporta 3 paletas (feedback TestFlight #12):
//   • cronopet      — marca (Celadon/Verdigris/Beige/Ash Brown/Graphite).
//                     Light/dark seguem `themeMode` (system/light/dark).
//   • light-neutral — cinza-azulado claro, "padrão iOS Notes" sem warm.
//   • dark-neutral  — cinza-azulado escuro.
//
// Quando paletteMode é neutral, `themeMode` é ignorado (paleta força modo).
// Ações do pet (comida/água/passeio/etc) mantêm a paleta funcional
// auditada WCAG, intencionalmente independente da marca: são códigos
// visuais que o tutor aprende a associar a cada ação.

import { useColorScheme } from 'react-native';
import { usePetStore } from '@/store/usePetStore';
import {
  brand, neutral, neutralDark, card, cardDark, verdigrisDeep, actions,
  neutralLightStandard, cardLightStandard,
  neutralDarkStandard, cardDarkStandard,
} from '@/constants/colors';

// ─── CronoPet (marca) — light ──────────────────────────────────

const lightCronopet = {
  bgScreen:  neutral[50],     // #FBFDF3 — Beige whitewashed
  bgCard:    card,            // #FFFEF8 — off-white quente
  bgInput:   neutral[100],    // #F2F4DC — Beige diluído
  bgMuted:   neutral[200],    // #E0D9C4

  textPrimary:   neutral[900], // Graphite
  textSecondary: neutral[500], // Ash Brown clareado
  textTertiary:  neutral[400],
  textDisabled:  neutral[300],

  border: neutral[200],

  tabActive:   brand.verdigris,
  tabInactive: neutral[400],
  tabBar:      card,
} as const;

// ─── CronoPet (marca) — dark ───────────────────────────────────

const darkCronopet = {
  bgScreen:  neutralDark[50],
  bgCard:    cardDark,
  bgInput:   neutralDark[100],
  bgMuted:   neutralDark[200],

  textPrimary:   neutralDark[900],
  textSecondary: neutralDark[500],
  textTertiary:  neutralDark[400],
  textDisabled:  neutralDark[300],

  border: neutralDark[200],

  tabActive:   brand.celadon,
  tabInactive: neutralDark[400],
  tabBar:      cardDark,
} as const;

// ─── Neutro — light ────────────────────────────────────────────

const lightNeutral = {
  bgScreen:  '#F8FAFC',      // slate-50 — quase branco
  bgCard:    cardLightStandard,
  bgInput:   neutralLightStandard[100],
  bgMuted:   neutralLightStandard[200],

  textPrimary:   neutralLightStandard[900],
  textSecondary: neutralLightStandard[500],
  textTertiary:  neutralLightStandard[400],
  textDisabled:  neutralLightStandard[300],

  border: neutralLightStandard[200],

  // Cor ativa neutra — azul slate-600 (não brand)
  tabActive:   '#0F172A',
  tabInactive: neutralLightStandard[400],
  tabBar:      cardLightStandard,
} as const;

// ─── Neutro — dark ─────────────────────────────────────────────

const darkNeutral = {
  bgScreen:  neutralDarkStandard[50],
  bgCard:    cardDarkStandard,
  bgInput:   neutralDarkStandard[100],
  bgMuted:   neutralDarkStandard[200],

  textPrimary:   neutralDarkStandard[900],
  textSecondary: neutralDarkStandard[500],
  textTertiary:  neutralDarkStandard[400],
  textDisabled:  neutralDarkStandard[300],

  border: neutralDarkStandard[200],

  // Cor ativa neutra dark — slate-50 (quase branco)
  tabActive:   '#F8FAFC',
  tabInactive: neutralDarkStandard[400],
  tabBar:      cardDarkStandard,
} as const;

// ─── Ações do pet (paleta funcional intocada) ──────────────────

const actionsDark = {
  comida:  { primary: '#FBBF24', bg: 'rgba(180, 83,  9,  0.22)', border: 'rgba(180, 83,  9,  0.40)' },
  agua:    { primary: '#38BDF8', bg: 'rgba( 3, 105,161,  0.22)', border: 'rgba( 3, 105,161,  0.40)' },
  passeio: { primary: '#34D399', bg: 'rgba( 4, 120, 87,  0.22)', border: 'rgba( 4, 120, 87,  0.40)' },
  xixi:    { primary: '#A78BFA', bg: 'rgba(124, 58,237,  0.22)', border: 'rgba(124, 58,237,  0.40)' },
  coco:    { primary: '#D97706', bg: 'rgba(146, 64, 14,  0.22)', border: 'rgba(146, 64, 14,  0.40)' },
  banho:   { primary: '#38BDF8', bg: 'rgba( 3, 105,161,  0.22)', border: 'rgba( 3, 105,161,  0.40)' },
} as const;

// Light = importado direto de constants/colors (single source of truth,
// CLAUDE.md proíbe hardcode duplicado). Aplicável tanto pra CronoPet
// quanto pra paleta neutra — ações do pet são identidade funcional
// independente do estilo visual escolhido.
const actionsLight = actions;

// ─── Brand tokens (independentes de tema) ──────────────────────
// Para uso direto quando o componente expressa identidade da marca
// (CTA principal, logo, badge Premium, etc).

const brandTokens = {
  primary:     brand.verdigris,
  primaryDeep: verdigrisDeep,
  accent:      brand.celadon,
  warmBg:      brand.beige,
  textWarm:    brand.ashBrown,
  textBlack:   brand.graphite,
} as const;

// ─── Tipos públicos ────────────────────────────────────────────

export type PaletteMode = 'cronopet' | 'light-neutral' | 'dark-neutral';
export type ThemeMode   = 'system' | 'light' | 'dark';

// ─── Helpers de decisão ────────────────────────────────────────

/**
 * Decisão pura: dado o modo escolhido + scheme do sistema, retorna
 * se a UI deve renderizar em dark mode. Extraído pra testabilidade.
 *
 *   themeMode='dark'   → sempre dark
 *   themeMode='light'  → sempre light
 *   themeMode='system' → segue o sistema (null/undefined cai em light)
 *
 * Quando paletteMode é neutral-*, esta função é ignorada — a paleta
 * já força light/dark e o themeMode fica inerte.
 */
export function pickIsDark(
  themeMode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): boolean {
  if (themeMode === 'dark')  return true;
  if (themeMode === 'light') return false;
  return systemScheme === 'dark';
}

/**
 * Resolve qual conjunto de tokens (colors + isDark) usar dado os 2
 * modos. Pura — sem hooks. Inline no hook abaixo.
 */
function resolveTheme(
  paletteMode: PaletteMode,
  themeMode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
) {
  if (paletteMode === 'light-neutral') {
    return { colors: lightNeutral, isDark: false } as const;
  }
  if (paletteMode === 'dark-neutral') {
    return { colors: darkNeutral, isDark: true } as const;
  }
  // 'cronopet' — usa themeMode pra decidir light/dark
  const isDark = pickIsDark(themeMode, systemScheme);
  return { colors: isDark ? darkCronopet : lightCronopet, isDark } as const;
}

// ─── Hook ──────────────────────────────────────────────────────

export function useThemeColors() {
  const scheme      = useColorScheme();
  const themeMode   = usePetStore((s) => s.themeMode);
  const paletteMode = usePetStore((s) => s.paletteMode);
  const { colors, isDark } = resolveTheme(paletteMode, themeMode, scheme);

  return {
    colors,
    actionTheme: isDark ? actionsDark : actionsLight,
    brand:       brandTokens,
    isDark,
    paletteMode,
    scheme,
  } as const;
}
