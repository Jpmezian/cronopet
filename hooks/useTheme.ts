// ═══════════════════════════════════════════════════════════════
// ═══ useTheme — hook tipado do sistema Bold v3                ═══
// ═══════════════════════════════════════════════════════════════
//
// Hook novo, COEXISTE com `useThemeColors` antigo. Diferenças:
//
//   useThemeColors() (antigo)
//     • Retorna 4 grupos de tokens: colors / actionTheme / brand / isDark
//     • Consome paletteMode (cronopet | light-neutral | dark-neutral)
//     • Usado pelos 16 componentes existentes
//
//   useTheme() (novo)
//     • Retorna 1 Theme object plano (ink, primary, blk, etc) + isDark + tone
//     • Consome tone (mint | pastel | terroso | solido) — 4 tons sobre cronopet
//     • Usado pelos primitivos Bold v3 (Stamp, InkPanel, Card, Button, etc)
//
// A migration Q3 do store força paletteMode='cronopet' sempre, então
// useThemeColors() segue funcionando sem mudança de comportamento — só
// perde os 2 modos neutral que ninguém vai poder selecionar (UI de
// Settings vai migrar pra `tone` picker na Fase 7).
//
// Briefing: 04-fase-0-prerequisitos.md § 3.3.

import { useColorScheme } from 'react-native';
import { usePetStore } from '@/store/usePetStore';
import { pickIsDark } from '@/hooks/useThemeColors';
import { getMemoizedTheme, type Theme, type Tone } from '@/constants/colors';

export type { Theme, Tone };

/**
 * Hook canônico de tema do Bold v3.
 *
 * Retorna um `Theme` resolvido com:
 *   • `tone` persistido no Zustand store (default 'mint')
 *   • `themeMode` ('system' | 'light' | 'dark') reaproveitado do store
 *   • `useColorScheme()` do sistema iOS/Android quando themeMode === 'system'
 *
 * Re-render condicional via seletores granulares — só re-renderiza
 * quando `tone` ou `themeMode` mudam (não em qualquer mutação do store).
 *
 * Performance: `getMemoizedTheme` (Map<key, Theme> com max 8 entries)
 * garante que componentes recebam a MESMA referência de Theme entre
 * renders consecutivos, habilitando `React.memo` shallow-compare.
 */
export function useTheme(): Theme {
  const scheme    = useColorScheme();
  const themeMode = usePetStore((s) => s.themeMode);
  const tone      = usePetStore((s) => s.tone);
  const dark      = pickIsDark(themeMode, scheme);
  return getMemoizedTheme(dark, tone);
}
