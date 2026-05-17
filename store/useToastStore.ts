import { create } from 'zustand';

// ─── Tipos ────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────
// Store separado do usePetStore: toasts são UI state transiente,
// sem persistência. Zustand sem persist middleware.

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  showToast: (type, message, duration = 3000) => {
    const id = Date.now().toString();
    // Substitui qualquer toast ativo (fila de 1)
    set({ toasts: [{ id, type, message, duration }] });
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
