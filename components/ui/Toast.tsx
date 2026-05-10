import React, { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutUp, useReducedMotion,
} from 'react-native-reanimated';
import {
  CheckCircle, AlertCircle, AlertTriangle, Info, X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToastStore } from '@/store/useToastStore';
import type { ToastItem } from '@/store/useToastStore';
import { ScalePress } from './ScalePress';

// ─── Componente Toast ─────────────────────────────────────────

interface ToastProps {
  toast: ToastItem;
}

export function Toast({ toast }: ToastProps) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const dismissToast = useToastStore((s) => s.dismissToast);
  const isReducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cores por tipo ────────────────────────────────────────
  const toastColors = (() => {
    switch (toast.type) {
      case 'success': return {
        icon:   actionTheme.passeio.primary,
        bg:     actionTheme.passeio.bg,
        border: actionTheme.passeio.border,
      };
      case 'error': return {
        icon:   '#dc2626',
        bg:     isDark ? 'rgba(220,38,38,0.12)' : '#fff1f2',
        border: isDark ? 'rgba(220,38,38,0.22)' : '#fecdd3',
      };
      case 'warning': return {
        icon:   actionTheme.comida.primary,
        bg:     actionTheme.comida.bg,
        border: actionTheme.comida.border,
      };
      case 'info': return {
        icon:   actionTheme.agua.primary,
        bg:     actionTheme.agua.bg,
        border: actionTheme.agua.border,
      };
    }
  })();

  // ── Ícone por tipo ────────────────────────────────────────
  const IconComponent = {
    success: CheckCircle,
    error:   AlertCircle,
    warning: AlertTriangle,
    info:    Info,
  }[toast.type];

  // ── Haptic + auto-dismiss na montagem ─────────────────────
  useEffect(() => {
    switch (toast.type) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'info':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }

    timerRef.current = setTimeout(() => {
      dismissToast(toast.id);
    }, toast.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animações ─────────────────────────────────────────────
  const enterAnim = isReducedMotion
    ? FadeIn.duration(200)
    : SlideInDown.springify().damping(20).stiffness(300);

  const exitAnim = isReducedMotion
    ? FadeOut.duration(150)
    : SlideOutUp.duration(200);

  // ── Rótulo de acessibilidade ──────────────────────────────
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
        backgroundColor: toastColors.bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: toastColors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...(Platform.OS === 'android'
          ? { elevation: 4 }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
            }),
      }}
    >
      {/* Ícone — decorativo, não lido individualmente (label no pai cobre tudo) */}
      <View accessible={false}>
        <IconComponent size={22} strokeWidth={2} color={toastColors.icon} />
      </View>

      <Text
        style={{
          flex: 1,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: '500',
          lineHeight: 20,
        }}
        importantForAccessibility="no"
      >
        {toast.message}
      </Text>

      <ScalePress
        onPress={() => dismissToast(toast.id)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Fechar notificação"
        accessibilityHint="Remove esta notificação"
        style={{ padding: 4 }}
      >
        <X size={18} strokeWidth={2} color={colors.textTertiary} />
      </ScalePress>
    </Animated.View>
  );
}
