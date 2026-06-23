import React, { useEffect, type ComponentType } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';
import type { ActionKey } from '@/types/pet';

// ─── Tipo compartilhado ───────────────────────────────────────
//
// Migração 2026-05-15: emojis substituídos por ícones Lucide.
// CLAUDE.md atualizado — emoji nunca mais em UI interativa.

interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export interface ActionConfig {
  key: ActionKey;
  Icon: ComponentType<LucideIconProps>;
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
  /** Layout: 2 colunas (2x2 quando 4 ações) ou 3 colunas (default).
   *  Caller decide com base em actions.length pra evitar o "retângulão
   *  sozinho" quando sobra 1 na última linha. */
  cols?: 2 | 3;
}

// ─── Componente ───────────────────────────────────────────────

export function ActionButton({ action, count, isUrgent, onPress, progressLabel, cols = 3 }: ActionButtonProps) {
  const T = useTheme();
  const isReducedMotion = useReducedMotion();
  const done = count > 0;
  const Icon = action.Icon;

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
          withTiming(0.85, { duration: 1400 }),
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

  // Larguras precisam levar em conta o gap:10 do parent. Pra 3 colunas
  // (3 itens + 2 gaps de 10) → 31% cada. Pra 2 colunas → 48% cada.
  // Sem flex:1 pra evitar o último item "esticando" quando sobra 1 na
  // última linha (caso 4 itens em layout de 3 colunas).
  const width = cols === 2 ? '48%' : '31%';

  return (
    <View style={{ width, minWidth: cols === 2 ? 140 : 96 }}>
      <ScalePress
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Registrar ${action.label.toLowerCase()}. ${done ? `Registrado ${count} ${count === 1 ? 'vez' : 'vezes'} hoje.` : 'Não registrado hoje.'}${isUrgent && !done ? ' Atenção: ação atrasada.' : ''}`}
        accessibilityHint="Toque para registrar"
        style={{
          backgroundColor: done ? action.bg : T.card,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 4,
          borderWidth: 2,
          borderColor: done ? action.border : T.surfaceTint,
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
        {/* Ícone Lucide com badge de contagem */}
        <View style={{
          position: 'relative',
          width: 44, height: 44,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 2,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: done ? action.color : T.surfaceTint,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} strokeWidth={2.2} color={done ? '#FFFEF8' : action.color} />
          </View>
          {count > 0 && (
            <View style={{
              position: 'absolute', top: -4, right: -6,
              backgroundColor: T.card,
              borderWidth: 2, borderColor: action.color,
              borderRadius: 11, minWidth: 22, height: 22,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: action.color, fontSize: 11, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' }}>{count}</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 12, fontWeight: '600', color: done ? action.color : T.ink2 }}>
          {action.label}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 10, color: done ? action.color : T.ink3, fontWeight: progressLabel ? '700' : '500' }}
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
