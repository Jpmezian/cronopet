import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { CalendarPlus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Appointment } from '@/types/pet';

interface AppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (appt: Omit<Appointment, 'id'>) => Promise<void> | void;
}

/**
 * Modal de agendar consulta — visual LEGACY preservado intacto (Fase 9
 * migra). Extraído de medical.tsx pra manter o screen ≤300L.
 */
export function AppointmentModal({ visible, onClose, onSave }: AppointmentModalProps) {
  const { colors, isDark } = useThemeColors();
  const infoText = isDark ? '#93c5fd' : '#1d4ed8';

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
  const valid = titulo.trim() && data.trim();

  const dateBounds = useMemo(() => {
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    const max = new Date();
    max.setFullYear(max.getFullYear() + 2);
    return { min, max };
  }, []);

  const inputStyle = {
    backgroundColor: colors.bgInput, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(28,25,23,0.35)' }} onPress={handleClose} accessibilityLabel="Fechar" />
        <View style={{
          backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, maxHeight: '85%',
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CalendarPlus size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>
              Agendar Consulta
            </Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Título *</Text>
              <TextInput
                value={titulo} onChangeText={setTitulo}
                placeholder="Ex: Consulta anual, Banho e tosa"
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false} maxLength={100}
                style={inputStyle}
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
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
                  {field.label}
                </Text>
                <TextInput
                  value={field.value} onChangeText={field.setter}
                  placeholder={field.placeholder} placeholderTextColor={colors.textTertiary}
                  autoCorrect={false} maxLength={100}
                  style={inputStyle}
                />
              </View>
            ))}

            <ScalePress
              onPress={handleSave}
              disabled={!valid || saving}
              style={{
                borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4,
                backgroundColor: valid ? infoText : colors.bgMuted,
              }}
              accessible accessibilityRole="button" accessibilityLabel="Salvar consulta"
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Check size={18} color={valid ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
                  <Text style={{
                    fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                    color: valid ? '#ffffff' : colors.textDisabled,
                  }}>Salvar Consulta</Text>
                </View>
              )}
            </ScalePress>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
