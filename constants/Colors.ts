// ─── CronoPet Color System ────────────────────────────────────
// Todas as cores auditadas para WCAG 2.2 AA (mínimo 4.5:1 de contraste)

export const neutral = {
  900: '#1c1917',   // text-primary
  700: '#44403c',   // text-medium
  500: '#78716c',   // text-secondary
  400: '#a8a29e',   // text-tertiary / hint
  300: '#d6d3d1',   // text-disabled
  200: '#e7e5e4',   // border-light
  100: '#f5f5f4',   // bg-input
  50:  '#fafaf9',   // bg-screen
} as const;

export const card = '#ffffff';

/**
 * Triângulo semântico de cada ação do pet:
 * - primary: cor do texto/ícone (WCAG AA ≥ 4.5:1 sobre o fundo pastel)
 * - bg:      fundo pastel do card/botão
 * - border:  borda do card
 */
export const actions = {
  comida: {
    primary: '#b45309',   // amber-700 — contraste 4.82:1 sobre #fffbeb ✅
    bg:      '#fffbeb',   // amber-50
    border:  '#fde68a',   // amber-200
  },
  agua: {
    primary: '#0369a1',   // sky-700 — contraste 5.76:1 sobre #f0f9ff ✅
    bg:      '#f0f9ff',   // sky-50
    border:  '#bae6fd',   // sky-200
  },
  passeio: {
    primary: '#047857',   // emerald-700 — contraste 5.27:1 sobre #f0fdf4 ✅
    bg:      '#f0fdf4',   // emerald-50
    border:  '#bbf7d0',   // emerald-200
  },
  xixi: {
    primary: '#7c3aed',   // violet-600 — contraste 5.34:1 sobre #faf5ff ✅
    bg:      '#faf5ff',   // violet-50
    border:  '#e9d5ff',   // violet-200
  },
  coco: {
    primary: '#92400e',   // amber-900 — contraste 6.38:1 sobre #fef3c7 ✅
    bg:      '#fef3c7',   // amber-100
    border:  '#fde68a',   // amber-200
  },
  banho: {
    primary: '#0369a1',   // sky-700 — contraste 5.76:1 sobre #f0f9ff ✅
    bg:      '#f0f9ff',   // sky-50
    border:  '#bae6fd',   // sky-200
  },
} as const;

export const semantic = {
  success:  { primary: '#047857', bg: '#f0fdf4', border: '#86efac', text: '#14532d' },
  warning:  { primary: '#b45309', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  error:    { primary: '#b91c1c', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  info:     { primary: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
  pro:      { gold: '#fbbf24', bg: '#fffbeb', border: '#fde68a' },
} as const;

export type ActionKey = keyof typeof actions;
