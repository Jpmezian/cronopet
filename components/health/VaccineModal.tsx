import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Syringe, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Vaccine } from '@/types/pet';

interface VaccineModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (vaccine: Omit<Vaccine, 'id'>) => void;
}

/**
 * Modal de adicionar vacina — visual LEGACY preservado intacto (Fase 9
 * migra). Extraído de medical.tsx pra manter o screen ≤300L.
 */
export function VaccineModal({ visible, onClose, onSave }: VaccineModalProps) {
  const { colors } = useThemeColors();

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
  const valid = nome.trim() && data.trim();

  const inputStyle = {
    backgroundColor: colors.bgInput, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  };

  const fields = [
    { label: 'Nome da vacina *',         value: nome,    setter: setNome,    placeholder: 'Ex: V10, Antirrábica, FIV/FeLV' },
    { label: 'Data de aplicação * (AAAA-MM-DD)', value: data, setter: setData, placeholder: 'Ex: 2024-03-15' },
    { label: 'Próxima dose (AAAA-MM-DD)', value: proxima, setter: setProxima, placeholder: 'Opcional' },
    { label: 'Veterinário',               value: vet,     setter: setVet,     placeholder: 'Nome do vet (opcional)' },
    { label: 'Lote',                      value: lote,    setter: setLote,    placeholder: 'Número do lote (opcional)' },
    { label: 'Observação',                value: nota,    setter: setNota,    placeholder: 'Observações adicionais' },
  ];

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
            <Syringe size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>
              Adicionar Vacina
            </Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {fields.map((field) => (
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
              disabled={!valid}
              style={{
                borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4,
                backgroundColor: valid ? '#059669' : colors.bgMuted,
              }}
              accessible accessibilityRole="button" accessibilityLabel="Salvar vacina"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={18} color={valid ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
                <Text style={{
                  fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                  color: valid ? '#ffffff' : colors.textDisabled,
                }}>Salvar Vacina</Text>
              </View>
            </ScalePress>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
