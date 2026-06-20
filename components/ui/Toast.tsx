import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutUp, useReducedMotion,
} from 'react-native-reanimated';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { useToastStore } from '@/store/useToastStore';
import type { ToastItem } from '@/store/useToastStore';
import { ScalePress } from './ScalePress';

/**
 * Toast Bold v3 (Fase 8 Globais).
 *
 * Migrado de useThemeColors → useTheme + Bold v3 visual. API do
 * useToastStore (78 call-sites) NÃO mudou — `showToast(type, message,
 * duration?)`. Internamente troca paleta antiga (actionTheme.bg /
 * border / primary) por tokens semânticos + ACTIONS_V3.
 *
 * Variantes:
 *   • success → bg T.primary verdigris + texto T.onPrimary + Check
 *   • error   → bg ACTIONS_V3.comida.primary laranja + texto onPrimary + AlertCircle
 *   • warning → bg ACTIONS_V3.coco.primary amber-900 + texto onPrimary + AlertTriangle
 *   • info    → bg T.blk preto profundo + texto T.onBlk + Info
 *
 * Auto-dismiss + haptic + swipe close mantidos. Animação respeita
 * useReducedMotion.
 */

interface ToastProps {
  toast: ToastItem;
}

export function Toast({ toast }: ToastProps) {
  const T = useTheme();
  const dismissToast = useToastStore((s) => s.dismissToast);
  const reduced = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const variant = (() => {
    switch (toast.type) {
      case 'success': return { bg: T.primary,                fg: T.onPrimary, Icon: Check };
      case 'error':   return { bg: ACTIONS_V3.comida.primary, fg: '#FFFFFF',  Icon: AlertCircle };
      case 'warning': return { bg: ACTIONS_V3.coco.primary,   fg: '#FFFFFF',  Icon: AlertTriangle };
      case 'info':    return { bg: T.blk,                    fg: T.onBlk,    Icon: Info };
    }
  })();

  useEffect(() => {
    switch (toast.type) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
      case 'warning':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'info':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
    }
    timerRef.current = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterAnim = reduced
    ? FadeIn.duration(200)
    : SlideInDown.springify().damping(20).stiffness(300);
  const exitAnim = reduced
    ? FadeOut.duration(150)
    : SlideOutUp.duration(200);

  const typeLabel = {
    success: 'Sucesso',
    error:   'Erro',
    warning: 'Atenção',
    info:    'Informação',
  }[toast.type];

  return (
    <Animated.View
      entering={enterAnim}
      exiting={exitAnim}
      accessibilityRole="alert"
      accessibilityLabel={`${typeLabel}: ${toast.message}`}
      style={{
        backgroundColor: variant.bg,
        borderRadius:    14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection:   'row',
        alignItems:      'center',
        gap:             12,
        shadowColor:     `rgb(${T.shadow})`,
        shadowOffset:    { width: 0, height: 6 },
        shadowOpacity:   T.isDark ? 0.34 : 0.18,
        shadowRadius:    14,
        elevation:       6,
      }}
    >
      <View accessible={false}>
        <variant.Icon size={20} strokeWidth={2.4} color={variant.fg} />
      </View>

      <Text
        style={{
          flex:       1,
          color:      variant.fg,
          fontFamily: 'HankenGrotesk_700Bold' as const,
          fontSize:   14,
          fontWeight: '700',
          lineHeight: 19,
        }}
        importantForAccessibility="no"
      >
        {toast.message}
      </Text>

      <ScalePress
        onPress={() => dismissToast(toast.id)}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Fechar notificação"
        accessibilityHint="Remove esta notificação"
        hitSlop={6}
        style={{ padding: 2 }}
      >
        <X size={16} strokeWidth={2.4} color={variant.fg} />
      </ScalePress>
    </Animated.View>
  );
}
