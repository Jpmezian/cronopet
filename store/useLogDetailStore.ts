import { create } from 'zustand';
import type { ActionKey } from '@/types/pet';

// ─── Store efêmero do LogDetailSheet ──────────────────────────
//
// UI state transiente (sem persist), no modelo do useToastStore.
// Existe pra desacoplar o gatilho (long-press no RegisterStrip OU no
// QuickLogSheet) da renderização do sheet (que vive uma vez só no
// chrome global, `(tabs)/_layout.tsx`). Assim os dois pontos de
// entrada abrem o MESMO sheet sem prop-drilling cross-rota.

interface LogDetailStore {
  /** Ação sendo especificada. null = sheet fechado. */
  actionKey: ActionKey | null;
  open:  (key: ActionKey) => void;
  close: () => void;
}

export const useLogDetailStore = create<LogDetailStore>((set) => ({
  actionKey: null,
  open:  (key) => set({ actionKey: key }),
  close: () => set({ actionKey: null }),
}));
