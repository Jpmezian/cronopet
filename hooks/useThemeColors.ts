// ═══════════════════════════════════════════════════════════════
// ═══ Hook de tokens visuais — paleta oficial CronoPet        ═══
// ═══════════════════════════════════════════════════════════════
//
// Light e dark mode espelham a paleta da marca (Celadon, Verdigris,
// Beige, Ash Brown, Graphite). Neutros seguem a escala terra-quente
// definida em `constants/colors.ts` — não usamos stone/zinc/slate.
//
// Ações do pet (comida/água/passeio/etc) mantêm a paleta funcional
// auditada WCAG, intencionalmente independente da marca: são códigos
// visuais que o tutor aprende a associar a cada ação.

import { useColorScheme } from 'react-native';
import { usePetStore } from '@/store/usePetStore';
import {
  brand, neutral, neutralDark, card, cardDark, verdigrisDeep, actions,
} from '@/constants/colors';

// ─── Tokens neutros (light) ────────────────────────────────────

const light = {
  bgScreen:  neutral[50],     // #FBFDF3 — Beige whitewashed
  bgCard:    card,            // #FFFEF8 — off-white quente
  bgInput:   neutral[100],    // #F2F4DC — Beige diluído
  bgMuted:   neutral[200],    // #E0D9C4

  textPrimary:   neutral[900], // Graphite
  textSecondary: neutral[500], // Ash Brown clareado
  textTertiary:  neutral[400],
  textDisabled:  neutral[300],

  border: neutral[200],

  // Primária da marca como cor ativa (era preto puro antes)
  tabActive:   brand.verdigris,
  tabInactive: neutral[400],
  tabBar:      card,
} as const;

// ─── Tokens neutros (dark) ─────────────────────────────────────

const dark = {
  bgScreen:  neutralDark[50],
  bgCard:    cardDark,
  bgInput:   neutralDark[100],
  bgMuted:   neutralDark[200],

  textPrimary:   neutralDark[900],
  textSecondary: neutralDark[500],
  textTertiary:  neutralDark[400],
  textDisabled:  neutralDark[300],

  border: neutralDark[200],

  // No dark, Celadon brilha mais que Verdigris — vira tab active
  tabActive:   brand.celadon,
  tabInactive: neutralDark[400],
  tabBar:      cardDark,
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
// CLAUDE.md proíbe hardcode duplicado). Antes era duplicação literal de
// 6 entradas — caí no erro de "deixei aqui pra ficar perto do dark".
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

// ─── Hook ──────────────────────────────────────────────────────

// Os 3 tipos type-only (ThemeColors, ActionTheme, BrandTokens) foram
// removidos em 2026-05-17 — não tinham consumidor externo. Se algum
// componente precisar tipar props que recebem o retorno do hook, use
// `ReturnType<typeof useThemeColors>`.

export function useThemeColors() {
  const scheme    = useColorScheme();
  const themeMode = usePetStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark'  ? true
    : themeMode === 'light' ? false
    : scheme === 'dark';

  return {
    colors:      isDark ? dark : light,
    actionTheme: isDark ? actionsDark : actionsLight,
    brand:       brandTokens,
    isDark,
    scheme,
  } as const;
}
