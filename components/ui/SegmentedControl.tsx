import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';

// ─── Props ────────────────────────────────────────────────────

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Cor do segmento ativo — default: colors.textPrimary */
  accentColor?: string;
  accentBg?: string;
}

/**
 * Controle segmentado horizontal com ScalePress.
 * Usa scroll se os segmentos não couberem na tela.
 * Respeita dark mode via useThemeColors().
 */
export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
  accentColor,
  accentBg,
}: SegmentedControlProps) {
  const { colors } = useThemeColors();

  const resolvedAccentColor = accentColor ?? colors.textPrimary;
  const resolvedAccentBg    = accentBg    ?? colors.bgInput;

  return (
    <View
      style={{
        backgroundColor: colors.bgInput,
        borderRadius: 14,
        padding: 4,
        flexDirection: 'row',
      }}
    >
      {segments.map((label, index) => {
        const active = index === selectedIndex;
        return (
          <ScalePress
            key={label}
            onPress={() => onChange(index)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            scaleValue={0.97}
            style={{
              flex: 1,
              backgroundColor: active ? resolvedAccentBg : 'transparent',
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 4,
              alignItems: 'center',
              ...(active && Platform.OS === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                  }
                : active && Platform.OS === 'android'
                ? { elevation: 2 }
                : {}),
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? '700' : '500',
                color: active ? resolvedAccentColor : colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </ScalePress>
        );
      })}
    </View>
  );
}
