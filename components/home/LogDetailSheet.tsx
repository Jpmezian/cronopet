import React, { useState, useCallback, useEffect } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { usePetStore } from '@/store/usePetStore';
import { useLogDetailStore } from '@/store/useLogDetailStore';
import {
  ActionFields, PhotoField, FieldLabel, buildExtra,
  EMPTY_FORM, type LogForm,
} from '@/components/home/LogDetailFields';
import type { ActionKey } from '@/types/pet';

const LABEL: Record<ActionKey, string> = {
  comida: 'Comida', agua: 'Água', passeio: 'Passeio',
  xixi: 'Xixi', coco: 'Cocô', banho: 'Banho', tosa: 'Tosa',
};

/**
 * LogDetailSheet — "registro com quantidade" portado pro Bold v3
 * (ModalShell). Aberto por long-press no Stamp (RegisterStrip/
 * QuickLogSheet) via useLogDetailStore. Preserva o data flow legacy:
 * quantity/volumeMl/duration/subActions/acceptance/consistency/
 * appearance/nota/foto → addActionLog(key, photo, note, extra).
 */
export function LogDetailSheet() {
  const T = useTheme();
  const actionKey    = useLogDetailStore((s) => s.actionKey);
  const close        = useLogDetailStore((s) => s.close);
  const addActionLog = usePetStore((s) => s.addActionLog);

  const [form, setForm] = useState<LogForm>(EMPTY_FORM);
  const [note, setNote]   = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = useCallback((p: Partial<LogForm>) => setForm((f) => ({ ...f, ...p })), []);

  // Reset toda vez que abre pra outra ação (ou reabre).
  useEffect(() => {
    if (actionKey) {
      setForm(EMPTY_FORM); setNote(''); setPhoto(null); setSaving(false);
    }
  }, [actionKey]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!r.canceled && r.assets.length > 0) setPhoto(r.assets[0].uri);
  }, []);

  const handleSave = useCallback(async () => {
    if (!actionKey || saving) return;
    setSaving(true);
    const extra = buildExtra(actionKey, form);
    await addActionLog(
      actionKey,
      photo ?? undefined,
      note.trim() || undefined,
      Object.keys(extra).length ? extra : undefined,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    close();
  }, [actionKey, saving, form, photo, note, addActionLog, close]);

  if (!actionKey) return null;

  return (
    <ModalShell
      visible={actionKey !== null}
      onClose={close}
      title={LABEL[actionKey]}
      kicker="Registrar"
      avoidKeyboard
      scrollable
    >
      <PhotoField photo={photo} onPick={pickPhoto} />

      <ActionFields actionKey={actionKey} form={form} patch={patch} />

      <FieldLabel mt>Observações</FieldLabel>
      <TextInput
        value={note} onChangeText={setNote}
        placeholder="Anote algo (opcional)" placeholderTextColor={T.ink4}
        multiline numberOfLines={3} maxLength={200}
        style={[s.textarea, { backgroundColor: T.surfaceTint, color: T.ink }]}
      />

      <Button
        label={`Registrar ${LABEL[actionKey].toLowerCase()}`}
        onPress={handleSave} variant="black" fullWidth loading={saving}
        style={{ marginTop: 8 }}
        accessibilityHint="Salva o registro com os detalhes informados"
      />
    </ModalShell>
  );
}

const s = StyleSheet.create({
  textarea: {
    fontFamily: 'HankenGrotesk_500Medium', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    marginBottom: 16, textAlignVertical: 'top', minHeight: 72,
  },
});
