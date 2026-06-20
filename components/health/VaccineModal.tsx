import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import type { Vaccine } from '@/types/pet';

interface VaccineModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (vaccine: Omit<Vaccine, 'id'>) => void;
}

/**
 * VaccineModal — migrado pra ModalShell (Fase 9b). Form com 6 campos
 * delegado a sub-componente `Field`. avoidKeyboard pros TextInputs.
 */
export function VaccineModal({ visible, onClose, onSave }: VaccineModalProps) {
  const T = useTheme();

  const [nome, setNome]       = useState('');
  const [data, setData]       = useState('');
  const [proxima, setProxima] = useState('');
  const [vet, setVet]         = useState('');
  const [lote, setLote]       = useState('');
  const [nota, setNota]       = useState('');

  const reset = useCallback(() => {
    setNome(''); setData(''); setProxima(''); setVet(''); setLote(''); setNota('');
  }, []);

  const handleSave = useCallback(() => {
    if (!nome.trim() || !data.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      nome: nome.trim(), data: data.trim(),
      ...(proxima.trim() ? { proxima: proxima.trim() } : {}),
      ...(vet.trim()     ? { veterinario: vet.trim() } : {}),
      ...(lote.trim()    ? { lote: lote.trim() } : {}),
      ...(nota.trim()    ? { nota: nota.trim() } : {}),
    });
    reset();
  }, [nome, data, proxima, vet, lote, nota, onSave, reset]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);
  const valid = !!nome.trim() && !!data.trim();

  const fields = [
    { label: 'Nome da vacina *',         v: nome,    set: setNome,    ph: 'Ex: V10, Antirrábica, FIV/FeLV' },
    { label: 'Data de aplicação * (AAAA-MM-DD)', v: data, set: setData, ph: 'Ex: 2024-03-15' },
    { label: 'Próxima dose (AAAA-MM-DD)', v: proxima, set: setProxima, ph: 'Opcional' },
    { label: 'Veterinário',               v: vet,     set: setVet,     ph: 'Nome do vet (opcional)' },
    { label: 'Lote',                      v: lote,    set: setLote,    ph: 'Número do lote (opcional)' },
    { label: 'Observação',                v: nota,    set: setNota,    ph: 'Observações adicionais' },
  ];

  return (
    <ModalShell
      visible={visible}
      onClose={handleClose}
      title="Adicionar vacina"
      kicker="Saúde"
      avoidKeyboard
      scrollable
    >
      {fields.map((f) => (
        <View key={f.label} style={{ marginBottom: 14 }}>
          <Text style={[s.label, { color: T.ink2 }]}>{f.label}</Text>
          <TextInput
            value={f.v} onChangeText={f.set}
            placeholder={f.ph} placeholderTextColor={T.ink4}
            autoCorrect={false} maxLength={100}
            style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
          />
        </View>
      ))}

      <Button
        label="Salvar vacina"
        onPress={handleSave}
        variant="black"
        fullWidth
        disabled={!valid}
        style={{ marginTop: 8 }}
        accessibilityHint="Salva a vacina na carteira"
      />
    </ModalShell>
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
