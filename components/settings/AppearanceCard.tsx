import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sun, Moon, Monitor, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';
import { usePetStore } from '@/store/usePetStore';
import { useTheme, type Tone } from '@/hooks/useTheme';
import { makeTheme } from '@/constants/colors';

const MODES = [
  { key: 'system' as const, label: 'Sistema',  Icon: Monitor },
  { key: 'light'  as const, label: 'Claro',    Icon: Sun },
  { key: 'dark'   as const, label: 'Escuro',   Icon: Moon },
];

const TONES: { key: Tone; label: string }[] = [
  { key: 'mint',     label: 'Menta'   },
  { key: 'pastel',   label: 'Pastel'  },
  { key: 'terroso',  label: 'Terroso' },
  { key: 'solido',   label: 'Sólido'  },
];

/**
 * AppearanceCard Bold v3 (briefing 11 § ToneSwitcher + Settings §
 * Aparência).
 *
 * Card branco com 2 seções: ThemeMode picker (3 chips system/light/
 * dark) + ToneSwitcher (4 swatches mint/pastel/terroso/sólido). Cada
 * tone tem swatch da própria cor primary do tema, label embaixo.
 *
 * Substitui o picker antigo de paletteMode (3 opções neutral
 * deprecadas após migration Q3 da Fase 0). paletteMode preserved no
 * store por back-compat — UI não toca mais.
 *
 * Re-render global: useTheme() consome themeMode + tone do store, todo
 * componente re-renderiza ao mudar.
 */
export const AppearanceCard = React.memo(function AppearanceCard() {
  const T = useTheme();
  const themeMode    = usePetStore((s) => s.themeMode);
  const setThemeMode = usePetStore((s) => s.setThemeMode);
  const tone         = usePetStore((s) => s.tone);
  const setTone      = usePetStore((s) => s.setTone);

  const handleMode = (m: 'system' | 'light' | 'dark') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(m);
  };

  const handleTone = (newTone: Tone) => {
    if (newTone === tone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTone(newTone);
  };

  return (
    <Card padding={20}>
      <Kicker>Modo</Kicker>
      <View style={s.modeRow}>
        {MODES.map(({ key, label, Icon }) => {
          const active = themeMode === key;
          return (
            <ScalePress
              key={key}
              onPress={() => handleMode(key)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Modo ${label}${active ? ', selecionado' : ''}`}
              style={[
                s.modeChip,
                {
                  backgroundColor: active ? T.ink : T.surfaceTint,
                  borderColor:     active ? T.ink : T.rule,
                },
              ]}
            >
              <Icon size={18} color={active ? T.bg : T.ink2} strokeWidth={2} />
              <Text
                style={[
                  s.modeLabel,
                  { color: active ? T.bg : T.ink },
                ]}
              >
                {label}
              </Text>
            </ScalePress>
          );
        })}
      </View>

      <View style={{ marginTop: 18 }}>
        <Kicker>Tom de cor</Kicker>
        <View style={s.toneRow}>
          {TONES.map(({ key, label }) => (
            <ToneSwatch
              key={key}
              tone={key}
              label={label}
              isSelected={key === tone}
              isDark={T.isDark}
              onSelect={() => handleTone(key)}
            />
          ))}
        </View>
      </View>
    </Card>
  );
});

AppearanceCard.displayName = 'AppearanceCard';

// ─── Swatch ──────────────────────────────────────────────────

interface ToneSwatchProps {
  tone:       Tone;
  label:      string;
  isSelected: boolean;
  isDark:     boolean;
  onSelect:   () => void;
}

function ToneSwatch({ tone, label, isSelected, isDark, onSelect }: ToneSwatchProps) {
  // Cor da swatch = T.mint do tone (consistente com identidade)
  const sample = makeTheme(isDark, tone);

  return (
    <ScalePress
      onPress={onSelect}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Tom ${label}${isSelected ? ', selecionado' : ''}`}
      style={s.toneCell}
    >
      <View
        style={[
          s.toneSwatch,
          {
            backgroundColor: sample.mint,
            borderColor:     isSelected ? sample.ink : 'transparent',
          },
        ]}
      >
        {isSelected && <Check size={18} color={sample.ink} strokeWidth={3} />}
      </View>
      <Text style={[s.toneLabel, { color: isSelected ? sample.ink : sample.ink3 }]}>
        {label}
      </Text>
    </ScalePress>
  );
}

const s = StyleSheet.create({
  modeRow:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  modeChip:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  modeLabel:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
  toneRow:    { flexDirection: 'row', gap: 12, marginTop: 10 },
  toneCell:   { flex: 1, alignItems: 'center', gap: 8 },
  toneSwatch: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  toneLabel:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700' },
});
