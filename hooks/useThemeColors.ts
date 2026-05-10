import { useColorScheme } from 'react-native';
import { usePetStore } from '@/store/usePetStore';

// ─── Paleta neutra ────────────────────────────────────────────

const light = {
  // Backgrounds
  bgScreen:  '#fafaf9',
  bgCard:    '#ffffff',
  bgInput:   '#f5f5f4',
  bgMuted:   '#e7e5e4',

  // Texto
  textPrimary:   '#1c1917',
  textSecondary: '#78716c',
  textTertiary:  '#a8a29e',
  textDisabled:  '#d6d3d1',

  // Borda
  border: '#e7e5e4',

  // Tab bar / navegação
  tabActive:   '#1c1917',
  tabInactive: '#a8a29e',
  tabBar:      '#ffffff',
} as const;

const dark = {
  // Backgrounds
  bgScreen:  '#0c0a09',   // stone-950
  bgCard:    '#1c1917',   // stone-900
  bgInput:   '#292524',   // stone-800
  bgMuted:   '#44403c',   // stone-700

  // Texto (invertido)
  textPrimary:   '#fafaf9',   // stone-50
  textSecondary: '#d6d3d1',   // stone-300
  textTertiary:  '#a8a29e',   // stone-400
  textDisabled:  '#78716c',   // stone-500

  // Borda
  border: '#44403c',   // stone-700

  // Tab bar / navegação
  tabActive:   '#fafaf9',
  tabInactive: '#78716c',
  tabBar:      '#1c1917',
} as const;

// ─── Ações do pet — dark mode ─────────────────────────────────
// Em dark mode os fundos pastéis ficam brilhantes demais.
// Usamos a cor primária com 15% de opacidade.

const actionsDark = {
  comida:  { primary: '#fbbf24', bg: 'rgba(180, 83,  9,  0.18)', border: 'rgba(180, 83,  9,  0.35)' },
  agua:    { primary: '#38bdf8', bg: 'rgba( 3, 105,161,  0.18)', border: 'rgba( 3, 105,161,  0.35)' },
  passeio: { primary: '#34d399', bg: 'rgba( 4, 120, 87,  0.18)', border: 'rgba( 4, 120, 87,  0.35)' },
  xixi:    { primary: '#a78bfa', bg: 'rgba(124, 58,237,  0.18)', border: 'rgba(124, 58,237,  0.35)' },
  coco:    { primary: '#d97706', bg: 'rgba(146, 64, 14,  0.18)', border: 'rgba(146, 64, 14,  0.35)' },
  banho:   { primary: '#38bdf8', bg: 'rgba( 3, 105,161,  0.18)', border: 'rgba( 3, 105,161,  0.35)' },
} as const;

const actionsLight = {
  comida:  { primary: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  agua:    { primary: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  passeio: { primary: '#047857', bg: '#f0fdf4', border: '#bbf7d0' },
  xixi:    { primary: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  coco:    { primary: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  banho:   { primary: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
} as const;

// ─── Hook ─────────────────────────────────────────────────────

export type ThemeColors = typeof light;
export type ActionTheme = typeof actionsLight;

/**
 * Retorna as cores do tema atual (light/dark) e as cores semânticas
 * das ações do pet adaptadas para o modo ativo.
 *
 * Uso:
 *   const { colors, actionTheme, isDark } = useThemeColors();
 *   <View style={{ backgroundColor: colors.bgCard }}>
 *
 * NOTA: O app está fixo em light mode hoje (StatusBar style="dark").
 * Este hook já está pronto para quando o dark mode for ativado —
 * basta remover a linha `return light` abaixo.
 */
export function useThemeColors() {
  const scheme      = useColorScheme();
  const themeMode   = usePetStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark'   ? true  :
    themeMode === 'light'  ? false :
    scheme === 'dark';             // 'system' → segue o OS

  return {
    colors:      isDark ? dark  : light,
    actionTheme: isDark ? actionsDark : actionsLight,
    isDark,
    scheme,
  } as const;
}
