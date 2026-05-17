/**
 * Suite — store/useToastStore.ts
 *
 * Store sem persistência, comportamento simples:
 *   - showToast substitui (fila de 1)
 *   - dismissToast remove por id
 *   - default duration 3000ms
 *
 * Não testa o auto-dismiss timer porque ele vive no <ToastRenderer />
 * (componente RN), não no store. Testar via Maestro se virar regressão.
 */

import { useToastStore } from '@/store/useToastStore';
import { assertEq, assertTrue, runSuite } from '../_lib/assert';

// Snapshot do estado inicial pra "resetar" entre casos
const INITIAL = useToastStore.getState();
function reset() {
  useToastStore.setState({ ...INITIAL, toasts: [] });
}

runSuite('useToastStore', [
  {
    name: '01. Estado inicial: lista vazia de toasts',
    fn: () => {
      reset();
      assertEq(useToastStore.getState().toasts.length, 0);
    },
  },

  {
    name: '02. showToast adiciona 1 toast com id + type + message + duration default',
    fn: () => {
      reset();
      useToastStore.getState().showToast('success', 'Registrado!');
      const { toasts } = useToastStore.getState();
      assertEq(toasts.length, 1);
      assertEq(toasts[0].type, 'success');
      assertEq(toasts[0].message, 'Registrado!');
      assertEq(toasts[0].duration, 3000, 'default duration');
      assertTrue(typeof toasts[0].id === 'string' && toasts[0].id.length > 0, 'id gerado');
    },
  },

  {
    name: '03. showToast 2x: substitui (fila de 1, não enfileira)',
    fn: () => {
      reset();
      useToastStore.getState().showToast('info', 'primeira');
      useToastStore.getState().showToast('error', 'segunda');
      const { toasts } = useToastStore.getState();
      assertEq(toasts.length, 1, 'fila de 1 — não acumula');
      assertEq(toasts[0].message, 'segunda', 'última substitui a anterior');
      assertEq(toasts[0].type, 'error');
    },
  },

  {
    name: '04. dismissToast remove o toast por id; ids errados são no-op',
    fn: () => {
      reset();
      useToastStore.getState().showToast('warning', 'alerta');
      const id = useToastStore.getState().toasts[0].id;

      // Id errado não afeta
      useToastStore.getState().dismissToast('inexistente');
      assertEq(useToastStore.getState().toasts.length, 1);

      // Id certo remove
      useToastStore.getState().dismissToast(id);
      assertEq(useToastStore.getState().toasts.length, 0);
    },
  },

  {
    name: '05. Duration custom respeitada',
    fn: () => {
      reset();
      useToastStore.getState().showToast('success', 'longo', 5000);
      assertEq(useToastStore.getState().toasts[0].duration, 5000);
    },
  },
]);
