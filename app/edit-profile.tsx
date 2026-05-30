import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Shared element transitions not available in Reanimated v4.1.7 — kept for future upgrade
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { breedsForType, fuzzyBreeds, canonicalizeBreed } from '@/data/breeds';
import type { PetType } from '@/types/pet';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { PetPhoto } from '@/components/PetPhoto';

// ─── Constantes de marca ─────────────────────────────────────
// Cores fixas de identidade visual que não variam com o tema
const BRAND_PRIMARY = '#04A29B';  // amarelo-âmbar — botão de câmera

const PET_TYPE_OPTIONS: { tipo: PetType; emoji: string; label: string }[] = [
  { tipo: 'cachorro', emoji: '🐶', label: 'Cachorro' },
  { tipo: 'gato',     emoji: '🐱', label: 'Gato' },
  { tipo: 'outro',    emoji: '🐾', label: 'Outro' },
];

export default function EditProfileScreen() {
  const router           = useRouter();
  const pet              = usePetStore((s) => s.pet);
  const updatePetProfile = usePetStore((s) => s.updatePetProfile);
  const setPetNutrition  = usePetStore((s) => s.setPetNutrition);
  const { colors, actionTheme, isDark } = useThemeColors();

  // Fundo escuro intencional para CTAs e botões primários
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const [nome, setNome]             = useState(pet.nome);
  const [tipo, setTipo]             = useState<PetType>(pet.tipo ?? 'cachorro');
  const [raca, setRaca]             = useState(pet.raca === 'Sem raça definida' ? '' : pet.raca);
  const [foto, setFoto]             = useState<string>(pet.foto);
  const [nascimento, setNascimento] = useState(pet.nascimento ?? '');
  const [notes, setNotes]           = useState(pet.notes ?? '');
  const [saving, setSaving]         = useState(false);
  const [racaSuggestions, setRacaSuggestions] = useState<string[]>([]);

  const isValid = nome.trim().length > 0;
  const hasChanges =
    nome.trim()       !== pet.nome ||
    tipo              !== (pet.tipo ?? 'cachorro') ||
    raca.trim()       !== (pet.raca === 'Sem raça definida' ? '' : pet.raca) ||
    foto              !== pet.foto ||
    nascimento.trim() !== (pet.nascimento ?? '') ||
    notes.trim()      !== (pet.notes ?? '');

  const handleTipoSelect = useCallback((t: PetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTipo(t);
    setRaca('');
    setRacaSuggestions([]);
  }, []);

  const handleRacaChange = useCallback((text: string) => {
    setRaca(text);
    if (text.length < 2) { setRacaSuggestions([]); return; }
    // Fuzzy: tolerante a typo ("lavrador"), acento ("siames"), prefixo ("york")
    const matches = fuzzyBreeds(text, tipo, 5);
    setRacaSuggestions(matches.map((m) => m.value));
  }, [tipo]);

  const handlePickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) setFoto(result.assets[0].uri);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    try {
      // Auto-corrige typo se input bater com raça conhecida
      const racaInput = raca.trim();
      const canonical = racaInput ? canonicalizeBreed(racaInput, tipo) : null;
      const racaFinal = canonical ?? racaInput ?? '';
      await updatePetProfile(
        nome.trim(),
        tipo,
        racaFinal || 'Sem raça definida',
        foto,
        nascimento.trim() || undefined,
      );
      // Notes vão por setPetNutrition (R3-8) — mesma tx do MMKV
      // garante consistência sem precisar reescrever updatePetProfile.
      setPetNutrition({ notes: notes.trim() || undefined });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [nome, tipo, raca, foto, nascimento, notes, isValid, saving, updatePetProfile, setPetNutrition, router]);

  const canSave = isValid && hasChanges && !saving;

  const inputStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500' as const,
    ...(Platform.OS === 'android' ? { elevation: 2 } : {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8,
    }),
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Barra de navegação */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
        }}>
          <ScalePress
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={{
              backgroundColor: colors.bgCard, borderRadius: 16,
              paddingHorizontal: 12, paddingVertical: 10,
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8,
              }),
            }}
          >
            <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
          </ScalePress>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 17 }}>Editar Perfil</Text>
          <ScalePress
            onPress={handleSave} disabled={!canSave}
            style={{
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
              backgroundColor: canSave ? darkCardBg : colors.bgMuted,
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text style={{
                  fontFamily: 'Nunito_700Bold', fontSize: 14,
                  color: canSave ? '#ffffff' : colors.textTertiary,
                }}>Salvar</Text>
            }
          </ScalePress>
        </View>

        {/* Foto */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ScalePress onPress={handlePickPhoto}>
            <PetPhoto
              foto={foto}
              tipo={tipo}
              nome={nome}
              size={120}
              style={{ borderWidth: 3, borderColor: colors.border }}
            />
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: BRAND_PRIMARY, borderRadius: 20, width: 40, height: 40,
              alignItems: 'center', justifyContent: 'center',
              ...(Platform.OS === 'android' ? { elevation: 3 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8,
              }),
            }}>
              <Camera size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
          </ScalePress>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 12 }}>Toque para alterar a foto</Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 20 }}>
          {/* Nome */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 14, marginBottom: 8 }}>
              Nome do pet <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <TextInput
              value={nome} onChangeText={setNome}
              placeholder="Ex: Rex, Bolinha, Luna..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next" autoCapitalize="words" autoCorrect={false} maxLength={30}
              style={inputStyle}
            />
          </View>

          {/* Tipo */}
          <View>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 14, marginBottom: 10 }}>
              Tipo de animal
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PET_TYPE_OPTIONS.map((opt) => {
                const selected = tipo === opt.tipo;
                return (
                  <ScalePress
                    key={opt.tipo} onPress={() => handleTipoSelect(opt.tipo)}
                    style={{
                      flex: 1, borderRadius: 14, paddingVertical: 12,
                      alignItems: 'center', gap: 4,
                      backgroundColor: selected ? darkCardBg : colors.bgCard,
                      borderWidth: 2, borderColor: selected ? darkCardBg : colors.border,
                      ...(Platform.OS === 'android' ? { elevation: selected ? 3 : 1 } : {}),
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#ffffff' : colors.textSecondary }}>
                      {opt.label}
                    </Text>
                  </ScalePress>
                );
              })}
            </View>
          </View>

          {/* Raça */}
          <View>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
              Raça <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <TextInput
              value={raca} onChangeText={handleRacaChange}
              placeholder={
                tipo === 'cachorro' ? 'Ex: Golden Retriever, Viralata...'
                : tipo === 'gato' ? 'Ex: Siamês, Persa...'
                : 'Ex: Coelho, Hamster...'
              }
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done" onSubmitEditing={isValid ? handleSave : undefined}
              autoCapitalize="words" autoCorrect={false} maxLength={40}
              style={inputStyle}
            />
            {racaSuggestions.length > 0 && (
              <View style={{
                backgroundColor: colors.bgCard, borderRadius: 12, marginTop: 4,
                borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
                ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
              }}>
                {racaSuggestions.map((s, i) => (
                  <ScalePress
                    key={s} onPress={() => { setRaca(s); setRacaSuggestions([]); }}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: i < racaSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{s}</Text>
                  </ScalePress>
                ))}
              </View>
            )}
          </View>

          {/* Data de nascimento */}
          <View>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
              Data de nascimento <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <TextInput
              value={nascimento} onChangeText={setNascimento}
              placeholder="AAAA-MM-DD (ex: 2021-03-15)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation" autoCorrect={false} maxLength={10}
              style={inputStyle}
            />
          </View>

          {/* Anotações gerais (R3-8): campo livre pra alergias,
              medicações, manias e tudo que não cabe nas opções
              padrões. Vai pro PDF veterinário também. */}
          <View>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
              Anotações gerais <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex: alergia a frango, toma medicação X, tem medo de trovão..."
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Anotações gerais sobre o pet"
              accessibilityHint="Texto livre que aparece no relatório veterinário"
              multiline
              maxLength={500}
              style={[inputStyle, { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }]}
            />
            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>
              {notes.length}/500 · aparece no PDF para o veterinário
            </Text>
          </View>

          {/* Privacidade */}
          <View style={{
            backgroundColor: actionTheme.comida.bg,
            borderWidth: 1, borderColor: actionTheme.comida.border,
            borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          }}>
            <Text style={{ fontSize: 16 }}>🔒</Text>
            <Text style={{ color: actionTheme.comida.primary, fontSize: 12, flex: 1, lineHeight: 20 }}>
              Seus dados ficam apenas no seu dispositivo.{'\n'}
              A foto é salva permanentemente no armazenamento local do app.
            </Text>
          </View>

          {/* CTA principal */}
          <ScalePress
            onPress={handleSave} disabled={!canSave}
            style={{
              borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center',
              backgroundColor: canSave ? darkCardBg : colors.bgMuted,
              ...(canSave && Platform.OS === 'android' ? { elevation: 3 } : {}),
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text style={{
                  fontFamily: 'Nunito_700Bold', fontSize: 16,
                  color: canSave ? '#ffffff' : colors.textTertiary,
                }}>
                  {hasChanges ? 'Salvar alterações' : 'Sem alterações'}
                </Text>
            }
          </ScalePress>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
