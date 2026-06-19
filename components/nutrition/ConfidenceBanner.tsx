import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

/**
 * ConfidenceBanner Bold v3 (briefing 09 § ConfidenceBanner).
 *
 * Bloco bg `T.mintSoft` (mint diluído) com ShieldCheck + copy
 * explicando que a meta é calculada por raça/idade/peso/atividade e
 * o vet pode ajustar. Aparece sempre — função afirmativa, não alerta.
 *
 * Pequeno e único uso — não vira primitivo, fica em components/
 * nutrition/.
 */
export const ConfidenceBanner = React.memo(function ConfidenceBanner() {
  const T = useTheme();

  return (
    <View
      style={[s.wrap, { backgroundColor: T.mintSoft }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel="Meta calculada por raça, idade, peso, castração e atividade. É referência — o veterinário pode ajustar."
    >
      <ShieldCheck size={19} color={T.primaryDeep} strokeWidth={2.4} />
      <Text style={[s.text, { color: T.primaryDeep }]}>
        Meta calculada por raça, idade, peso, castração e atividade. É
        referência — o veterinário ajusta no caso do seu pet.
      </Text>
    </View>
  );
});

ConfidenceBanner.displayName = 'ConfidenceBanner';

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 18 },
  text: { flex: 1, fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', lineHeight: 17, letterSpacing: 0.1 },
});
