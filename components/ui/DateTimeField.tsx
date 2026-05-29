// ─── DateTimeField ──────────────────────────────────────────
//
// Campo de data OU hora que abre o picker nativo do OS
// (wheel iOS / dialog Android). Generaliza o padrão de BirthdayPickerField
// para casos que precisam de datas FUTURAS (consultas) e de seleção de HORA.
//
// Substitui TextInput livre 'AAAA-MM-DD' / 'HH:MM', que era propenso a erro de
// formato e alimentava data inválida no scheduler nativo (EXC_BREAKPOINT).
//
// mode="date" → value/onChange em ISO 'YYYY-MM-DD', display pt-BR 'DD/MM/YYYY'
// mode="time" → value/onChange em 'HH:MM' (24h), display idêntico 'HH:MM'

import React, { useState, useCallback } from 'react';
import { View, Text, Platform, Modal, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Clock, X } from 'lucide-react-native';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';

interface DateTimeFieldProps {
  /** mode="date": ISO 'YYYY-MM-DD' | mode="time": 'HH:MM' | '' se vazio */
  value: string;
  onChange: (next: string) => void;
  label: string;
  mode: 'date' | 'time';
  /** Texto exibido quando não há valor */
  placeholder?: string;
  /** Permite limpar o valor (campos opcionais). Default: false */
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
  if (!hhmm) {
    base.setHours(9, 0, 0, 0);
    return base;
  }
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
  value,
  onChange,
  label,
  mode,
  placeholder = 'Toque para escolher',
  clearable = false,
  minimumDate,
  maximumDate,
}: DateTimeFieldProps) {
  const { colors, isDark } = useThemeColors();
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

  const handleIosChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
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
      <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
        {label}
      </Text>
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
        style={{
          backgroundColor: colors.bgInput,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon size={18} color={colors.textSecondary} strokeWidth={2} />
        <Text style={{ color: hasValue ? colors.textPrimary : colors.textTertiary, fontSize: 15, flex: 1 }}>
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
            <X size={16} color={colors.textTertiary} strokeWidth={2} />
          </ScalePress>
        )}
      </ScalePress>

      {/* Android: dialog nativo */}
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

      {/* iOS: modal customizado com wheel inline + botão Confirmar */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={() => setShowPicker(false)}
            accessibilityLabel="Fechar seletor"
          />
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 40,
            }}
          >
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>

            <Text
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 17,
                color: colors.textPrimary,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>

            <DateTimePicker
              value={tempDate}
              mode={mode}
              is24Hour
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={handleIosChange}
              themeVariant={isDark ? 'dark' : 'light'}
              locale="pt-BR"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {hasValue && clearable && (
                <ScalePress
                  onPress={clearValue}
                  accessibilityRole="button"
                  accessibilityLabel={`Limpar ${label}`}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.bgInput,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14, fontFamily: 'Nunito_700Bold' }}>
                    Limpar
                  </Text>
                </ScalePress>
              )}
              <ScalePress
                onPress={confirmIos}
                accessibilityRole="button"
                accessibilityLabel="Confirmar"
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isDark ? colors.bgCard : colors.textPrimary,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: isDark ? colors.bgCard : colors.textPrimary,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14, fontFamily: 'Nunito_700Bold' }}>
                  Confirmar
                </Text>
              </ScalePress>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
