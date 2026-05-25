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

import React, { useState, useCallback } from 'react';
import { View, Text, Platform, Modal, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';

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

const MAX_DATE = new Date(); // hoje

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
  const { colors, isDark } = useThemeColors();
  const [showPicker, setShowPicker] = useState(false);
  // No iOS, o picker é renderizado inline dentro de um modal customizado
  // (precisamos do "Confirmar" pra commitar). No Android, é um dialog
  // nativo que já tem botões — basta listenar o onChange.
  const [tempDate, setTempDate] = useState<Date>(() => isoToDate(value));

  const display = formatDisplay(value);
  const hasValue = !!value;

  const openPicker = useCallback(() => {
    setTempDate(value ? isoToDate(value) : new Date(2020, 0, 1));
    setShowPicker(true);
  }, [value]);

  const handleAndroidChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    // event.type === 'dismissed' → user cancelou
    if (event.type === 'set' && date) {
      onChange(dateToIso(date));
    }
  }, [onChange]);

  const handleIosChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
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
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
        {label}
      </Text>
      <ScalePress
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={hasValue ? `Data de nascimento: ${display}. Tocar para alterar.` : 'Escolher data de nascimento'}
        style={{
          backgroundColor: colors.bgInput,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 14,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Calendar size={18} color={colors.textSecondary} strokeWidth={2} />
        <Text style={{
          color: hasValue ? colors.textPrimary : colors.textTertiary,
          fontSize: 15,
          flex: 1,
        }}>
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
            <X size={16} color={colors.textTertiary} strokeWidth={2} />
          </ScalePress>
        )}
      </ScalePress>

      {/* Android: dialog nativo */}
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
            accessibilityLabel="Fechar seletor de data"
          />
          <View style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 40,
          }}>
            {/* Alça */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>

            <Text style={{
              fontFamily: 'Nunito_700Bold', fontSize: 17,
              color: colors.textPrimary, marginBottom: 8, textAlign: 'center',
            }}>
              Data de nascimento
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={MIN_DATE}
              maximumDate={MAX_DATE}
              onChange={handleIosChange}
              themeVariant={isDark ? 'dark' : 'light'}
              locale="pt-BR"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {hasValue && (
                <ScalePress
                  onPress={clearValue}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar data"
                  style={{
                    flex: 1, padding: 14,
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
                accessibilityLabel="Confirmar data"
                style={{
                  flex: 2, padding: 14,
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
