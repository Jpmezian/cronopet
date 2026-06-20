import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { getLocalToday } from '@/lib/dateLocal';

interface WeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (peso: number, data: string, nota: string | undefined) => void;
}

/**
 * WeightModal — migrado pra ModalShell (Fase 9b). Antes tinha header
 * Nunito + buttons hardcoded; agora delega chrome pro ModalShell e
 * usa Button primitivo. avoidKeyboard pros TextInputs.
 */
export function WeightModal({ visible, onClose, onSave }: WeightModalProps) {
  const T = useTheme();
  const [peso, setPeso] = useState('');
  const [data, setData] = useState(() => getLocalToday());
  const [nota, setNota] = useState('');

  const reset = useCallback(() => {
    setPeso(''); setNota(''); setData(getLocalToday());
  }, []);

  const handleSave = useCallback(() => {
    const num = parseFloat(peso.replace(',', '.'));
    if (isNaN(num) || num <= 0 || !data.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(num, data.trim(), nota.trim() || undefined);
    reset();
  }, [peso, data, nota, onSave, reset]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);
  const valid = !!peso.trim() && !!data.trim();

  return (
    <ModalShell
      visible={visible}
      onClose={handleClose}
      title="Registrar peso"
      kicker="Saúde"
      avoidKeyboard
      scrollable
    >
      <Field T={T} label="Peso (kg) *">
        <TextInput
          value={peso} onChangeText={setPeso}
          placeholder="Ex: 8.5" placeholderTextColor={T.ink4}
          keyboardType="decimal-pad" maxLength={10}
          style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
        />
      </Field>
      <Field T={T} label="Data * (AAAA-MM-DD)">
        <TextInput
          value={data} onChangeText={setData}
          placeholder="Ex: 2025-04-01" placeholderTextColor={T.ink4}
          autoCorrect={false} maxLength={10}
          style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
        />
      </Field>
      <Field T={T} label="Observação">
        <TextInput
          value={nota} onChangeText={setNota}
          placeholder="Ex: Após castração (opcional)" placeholderTextColor={T.ink4}
          maxLength={100}
          style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
        />
      </Field>

      <Button
        label="Salvar peso"
        onPress={handleSave}
        variant="black"
        fullWidth
        disabled={!valid}
        style={{ marginTop: 8 }}
        accessibilityHint="Salva o registro de peso na carteira de saúde"
      />
    </ModalShell>
  );
}

function Field({
  T, label, children,
}: { T: ReturnType<typeof useTheme>; label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[s.label, { color: T.ink2 }]}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    fontFamily:        'HankenGrotesk_500Medium',
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          15,
  },
});
