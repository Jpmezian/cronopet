import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Scale, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getLocalToday } from '@/lib/dateLocal';

interface WeightModalProps {
  visible:  boolean;
  onClose:  () => void;
  onSave:   (peso: number, data: string, nota: string | undefined) => void;
}

/**
 * Modal de registro de peso — visual LEGACY preservado intacto (decisão
 * da Fase 4: modais migram pro Bold v3 só na Fase 9). Extraído de
 * medical.tsx pra manter o screen ≤300L.
 */
export function WeightModal({ visible, onClose, onSave }: WeightModalProps) {
  const { colors, actionTheme } = useThemeColors();
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

  const valid = peso.trim() && data.trim();

  const inputStyle = {
    backgroundColor:    colors.bgInput,
    borderRadius:       12,
    paddingHorizontal:  14,
    paddingVertical:    12,
    fontSize:           15,
    color:              colors.textPrimary,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(28,25,23,0.35)' }} onPress={handleClose} accessibilityLabel="Fechar" />
        <View style={{
          backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Scale size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>
              Registrar Peso
            </Text>
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Peso (kg) *</Text>
            <TextInput
              value={peso} onChangeText={setPeso}
              placeholder="Ex: 8.5" placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad" maxLength={10}
              style={inputStyle}
            />
          </View>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Data * (AAAA-MM-DD)</Text>
            <TextInput
              value={data} onChangeText={setData}
              placeholder="Ex: 2025-04-01" placeholderTextColor={colors.textTertiary}
              autoCorrect={false} maxLength={10}
              style={inputStyle}
            />
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Observação</Text>
            <TextInput
              value={nota} onChangeText={setNota}
              placeholder="Ex: Após castração (opcional)" placeholderTextColor={colors.textTertiary}
              maxLength={100}
              style={inputStyle}
            />
          </View>

          <ScalePress
            onPress={handleSave}
            disabled={!valid}
            style={{
              borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center',
              backgroundColor: valid ? actionTheme.xixi.primary : colors.bgMuted,
            }}
            accessible accessibilityRole="button" accessibilityLabel="Salvar peso"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Check size={18} color={valid ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
              <Text style={{
                fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
                color: valid ? '#ffffff' : colors.textDisabled,
              }}>
                Salvar Peso
              </Text>
            </View>
          </ScalePress>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
