// ─── BreedPickerField ──────────────────────────────────────
//
// Substitui o TextInput livre com autocomplete fuzzy de raça. Modal
// full-screen com busca em tempo real + entradas SRD (topo) e Outro
// (fim, abre TextInput livre).
//
// Decisões de UX:
//   - SRD sempre destacado no topo, mesmo após filtro de busca.
//   - "Outro" no fim: abre dialog Alert.prompt (iOS) ou modal
//     custom (Android) com TextInput livre.
//   - Quando species = 'outro' (coelho, pássaro, etc), NÃO mostra
//     picker — apenas um TextInput livre direto.
//   - Sem `clearable`: raça é obrigatória ou explicitamente SRD.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Platform, Modal, Pressable, TextInput, FlatList, Alert,
} from 'react-native';
import { ChevronRight, Search, X, PawPrint } from 'lucide-react-native';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { breedsForType, SRD, OTHER } from '@/data/breeds';
import { sanitizeName, INPUT_LIMITS } from '@/lib/security';

interface BreedPickerFieldProps {
  /** Valor canônico (ex: 'Labrador Retriever', 'SRD', ou string livre vinda de "Outro"). */
  value: string;
  onChange: (next: string) => void;
  /** Espécie do pet. Para 'outro' renderiza TextInput livre direto. */
  species: 'cachorro' | 'gato' | 'outro';
  /** Nome do pet — usado no header do modal pra contexto. */
  petName?: string;
  label?: string;
  placeholder?: string;
}

export function BreedPickerField({
  value,
  onChange,
  species,
  petName,
  label = 'Raça',
  placeholder = 'Toque para escolher',
}: BreedPickerFieldProps) {
  const { colors, isDark } = useThemeColors();
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState('');

  const allBreeds = useMemo(() => breedsForType(species), [species]);

  // Filtra preservando SRD no topo e Outro no fim.
  const filteredBreeds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allBreeds;
    return allBreeds.filter((b) => {
      if (b === SRD || b === OTHER) return true; // sempre presentes
      return b.toLowerCase().includes(q);
    });
  }, [allBreeds, query]);

  const handleOtherSelected = useCallback(() => {
    // iOS: Alert.prompt nativo é fluido. Android: cai em Alert sem prompt
    // (não suporta input nativo) — usamos pseudo-prompt via Modal próprio.
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Outra raça',
        'Digite a raça do pet:',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'OK',
            onPress: (text?: string) => {
              const clean = sanitizeName((text ?? '').trim(), INPUT_LIMITS.BREED_MAX);
              if (clean) {
                onChange(clean);
                setShowPicker(false);
                setQuery('');
              }
            },
          },
        ],
        'plain-text',
        '',
        'default',
      );
    } else {
      // Android: navega pra estado interno que mostra TextInput inline
      setAndroidOtherInput('');
      setAndroidOtherVisible(true);
    }
  }, [onChange]);

  const [androidOtherVisible, setAndroidOtherVisible] = useState(false);
  const [androidOtherInput, setAndroidOtherInput] = useState('');

  const confirmAndroidOther = useCallback(() => {
    const clean = sanitizeName(androidOtherInput.trim(), INPUT_LIMITS.BREED_MAX);
    if (!clean) return;
    onChange(clean);
    setAndroidOtherVisible(false);
    setShowPicker(false);
    setQuery('');
  }, [androidOtherInput, onChange]);

  const selectBreed = useCallback((breed: string) => {
    if (breed === OTHER) {
      handleOtherSelected();
      return;
    }
    onChange(breed);
    setShowPicker(false);
    setQuery('');
  }, [onChange, handleOtherSelected]);

  // ── Renderização condicional pra species='outro' ─────────
  if (species === 'outro') {
    return (
      <>
        <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Ex: Coelho, Calopsita, Tartaruga"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={INPUT_LIMITS.BREED_MAX}
          style={{
            backgroundColor: colors.bgInput,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
            fontSize: 15,
            color: colors.textPrimary,
          }}
          accessibilityLabel={label}
        />
      </>
    );
  }

  const hasValue = !!value;
  const displayValue = value || placeholder;
  const isSRD = value === SRD;

  return (
    <>
      <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>
        {label}
      </Text>
      <ScalePress
        onPress={() => setShowPicker(true)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={hasValue ? `${label}: ${value}. Tocar para alterar.` : `${label}. Tocar para escolher.`}
        accessibilityHint="Abre seletor com lista de raças"
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
        <PawPrint size={18} color={colors.textSecondary} strokeWidth={2} />
        <Text style={{ color: hasValue ? colors.textPrimary : colors.textTertiary, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {isSRD ? 'SRD (Sem Raça Definida)' : displayValue}
        </Text>
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
      </ScalePress>

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bgScreen }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'ios' ? 12 : 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 8,
          }}>
            <ScalePress
              onPress={() => { setShowPicker(false); setQuery(''); }}
              accessibilityRole="button"
              accessibilityLabel="Fechar seletor"
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <X size={22} color={colors.textPrimary} strokeWidth={2} />
            </ScalePress>
            <Text
              accessibilityRole="header"
              style={{
                flex: 1,
                fontFamily: 'Nunito_700Bold',
                fontSize: 17,
                color: colors.textPrimary,
              }}
            >
              {petName ? `Raça do ${petName}` : 'Escolha a raça'}
            </Text>
          </View>

          {/* Busca */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{
              backgroundColor: colors.bgInput,
              borderRadius: 12,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar raça..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                accessibilityLabel="Campo de busca de raça"
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Lista */}
          <FlatList
            data={filteredBreeds}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={{ paddingHorizontal: 20, paddingVertical: 32 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  Nenhuma raça encontrada com esse nome.{'\n'}Selecione "Outro" pra digitar manualmente.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item === value;
              const isSRDItem = item === SRD;
              const isOtherItem = item === OTHER;
              const label = isSRDItem
                ? 'SRD (Sem Raça Definida)'
                : isOtherItem
                  ? 'Outro (não está na lista)'
                  : item;
              return (
                <ScalePress
                  onPress={() => selectBreed(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${isSelected ? '. Selecionada.' : ''}`}
                  accessibilityState={{ selected: isSelected }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: isSelected ? (isDark ? colors.bgCard : colors.bgInput) : 'transparent',
                  }}
                >
                  {isSRDItem && (
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: colors.tabActive,
                    }} />
                  )}
                  <Text style={{
                    flex: 1,
                    color: isSelected ? colors.textPrimary : colors.textSecondary,
                    fontSize: 15,
                    fontWeight: isSelected ? '700' : '500',
                  }}>
                    {label}
                  </Text>
                  {isOtherItem && (
                    <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
                  )}
                </ScalePress>
              );
            }}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 16 }} />
            )}
          />
        </View>
      </Modal>

      {/* Android-only prompt fallback (Alert.prompt não existe no Android) */}
      {Platform.OS === 'android' && androidOtherVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setAndroidOtherVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 32 }}
            onPress={() => setAndroidOtherVisible(false)}
          >
            <Pressable
              onPress={() => { /* trap inside */ }}
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 17,
                color: colors.textPrimary,
                marginBottom: 8,
              }}>
                Outra raça
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                Digite a raça do pet:
              </Text>
              <TextInput
                value={androidOtherInput}
                onChangeText={setAndroidOtherInput}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={INPUT_LIMITS.BREED_MAX}
                placeholder="Ex: Lulu da Pomerânia"
                placeholderTextColor={colors.textTertiary}
                style={{
                  backgroundColor: colors.bgInput,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: colors.textPrimary,
                  marginBottom: 16,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ScalePress
                  onPress={() => setAndroidOtherVisible(false)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: colors.bgInput,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontFamily: 'Nunito_700Bold' }}>
                    Cancelar
                  </Text>
                </ScalePress>
                <ScalePress
                  onPress={confirmAndroidOther}
                  disabled={!androidOtherInput.trim()}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: androidOtherInput.trim()
                      ? (isDark ? colors.bgCard : colors.textPrimary)
                      : colors.bgMuted,
                    borderWidth: 1.5,
                    borderColor: androidOtherInput.trim()
                      ? (isDark ? colors.bgCard : colors.textPrimary)
                      : colors.border,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar raça"
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontFamily: 'Nunito_700Bold' }}>
                    OK
                  </Text>
                </ScalePress>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
