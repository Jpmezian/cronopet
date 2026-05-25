// ─── Tela: Adicionar novo pet (multi-pet, DB-002 onda 3) ─────
//
// Acessada via pet switcher (sheet "Trocar de pet" → botão "Adicionar
// outro pet"). Cria um pet novo via store.addPet(), o que:
//   - Gera id UUID
//   - Adiciona em pets{}
//   - Switcha activePetId pro novo (UI atualiza pra mostrar dados dele)
//   - Sincroniza pra cloud se logado (autoSyncPet)
//
// UI pragmática: 1 tela com todos os campos (similar ao Step 3 do
// onboarding mas sem o tipo selecionado em step separado). Refactor
// futuro: extrair StepPetType + StepPetProfile do onboarding em
// componentes reusáveis.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, SafeAreaView, ScrollView,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, Check } from 'lucide-react-native';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fuzzyBreeds, canonicalizeBreed } from '@/data/breeds';
import { ScalePress } from '@/components/ui/ScalePress';
import { PetPhoto } from '@/components/PetPhoto';
import type { PetType } from '@/types/pet';

const BRAND_PRIMARY = '#04A29B';

const PET_TYPE_OPTIONS: { tipo: PetType; emoji: string; label: string }[] = [
  { tipo: 'cachorro', emoji: '🐶', label: 'Cachorro' },
  { tipo: 'gato',     emoji: '🐱', label: 'Gato'     },
  { tipo: 'outro',    emoji: '🐾', label: 'Outro'    },
];

export default function AddPetScreen() {
  const router  = useRouter();
  const addPet  = usePetStore((s) => s.addPet);
  const { colors, isDark } = useThemeColors();

  const [tipo,        setTipo]        = useState<PetType>('cachorro');
  const [nome,        setNome]        = useState('');
  const [raca,        setRaca]        = useState('');
  const [nascimento,  setNascimento]  = useState('');
  const [foto,        setFoto]        = useState<string | null>(null);
  const [racaSuggestions, setRacaSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;
  const tipoLabel  = tipo === 'cachorro' ? 'cachorro' : tipo === 'gato' ? 'gato' : 'pet';
  const isValid    = nome.trim().length > 0 && !saving;

  const handleRacaChange = useCallback((text: string) => {
    setRaca(text);
    if (text.length < 2) { setRacaSuggestions([]); return; }
    const matches = fuzzyBreeds(text, tipo, 5);
    setRacaSuggestions(matches.map((m) => m.value));
  }, [tipo]);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) setFoto(result.assets[0].uri);
  }, []);

  const handleSave = useCallback(async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const racaInput = raca.trim();
      const canonical = racaInput ? canonicalizeBreed(racaInput, tipo) : null;
      const racaFinal = canonical ?? racaInput ?? '';
      await addPet({
        nome: nome.trim(),
        tipo,
        raca: racaFinal || 'Sem raça definida',
        foto: foto ?? '',
        nascimento: nascimento.trim() || undefined,
      });
      // addPet já switcha o activePetId, então voltar pra Home já mostra o novo pet
      router.back();
    } finally {
      setSaving(false);
    }
  }, [nome, tipo, raca, foto, nascimento, addPet, router, saving]);

  const inputStyle = {
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14 as const,
    paddingVertical: 12 as const,
    fontSize: 15 as const,
    color: colors.textPrimary,
    marginBottom: 12 as const,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <ScalePress
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{ padding: 6 }}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </ScalePress>
        <Text style={{
          fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.textPrimary,
        }}>
          Adicionar pet
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Foto */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <ScalePress
              onPress={handlePickPhoto}
              accessibilityRole="button"
              accessibilityLabel={`Foto do ${tipoLabel}. ${foto ? 'Toque para alterar.' : 'Toque para escolher.'}`}
              style={{ position: 'relative' }}
            >
              <PetPhoto foto={foto} tipo={tipo} nome={nome} size={96} />
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: BRAND_PRIMARY, width: 32, height: 32,
                borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: colors.bgScreen,
              }}>
                <Camera size={16} color="#ffffff" strokeWidth={2} />
              </View>
            </ScalePress>
          </View>

          {/* Tipo */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Tipo*
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {PET_TYPE_OPTIONS.map((opt) => {
              const selected = tipo === opt.tipo;
              return (
                <ScalePress
                  key={opt.tipo}
                  onPress={() => { setTipo(opt.tipo); setRaca(''); setRacaSuggestions([]); }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1, padding: 12, alignItems: 'center', gap: 4,
                    borderRadius: 14,
                    backgroundColor: selected ? darkCardBg : colors.bgCard,
                    borderWidth: 1.5,
                    borderColor: selected ? darkCardBg : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{opt.emoji}</Text>
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    fontFamily: 'Nunito_700Bold',
                    color: selected ? '#ffffff' : colors.textPrimary,
                  }}>
                    {opt.label}
                  </Text>
                </ScalePress>
              );
            })}
          </View>

          {/* Nome */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Nome*
          </Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder={`Como se chama seu ${tipoLabel}?`}
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Nome do pet"
            maxLength={50}
          />

          {/* Raça */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Raça (opcional)
          </Text>
          <TextInput
            value={raca}
            onChangeText={handleRacaChange}
            placeholder="Labrador, SRD, Maine Coon..."
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Raça do pet"
          />

          {/* Sugestões de raça */}
          {racaSuggestions.length > 0 && (
            <View style={{
              backgroundColor: colors.bgCard, borderRadius: 12,
              marginTop: -8, marginBottom: 12, overflow: 'hidden',
            }}>
              {racaSuggestions.map((s) => (
                <ScalePress
                  key={s}
                  onPress={() => { setRaca(s); setRacaSuggestions([]); }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: colors.bgInput,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{s}</Text>
                </ScalePress>
              ))}
            </View>
          )}

          {/* Nascimento */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Data de nascimento (opcional)
          </Text>
          <TextInput
            value={nascimento}
            onChangeText={setNascimento}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
            keyboardType="numeric"
            returnKeyType="done"
            accessibilityLabel="Data de nascimento do pet"
          />

          {/* CTA */}
          <ScalePress
            onPress={handleSave}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityLabel="Salvar pet"
            accessibilityState={{ disabled: !isValid }}
            style={{
              backgroundColor: isValid ? darkCardBg : colors.bgInput,
              borderRadius: 16, height: 56,
              alignItems: 'center', justifyContent: 'center',
              marginTop: 20,
              flexDirection: 'row', gap: 8,
            }}
          >
            <Check size={20} color={isValid ? '#ffffff' : colors.textDisabled} strokeWidth={2.5} />
            <Text style={{
              color: isValid ? '#ffffff' : colors.textDisabled,
              fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
            }}>
              {saving ? 'Salvando...' : `Adicionar ${nome.trim() || tipoLabel}`}
            </Text>
          </ScalePress>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
