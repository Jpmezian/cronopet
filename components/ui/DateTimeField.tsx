// ─── DateTimeField ──────────────────────────────────────────
//
// Campo de data OU hora que abre o picker nativo do OS
// (wheel iOS / dialog Android). Generaliza o padrão de BirthdayPickerField
// para casos que precisam de datas FUTURAS (consultas) e de seleção de HORA.
//
// Substitui TextInput livre 'AAAA-MM-DD' / 'HH:MM', que era propenso a erro
// de formato.
//
// mode="date" → value/onChange em ISO 'YYYY-MM-DD', display pt-BR 'DD/MM/YYYY'
// mode="time" → value/onChange em 'HH:MM' (24h), display idêntico 'HH:MM'
//
// Fase 9b: migrado pra ModalShell (iOS). Android dialog nativo intacto.
// useThemeColors → useTheme.

import React, { useState, useCallback } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Clock, X } from 'lucide-react-native';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { ScalePress } from './ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface DateTimeFieldProps {
  /** mode="date": ISO 'YYYY-MM-DD' | mode="time": 'HH:MM' | '' se vazio */
  value: string;
  onChange: (next: string) => void;
  label: string;
  mode: 'date' | 'time';
  placeholder?: string;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

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
function timeToDate(hhmm: string): Date {
  const base = new Date();
  if (!hhmm) { base.setHours(9, 0, 0, 0); return base; }
  const [h, m] = hhmm.split(':').map(Number);
  base.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return base;
}
function dateToTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function formatDisplay(value: string, mode: 'date' | 'time'): string {
  if (!value) return '';
  if (mode === 'time') return value;
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

export function DateTimeField({
  value, onChange, label, mode,
  placeholder = 'Toque para escolher',
  clearable = false,
  minimumDate, maximumDate,
}: DateTimeFieldProps) {
  const T = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const valueToDate = useCallback(
    (v: string) => (mode === 'time' ? timeToDate(v) : isoToDate(v)),
    [mode],
  );
  const dateToValue = useCallback(
    (d: Date) => (mode === 'time' ? dateToTime(d) : dateToIso(d)),
    [mode],
  );

  const [tempDate, setTempDate] = useState<Date>(() => valueToDate(value));

  const display = formatDisplay(value, mode);
  const hasValue = !!value;
  const Icon = mode === 'time' ? Clock : Calendar;

  const openPicker = useCallback(() => {
    setTempDate(valueToDate(value));
    setShowPicker(true);
  }, [value, valueToDate]);

  const handleAndroidChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setShowPicker(false);
      if (event.type === 'set' && date) onChange(dateToValue(date));
    },
    [onChange, dateToValue],
  );

  const handleIosChange = useCallback((_e: DateTimePickerEvent, date?: Date) => {
    if (date) setTempDate(date);
  }, []);

  const confirmIos = useCallback(() => {
    onChange(dateToValue(tempDate));
    setShowPicker(false);
  }, [tempDate, onChange, dateToValue]);

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
            ? `${label}: ${display}. Tocar para alterar.`
            : `${label}. Tocar para escolher.`
        }
        accessibilityHint="Abre o seletor nativo"
        style={[s.field, { backgroundColor: T.surfaceTint }]}
      >
        <Icon size={18} color={T.ink2} strokeWidth={2} />
        <Text style={[s.fieldText, { color: hasValue ? T.ink : T.ink3 }]}>
          {hasValue ? display : placeholder}
        </Text>
        {hasValue && clearable && (
          <ScalePress
            onPress={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Limpar ${label}`}
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
          mode={mode}
          is24Hour
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS: ModalShell envolve spinner + buttons */}
      {Platform.OS === 'ios' && (
        <ModalShell
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          title={label}
        >
          <DateTimePicker
            value={tempDate}
            mode={mode}
            is24Hour
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleIosChange}
            themeVariant={T.isDark ? 'dark' : 'light'}
            locale="pt-BR"
          />
          <View style={s.btnRow}>
            {hasValue && clearable && (
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
  label: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  field: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fieldText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, fontWeight: '500', flex: 1 },
  btnRow:    { flexDirection: 'row', gap: 10, marginTop: 12 },
});
