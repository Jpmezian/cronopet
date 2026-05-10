import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActionKey } from '@/types/pet';

// ─── Tipo compartilhado ───────────────────────────────────────

export interface ActionConfig {
  key: ActionKey;
  emoji: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

// ─── Props ────────────────────────────────────────────────────

interface ActionButtonProps {
  action: ActionConfig;
  count: number;
  isUrgent: boolean;
  onPress: () => void;
  progressLabel?: string;  // ex: "120/450 kcal" — substitui "Nx hoje" quando presente
}

// ─── Componente ───────────────────────────────────────────────

export function ActionButton({ action, count, isUrgent, onPress, progressLabel }: ActionButtonProps) {
  const { colors } = useThemeColors();
  const isReducedMotion = useReducedMotion();
  const done = count > 0;

  // ── Animação de urgência ──────────────────────────────────
  // Anel pulsante sobre o botão quando a ação está atrasada
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isUrgent && !done) {
      if (isReducedMotion) {
        // Borda estática, sem animação
        ringOpacity.value = 0.8;
      } else {
        // Pulso suave: 0.85 → 0.2 → 0.85 → ...
        ringOpacity.value = withRepeat(
          withTiming(0.85, { duration: 900 }),
          -1,
          true, // reverse: cria efeito de pulsação sem saltos
        );
      }
    } else {
      cancelAnimation(ringOpacity);
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isUrgent, done, isReducedMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  return (
    <View style={{ width: '30%', flex: 1, minWidth: 96 }}>
      <ScalePress
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Registrar ${action.label.toLowerCase()}. ${done ? `Registrado ${count} ${count === 1 ? 'vez' : 'vezes'} hoje.` : 'Não registrado hoje.'}${isUrgent && !done ? ' Atenção: ação atrasada.' : ''}`}
        accessibilityHint="Toque para registrar"
        style={{
          backgroundColor: done ? action.bg : colors.bgCard,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 4,
          borderWidth: 2,
          borderColor: done ? action.border : colors.bgInput,
          ...(Platform.OS === 'android'
            ? { elevation: done ? 3 : 1 }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: done ? 0.06 : 0.04,
                shadowRadius: 6,
              }),
        }}
      >
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: 28 }}>{action.emoji}</Text>
          {count > 0 && (
            <View style={{
              position: 'absolute', top: -6, right: -10,
              backgroundColor: action.color, borderRadius: 10,
              minWidth: 20, height: 20,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 4,
            }}>
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{count}</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 12, fontWeight: '600', color: done ? action.color : colors.textSecondary }}>
          {action.label}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 10, color: done ? action.color : colors.textTertiary, fontWeight: progressLabel ? '700' : '500' }}
        >
          {progressLabel ?? (done ? `${count}x hoje` : '+ Registrar')}
        </Text>
      </ScalePress>

      {/* Anel de urgência — absolutamente posicionado, não captura toques */}
      <Animated.View
        pointerEvents="none"
        style={[{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: action.color,
        }, ringStyle]}
      />
    </View>
  );
}
