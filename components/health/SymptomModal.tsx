import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Image, StyleSheet } from 'react-native';
import {
  Stethoscope, Camera, Droplet, Thermometer, BicepsFlexed,
  Footprints, UtensilsCrossed, ClipboardList,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
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
 * SymptomModal — migrado pra ModalShell (Fase 9b). Chips de sintoma
 * + foto opcional + textarea de observação. CTA destrutivo trocado
 * pelo Button preto padrão (Bold v3 usa cor de Pill warning quando
 * o ato é destrutivo; registrar sintoma NÃO é destrutivo).
 */
export function SymptomModal({ visible, onClose, onSave }: SymptomModalProps) {
  const T = useTheme();
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

  return (
    <ModalShell
      visible={visible}
      onClose={handleClose}
      title="Registrar ocorrência"
      kicker="Saúde"
      avoidKeyboard
      scrollable
    >
      <View style={s.chipsRow}>
        {SYMPTOM_OPTIONS.map((opt) => {
          const sel = type === opt.type;
          return (
            <ScalePress
              key={opt.type}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(opt.type); }}
              accessible accessibilityRole="button"
              accessibilityLabel={`${opt.label}${sel ? ', selecionado' : ''}`}
              style={[
                s.chip,
                { backgroundColor: sel ? ACTIONS_V3.comida.primary : T.surfaceTint },
              ]}
            >
              <opt.Icon size={16} strokeWidth={2.2} color={sel ? '#FFFFFF' : T.ink2} />
              <Text style={[s.chipLabel, { color: sel ? '#FFFFFF' : T.ink }]}>
                {opt.label}
              </Text>
            </ScalePress>
          );
        })}
      </View>

      <ScalePress
        onPress={pickPhoto}
        accessible accessibilityRole="button"
        accessibilityLabel={photo ? 'Alterar foto da ocorrência' : 'Adicionar foto da ocorrência'}
        style={[s.photoBtn, { borderColor: T.rule }]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: 120, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <View style={s.photoPlaceholder}>
            <Camera size={20} color={T.ink3} strokeWidth={2.2} />
            <Text style={[s.photoLabel, { color: T.ink3 }]}>Adicionar foto (opcional)</Text>
          </View>
        )}
      </ScalePress>

      <TextInput
        value={note} onChangeText={setNote}
        placeholder="Descreva o que observou..."
        placeholderTextColor={T.ink4}
        multiline numberOfLines={3} maxLength={300}
        style={[s.textarea, { backgroundColor: T.surfaceTint, color: T.ink }]}
      />

      <Button
        label={`Registrar ${selected?.label.toLowerCase() ?? 'ocorrência'}`}
        onPress={handleSave}
        variant="black"
        fullWidth
        style={{ marginTop: 8 }}
        accessibilityHint="Salva a ocorrência no histórico de saúde"
      />
    </ModalShell>
  );
}

const s = StyleSheet.create({
  chipsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:      {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  chipLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
  photoBtn:  {
    borderRadius: 14, overflow: 'hidden', marginBottom: 12,
    borderWidth: 2, borderStyle: 'dashed',
  },
  photoPlaceholder: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500' },
  textarea: {
    fontFamily: 'HankenGrotesk_500Medium',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
    textAlignVertical: 'top', minHeight: 80,
  },
});
