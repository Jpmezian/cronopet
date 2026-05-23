import React, { type ComponentType } from 'react';
import { View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';

interface ChipIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export interface ChipOption<T extends string> {
  value: T;
  /** Ícone Lucide (preferido). Substitui emoji legado. */
  Icon?: ComponentType<ChipIconProps>;
  /** @deprecated use Icon. Mantido temporariamente pra retrocompat. */
  emoji?: string;
  label: string;
  /** Texto secundário pequeno embaixo do label. Útil pra esclarecer
   *  unidades ou faixas ("até 10kg", "10–25kg"). Feedback TestFlight #5:
   *  usuários não sabiam o que era "Pequeno" / "Médio" / "Grande". */
  sublabel?: string;
}

interface ChipGroupProps<T extends string> {
  options:     ChipOption<T>[];
  selected:    T | null;
  onSelect:    (value: T | null) => void;  // null = toggle off
  accentColor: string;
  accentBg:    string;
  accentBorder: string;
  compact?:    boolean;
  allowDeselect?: boolean;  // default true — clique no ativo desmarca
}

/**
 * Grupo de chips toggleáveis horizontais. Um só pode ficar ativo por vez.
 * Usado no modal de registro para campos como "Aceitação", "Consistência", etc.
 */
export function ChipGroup<T extends string>({
  options, selected, onSelect,
  accentColor, accentBg, accentBorder,
  compact = false,
  allowDeselect = true,
}: ChipGroupProps<T>) {
  const { colors } = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {options.map((opt, i) => {
        const active = selected === opt.value;
        return (
          <View key={opt.value} style={{ marginRight: i < options.length - 1 ? 8 : 0, marginBottom: 8 }}>
            <ScalePress
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (active && allowDeselect) onSelect(null);
                else onSelect(opt.value);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: active }}
              style={{
                borderRadius: compact ? 12 : 14,
                paddingHorizontal: compact ? 12 : 14,
                paddingVertical: compact ? 8 : 10,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: active ? accentBg : colors.bgInput,
                borderWidth: 1.5,
                borderColor:  active ? accentBorder : colors.border,
              }}
            >
              {opt.Icon ? (
                <View style={{ marginRight: 6 }}>
                  <opt.Icon
                    size={compact ? 14 : 16}
                    strokeWidth={2.2}
                    color={active ? accentColor : colors.textSecondary}
                  />
                </View>
              ) : opt.emoji ? (
                <Text style={{ fontSize: compact ? 14 : 15, marginRight: 5 }}>
                  {opt.emoji}
                </Text>
              ) : null}
              <View>
                <Text style={{
                  fontSize: compact ? 12 : 13,
                  fontWeight: active ? '700' : '500',
                  color: active ? accentColor : colors.textSecondary,
                }}>
                  {opt.label}
                </Text>
                {opt.sublabel ? (
                  <Text style={{
                    fontSize: compact ? 9 : 10,
                    fontWeight: '500',
                    color: active ? accentColor : colors.textTertiary,
                    opacity: active ? 0.85 : 1,
                    marginTop: 1,
                  }}>
                    {opt.sublabel}
                  </Text>
                ) : null}
              </View>
            </ScalePress>
          </View>
        );
      })}
    </View>
  );
}

// ─── Helper para chips de quantidade rápida ────────────────

interface QuickAmountProps {
  values:      number[];       // ex: [50, 100, 150, 200]
  unit:        string;         // ex: "g", "ml", "min"
  onPick:      (value: number) => void;
  accentColor: string;
  accentBg:    string;
  accentBorder: string;
  currentValue?: number;       // destaca se bater com um dos values
}

/**
 * Linha de chips de quick-select para quantidades comuns.
 * Usado para quantidade de comida (g), água (ml), duração de passeio (min).
 */
export function QuickAmount({
  values, unit, onPick,
  accentColor, accentBg, accentBorder,
  currentValue,
}: QuickAmountProps) {
  const { colors } = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      {values.map((val, i) => {
        const active = currentValue === val;
        return (
          <View key={val} style={{ flex: 1, marginRight: i < values.length - 1 ? 6 : 0 }}>
            <ScalePress
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPick(val);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${val} ${unit}`}
              accessibilityState={{ selected: active }}
              style={{
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: active ? accentBg : colors.bgInput,
                borderWidth: 1.5,
                borderColor:  active ? accentBorder : colors.border,
              }}
            >
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 13, fontWeight: '700',
                color: active ? accentColor : colors.textSecondary,
              }}>
                {val}{unit}
              </Text>
            </ScalePress>
          </View>
        );
      })}
    </View>
  );
}
