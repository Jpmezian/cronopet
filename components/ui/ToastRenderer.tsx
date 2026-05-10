import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/useToastStore';
import { Toast } from './Toast';

/**
 * Overlay global que renderiza toasts ativos acima de todo o conteúdo.
 * Deve ser montado no root layout (_layout.tsx), uma única vez.
 *
 * - position: 'absolute' → cobre a tela inteira sem bloquear toques abaixo
 * - pointerEvents="box-none" → o container não captura toques; apenas os Toasts filhos capturam
 * - zIndex: 9999 → sempre na frente de modais, tabs e overlays
 * - useSafeAreaInsets → toasts ficam abaixo do notch/statusbar
 */
export function ToastRenderer() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </View>
  );
}
