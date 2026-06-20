// ─── BirthdayPickerField ─────────────────────────────────────
//
// Campo de seleção de data de nascimento que abre o picker nativo do OS
// (wheel iOS / Material Android). Substitui TextInput livre 'YYYY-MM-DD'
// que era propenso a erro de formato.
//
// Valor armazenado em ISO 'YYYY-MM-DD' (compat com schema do pet.nascimento).
// Display em pt-BR: '12/03/2023'.
//
// Limites:
//   - max: hoje (pet não pode ter nascido no futuro)
//   - min: 30 anos atrás (cobre qualquer pet vivo razoável)
//
// Fase 8: migrado pra ModalShell Bold v3 (iOS modal). Android continua
// nativo (dialog do OS, sem wrapper). useThemeColors → useTheme.

import React, { useState, useCallback } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { ScalePress } from './ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface BirthdayPickerFieldProps {
  /** ISO date 'YYYY-MM-DD' ou string vazia */
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}

const MIN_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 30);
  return d;
})();

const MAX_DATE = new Date();

function isoToDate(iso: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function BirthdayPickerField({
  value,
  onChange,
  label = 'Data de nascimento (opcional)',
}: BirthdayPickerFieldProps) {
  const T = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => isoToDate(value));

  const display = formatDisplay(value);
  const hasValue = !!value;

  const openPicker = useCallback(() => {
    setTempDate(value ? isoToDate(value) : new Date(2020, 0, 1));
    setShowPicker(true);
  }, [value]);

  const handleAndroidChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) onChange(dateToIso(date));
  }, [onChange]);

  const handleIosChange = useCallback((_e: DateTimePickerEvent, date?: Date) => {
    if (date) setTempDate(date);
  }, []);

  const confirmIos = useCallback(() => {
    onChange(dateToIso(tempDate));
    setShowPicker(false);
  }, [tempDate, onChange]);

  const clearValue = useCallback(() => {
    onChange('');
    setShowPicker(false);
  }, [onChange]);

  return (
    <>
      <Text style={[s.label, { color: T.ink2 }]}>{label}</Text>
      <ScalePress
        onPress={openPicker}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          hasValue
            ? `Data de nascimento: ${display}. Tocar para alterar.`
            : 'Escolher data de nascimento'
        }
        style={[s.field, { backgroundColor: T.surfaceTint }]}
      >
        <Calendar size={18} color={T.ink2} strokeWidth={2} />
        <Text
          style={[
            s.fieldText,
            { color: hasValue ? T.ink : T.ink3 },
          ]}
        >
          {hasValue ? display : 'Toque para escolher'}
        </Text>
        {hasValue && (
          <ScalePress
            onPress={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Limpar data de nascimento"
            style={{ padding: 4 }}
          >
            <X size={16} color={T.ink3} strokeWidth={2} />
          </ScalePress>
        )}
      </ScalePress>

      {/* Android: dialog nativo do OS, sem wrapper */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS: ModalShell Bold v3 envolve wheel inline + buttons */}
      {Platform.OS === 'ios' && (
        <ModalShell
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          title="Data de nascimento"
        >
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            minimumDate={MIN_DATE}
            maximumDate={MAX_DATE}
            onChange={handleIosChange}
            themeVariant={T.isDark ? 'dark' : 'light'}
            locale="pt-BR"
          />
          <View style={s.btnRow}>
            {hasValue && (
              <View style={{ flex: 1 }}>
                <Button label="Limpar" onPress={clearValue} variant="mint" fullWidth />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <Button label="Confirmar" onPress={confirmIos} variant="black" fullWidth />
            </View>
          </View>
        </ModalShell>
      )}
    </>
  );
}

const s = StyleSheet.create({
  label: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  field: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
