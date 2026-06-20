import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { ScalePress } from './ScalePress';
import { useTheme } from '@/hooks/useTheme';

// ─── Props ────────────────────────────────────────────────────

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Cor do segmento ativo — default: T.ink */
  accentColor?: string;
  accentBg?: string;
}

/**
 * Controle segmentado horizontal com ScalePress.
 * Usa scroll se os segmentos não couberem na tela.
 * Respeita dark mode via useTheme().
 */
export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
  accentColor,
  accentBg,
}: SegmentedControlProps) {
  const T = useTheme();

  const resolvedAccentColor = accentColor ?? T.ink;
  const resolvedAccentBg    = accentBg    ?? T.surfaceTint;

  return (
    <View
      style={{
        backgroundColor: T.surfaceTint,
        borderRadius: 14,
        padding: 4,
        flexDirection: 'row',
      }}
    >
      {segments.map((label, index) => {
        const active = index === selectedIndex;
        // Wrapper externo com flex:1 garante divisão IGUAL entre segments.
        // Antes: flex:1 ia direto no ScalePress, mas ScalePress aplica style
        // no Animated.View INTERNO — o Pressable externo ficava sem flex e
        // cada segmento ocupava só o tamanho do texto ("Ocorrências" maior
        // que "Peso" criava desalinhamento). Feedback TestFlight R2-1.
        return (
          <View key={label} style={{ flex: 1 }}>
            <ScalePress
              onPress={() => onChange(index)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              scaleValue={0.97}
              style={{
                backgroundColor: active ? resolvedAccentBg : 'transparent',
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 36,
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
                  color: active ? resolvedAccentColor : T.ink2,
                  textAlign: 'center',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {label}
              </Text>
            </ScalePress>
          </View>
        );
      })}
    </View>
  );
}
