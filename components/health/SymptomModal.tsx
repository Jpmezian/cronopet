import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Stethoscope, Check, Droplet, Thermometer, BicepsFlexed,
  Footprints, UtensilsCrossed, ClipboardList,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MedicalEventType } from '@/types/pet';

interface SymptomModalProps {
  visible: boolean;
  onClose: () => void;
  onSave:  (type: MedicalEventType, note: string | undefined, photo: string | undefined) => void;
}

const SYMPTOM_OPTIONS: { type: MedicalEventType; Icon: typeof Stethoscope; label: string }[] = [
  { type: 'vomito',        Icon: Droplet,         label: 'Vômito' },
  { type: 'febre',         Icon: Thermometer,     label: 'Febre' },
  { type: 'mancando',      Icon: BicepsFlexed,    label: 'Mancando' },
  { type: 'diarreia',      Icon: Droplet,         label: 'Diarreia' },
  { type: 'coceira',       Icon: Footprints,      label: 'Coceira' },
  { type: 'perda_apetite', Icon: UtensilsCrossed, label: 'Sem apetite' },
  { type: 'outro',         Icon: ClipboardList,   label: 'Outro' },
];

/**
 * Modal de registrar ocorrência — visual LEGACY preservado intacto
 * (Fase 9 migra). Extraído de medical.tsx pra manter o screen ≤300L.
 */
export function SymptomModal({ visible, onClose, onSave }: SymptomModalProps) {
  const { colors } = useThemeColors();
  const [type, setType]   = useState<MedicalEventType>('outro');
  const [note, setNote]   = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const reset = useCallback(() => {
    setType('outro'); setNote(''); setPhoto(null);
  }, []);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) setPhoto(result.assets[0].uri);
  }, []);

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(type, note.trim() || undefined, photo ?? undefined);
    reset();
  }, [type, note, photo, onSave, reset]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  const selected = SYMPTOM_OPTIONS.find((s) => s.type === type);

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
          paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Stethoscope size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18, fontFamily: 'Nunito_700Bold' }}>
              Registrar Ocorrência
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {SYMPTOM_OPTIONS.map((opt) => {
              const sel = type === opt.type;
              return (
                <ScalePress
                  key={opt.type}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(opt.type); }}
                  style={{
                    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: sel ? '#dc2626' : colors.bgInput,
                  }}
                  accessible accessibilityRole="button"
                  accessibilityLabel={`${opt.label}${sel ? ', selecionado' : ''}`}
                >
                  <opt.Icon size={16} strokeWidth={2.2} color={sel ? '#FFFEF8' : colors.textSecondary} />
                  <Text style={{ fontWeight: '600', fontSize: 13, color: sel ? '#FFFEF8' : colors.textSecondary }}>
                    {opt.label}
                  </Text>
                </ScalePress>
              );
            })}
          </View>

          <ScalePress
            onPress={pickPhoto}
            style={{
              borderRadius: 14, overflow: 'hidden', marginBottom: 12,
              borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
            }}
            accessible accessibilityRole="button"
            accessibilityLabel={photo ? 'Alterar foto da ocorrência' : 'Adicionar foto da ocorrência'}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
            ) : (
              <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>📷 Adicionar foto (opcional)</Text>
              </View>
            )}
          </ScalePress>

          <TextInput
            value={note} onChangeText={setNote}
            placeholder="Descreva o que observou..."
            placeholderTextColor={colors.textTertiary}
            multiline numberOfLines={3} maxLength={300}
            style={{ ...inputStyle, marginBottom: 16, textAlignVertical: 'top', minHeight: 80 }}
          />

          <ScalePress
            onPress={handleSave}
            style={{ backgroundColor: '#dc2626', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' }}
            accessible accessibilityRole="button"
            accessibilityLabel={`Registrar ${selected?.label ?? 'ocorrência'}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Check size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold' }}>
                Registrar {selected?.label}
              </Text>
            </View>
          </ScalePress>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
