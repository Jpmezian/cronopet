import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useTheme } from '@/hooks/useTheme';
import type { Appointment } from '@/types/pet';

interface AppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (appt: Omit<Appointment, 'id'>) => Promise<void> | void;
}

/**
 * AppointmentModal — migrado pra ModalShell (Fase 9b). DateTimeField
 * interno (também migrado) cuida da seleção de data/hora.
 */
export function AppointmentModal({ visible, onClose, onSave }: AppointmentModalProps) {
  const T = useTheme();

  const [titulo, setTitulo] = useState('');
  const [data,   setData]   = useState('');
  const [hora,   setHora]   = useState('');
  const [vet,    setVet]    = useState('');
  const [nota,   setNota]   = useState('');
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setTitulo(''); setData(''); setHora(''); setVet(''); setNota('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!titulo.trim() || !data.trim()) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSave({
      titulo: titulo.trim(),
      data:   data.trim(),
      ...(hora.trim() ? { hora: hora.trim() } : {}),
      ...(vet.trim()  ? { veterinario: vet.trim() } : {}),
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    setSaving(false);
    reset();
  }, [titulo, data, hora, vet, nota, onSave, reset]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);
  const valid = !!titulo.trim() && !!data.trim();

  const dateBounds = useMemo(() => {
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    const max = new Date();
    max.setFullYear(max.getFullYear() + 2);
    return { min, max };
  }, []);

  return (
    <ModalShell
      visible={visible}
      onClose={handleClose}
      title="Agendar consulta"
      kicker="Saúde"
      avoidKeyboard
      scrollable
    >
      <View style={{ marginBottom: 14 }}>
        <Text style={[s.label, { color: T.ink2 }]}>Título *</Text>
        <TextInput
          value={titulo} onChangeText={setTitulo}
          placeholder="Ex: Consulta anual, Banho e tosa"
          placeholderTextColor={T.ink4}
          autoCorrect={false} maxLength={100}
          style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
        />
      </View>

      <View style={{ marginBottom: 14 }}>
        <DateTimeField
          label="Data *"
          mode="date"
          value={data}
          onChange={setData}
          placeholder="Toque para escolher a data"
          minimumDate={dateBounds.min}
          maximumDate={dateBounds.max}
        />
      </View>
      <View style={{ marginBottom: 14 }}>
        <DateTimeField
          label="Horário (opcional)"
          mode="time"
          value={hora}
          onChange={setHora}
          placeholder="Toque para escolher o horário"
          clearable
        />
      </View>

      {[
        { label: 'Veterinário', value: vet,  setter: setVet,  placeholder: 'Nome do vet (opcional)' },
        { label: 'Observação',  value: nota, setter: setNota, placeholder: 'Notas adicionais' },
      ].map((field) => (
        <View key={field.label} style={{ marginBottom: 14 }}>
          <Text style={[s.label, { color: T.ink2 }]}>{field.label}</Text>
          <TextInput
            value={field.value} onChangeText={field.setter}
            placeholder={field.placeholder} placeholderTextColor={T.ink4}
            autoCorrect={false} maxLength={100}
            style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
          />
        </View>
      ))}

      <Button
        label="Salvar consulta"
        onPress={handleSave}
        variant="black"
        fullWidth
        loading={saving}
        disabled={!valid}
        style={{ marginTop: 8 }}
        accessibilityHint="Agenda a consulta"
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
