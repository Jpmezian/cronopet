import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput,
  Platform, KeyboardAvoidingView, ScrollView,
  useWindowDimensions, Pressable, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Camera, Check } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  FadeInRight, FadeIn, runOnJS, useReducedMotion,
} from 'react-native-reanimated';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canonicalizeBreed, SRD } from '@/data/breeds';
import { BreedPickerField } from '@/components/ui/BreedPickerField';
import { track } from '@/services/analytics';
import { ScalePress } from '@/components/ui/ScalePress';
import { PetPhoto } from '@/components/PetPhoto';
import { IllustrationWelcome } from '@/components/onboarding/IllustrationWelcome';
import { IllustrationRoutine } from '@/components/onboarding/IllustrationRoutine';
import { IllustrationSetup } from '@/components/onboarding/IllustrationSetup';
import { StepAuth } from '@/components/onboarding/StepAuth';
import { BirthdayPickerField } from '@/components/ui/BirthdayPickerField';
import type { PetType } from '@/types/pet';

// ─── Constantes ───────────────────────────────────────────────
const BRAND_PRIMARY  = '#04A29B';
// DEFAULT_FOTO removida em 2026-05-22 — era URL Unsplash apontando pra
// um RATO ("photo-1587300003388-59208cc962cb"). Pet sem foto agora
// renderiza <PetPhoto/> fallback (ícone Dog/Cat/PawPrint + cor da marca).
//
// Steps (após sprint AUTH 2026-05-24):
//  0 = Welcome (intro + features)
//  1 = Auth (signup/signin obrigatório — gate)
//  2 = PetType (cachorro/gato/outro)
//  3 = PetProfile (nome, raça, foto, nascimento)
type Step = 0 | 1 | 2 | 3;

// ─── Tela principal ───────────────────────────────────────────
export default function OnboardingScreen() {
  const router             = useRouter();
  const completeOnboarding = usePetStore((s) => s.completeOnboarding);
  const { colors, actionTheme } = useThemeColors();
  const { height }         = useWindowDimensions();
  const isReduced          = useReducedMotion();

  const [displayStep, setDisplayStep] = useState<Step>(0);
  const [heroBg,      setHeroBg]      = useState<string>(actionTheme.agua.bg);

  // Funnel entry: dispara 1× quando a tela monta. Só faz sentido na
  // primeira sessão (guard global redireciona pra (tabs) se já onboardou),
  // então não filtra por hasOnboarded — é onboarding_started por definição.
  useEffect(() => {
    track({ name: 'onboarding_started' });
  }, []);

  const [tipo,        setTipo]        = useState<PetType>('cachorro');
  const [nome,        setNome]        = useState('');
  const [raca,        setRaca]        = useState('');
  const [nascimento,  setNascimento]  = useState('');
  const [foto,        setFoto]        = useState<string | null>(null);

  // ── Animação de cross-fade ────────────────────────────────
  const illustrationOpacity = useSharedValue(1);
  const illustrationStyle   = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
  }));

  // ── Hero adapta a teclado ─────────────────────────────────
  // R5-2: 0.46 → 0.36 (welcome/petType) e 0.30 (form steps).
  // 2026-06-02: quando o teclado abre nos steps de form (1 Auth e
  // 3 PetProfile), encolhe pra 0.12 (≈60px) pra liberar espaço.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const onHide = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);
  const isFormStep = displayStep === 1 || displayStep === 3;
  const heroRatio = isFormStep
    ? (keyboardOpen ? 0.12 : 0.30)
    : 0.36;
  const HERO_H = height * heroRatio;

  const HERO_COLORS = [
    actionTheme.agua.bg,      // 0 Welcome
    actionTheme.xixi.bg,      // 1 Auth (roxo suave, contraste com pet steps)
    actionTheme.passeio.bg,   // 2 PetType
    actionTheme.comida.bg,    // 3 PetProfile
  ];

  const animateToStep = useCallback((nextStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isReduced) {
      setDisplayStep(nextStep);
      setHeroBg(HERO_COLORS[nextStep]);
      return;
    }
    illustrationOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setDisplayStep)(nextStep);
        runOnJS(setHeroBg)(HERO_COLORS[nextStep]);
        illustrationOpacity.value = withTiming(1, { duration: 220 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [illustrationOpacity, isReduced]);

  // ── Handlers ─────────────────────────────────────────────
  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) setFoto(result.assets[0].uri);
  }, []);

  const handleFinish = useCallback(async () => {
    if (!nome.trim()) return;
    // Raça vem do BreedPicker (já canônica) ou de texto livre quando user
    // toca "Outro". Pra retrocompat com pets pré-picker, ainda passa pelo
    // canonicalizeBreed (idempotente em raças já canônicas).
    const racaInput = raca.trim();
    const canonical = racaInput ? canonicalizeBreed(racaInput, tipo) : null;
    const racaFinal = canonical ?? racaInput ?? '';
    // Foto vazia ("") quando user não escolhe → PetPhoto renderiza fallback
    // estilizado em toda a UI. Antes ficava DEFAULT_FOTO Unsplash (rato).
    await completeOnboarding(
      nome.trim(), tipo, racaFinal || SRD,
      foto ?? '',
      nascimento.trim() || undefined,
    );
    router.replace('/(tabs)');
  }, [nome, tipo, raca, foto, nascimento, completeOnboarding, router]);

  // ── Ilustração do hero por step ──────────────────────────
  // Step 1 (Auth) reusa IllustrationWelcome — mantém continuidade visual
  // (o welcome convida, e a auth ainda é "boas-vindas" no contexto do user).
  const HeroIllustration = () => {
    if (displayStep === 0 || displayStep === 1) return <IllustrationWelcome />;
    if (displayStep === 2) return <IllustrationRoutine />;
    return <IllustrationSetup />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: heroBg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Hero section ──
              Bug fix (2026-05-26): hero vira Pressable que dispensa
              o teclado quando tocado. Sem isso, o usuário no StepAuth
              tocava na ilustração esperando fechar o teclado e nada
              acontecia — campos ficavam atrás do teclado sem saída.
              `accessible={false}` pra não virar elemento de leitor de
              tela (ilustração já é decorativa). */}
          <Pressable
            onPress={Keyboard.dismiss}
            accessible={false}
            style={{ height: HERO_H, alignItems: 'center', justifyContent: 'center' }}
          >
            <Animated.View style={illustrationStyle}>
              <HeroIllustration />
            </Animated.View>
          </Pressable>

          {/* ── Content card ── */}
          <View style={{
            flex: 1,
            backgroundColor: colors.bgScreen,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}>
            {displayStep === 0 && (
              <StepWelcome
                onNext={() => animateToStep(1)}
              />
            )}
            {displayStep === 1 && (
              <StepAuth
                onSuccess={({ hadCloudPet }) => {
                  if (hadCloudPet) {
                    // User já tem pet no Supabase (trocou de celular).
                    // hydrateFromCloud já populou o pet no store.
                    // Pula StepPetType + StepPetProfile e marca onboarding.
                    usePetStore.getState().markOnboarded();
                    router.replace('/(tabs)');
                  } else {
                    animateToStep(2);
                  }
                }}
                onBack={() => animateToStep(0)}
              />
            )}
            {displayStep === 2 && (
              <StepPetType
                tipo={tipo}
                onSelect={(t) => { setTipo(t); setRaca(''); }}
                onNext={() => animateToStep(3)}
              />
            )}
            {displayStep === 3 && (
              <StepPetProfile
                tipo={tipo}
                nome={nome} raca={raca} foto={foto} nascimento={nascimento}
                onChangeName={setNome}
                onChangeRaca={setRaca}
                onChangeNascimento={setNascimento}
                onPickPhoto={handlePickPhoto}
                onFinish={handleFinish}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 0: Boas-vindas ──────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const { colors, isDark } = useThemeColors();
  const isReduced = useReducedMotion();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;
  const textEntering = isReduced ? FadeIn.duration(200) : FadeInRight.duration(280);

  // Bug fix 2026-05-22: sem ScrollView, iPhone com tela menor (SE 1ª/2ª
  // gen, mini) tinha texto + 3 cards + CTA estourando a altura disponível
  // e elementos saíam da tela sem possibilidade de arrastar. ScrollView
  // com flexGrow:1 + justifyContent:space-between preserva o layout
  // quando cabe e libera o scroll quando não cabe.
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 24, paddingBottom: 28,
        justifyContent: 'space-between',
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo brand removida daqui (R5-2): agora aparece no HERO
          do onboarding (IllustrationWelcome). Mantida só a wordmark
          minúscula como ancoragem da marca no início do conteúdo. */}
      <Animated.View entering={textEntering} style={{ alignItems: 'center' }}>
        <Text style={{
          color: colors.tabActive,
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 12, fontWeight: '800',
          letterSpacing: 2,
        }}>
          CRONOPET
        </Text>
      </Animated.View>

      {/* Texto animado */}
      <Animated.View entering={textEntering}>
        <Text style={{
          color: colors.textPrimary, fontFamily: 'Nunito_800ExtraBold',
          fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 8,
        }}>
          O melhor amigo{'\n'}do seu pet.
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
          Cuidar de quem te ama nunca foi tão fácil e organizado.
        </Text>
      </Animated.View>

      {/* Feature pills */}
      <View style={{ gap: 8 }}>
        {[
          { emoji: '📋', title: 'Registros diários', desc: 'Comida, água, passeio e mais — com foto e nota' },
          { emoji: '🔥', title: 'Streak de cuidados', desc: 'Nunca quebre a sequência de dias perfeitos' },
          { emoji: '🩺', title: 'Saúde centralizada', desc: 'Vacinas, sintomas e relatório PDF pro veterinário' },
        ].map((item) => (
          <View key={item.title} style={{
            backgroundColor: colors.bgCard, borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.textPrimary, fontWeight: '600',
                fontSize: 13, fontFamily: 'Nunito_700Bold',
              }}>
                {item.title}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <ScalePress
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onNext();
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Começar agora"
        style={{
          backgroundColor: darkCardBg, borderRadius: 16, height: 56,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{
          color: '#ffffff', fontWeight: '700',
          fontSize: 16, fontFamily: 'Nunito_700Bold',
        }}>
          Começar agora →
        </Text>
      </ScalePress>
    </ScrollView>
  );
}

// ─── Step 1: Tipo do pet ──────────────────────────────────────

const PET_TYPE_OPTIONS: { tipo: PetType; emoji: string; label: string }[] = [
  { tipo: 'cachorro', emoji: '🐶', label: 'Cachorro' },
  { tipo: 'gato',     emoji: '🐱', label: 'Gato'     },
  { tipo: 'outro',    emoji: '🐾', label: 'Outro'    },
];

function StepPetType({
  tipo, onSelect, onNext,
}: {
  tipo: PetType;
  onSelect: (t: PetType) => void;
  onNext: () => void;
}) {
  const { colors, isDark } = useThemeColors();
  const isReduced = useReducedMotion();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;
  const textEntering = isReduced ? FadeIn.duration(200) : FadeInRight.duration(280);

  // Bug fix 2026-05-22: idem StepWelcome — overflow em iPhone com tela
  // menor. ScrollView com flexGrow + space-between mantém visual quando
  // cabe, libera scroll quando estoura.
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 24, paddingBottom: 28,
        justifyContent: 'space-between',
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={textEntering}>
        <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
          Passo 2 de 3
        </Text>
        <Text style={{
          color: colors.textPrimary, fontFamily: 'Nunito_800ExtraBold',
          fontSize: 26, fontWeight: '800', marginTop: 4, lineHeight: 32,
        }}>
          Qual é o seu{'\n'}animal? 🐾
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 6 }}>
          Isso personaliza as ações e a lista de raças.
        </Text>
      </Animated.View>

      <View style={{ gap: 12 }}>
        {PET_TYPE_OPTIONS.map((opt) => {
          const selected = tipo === opt.tipo;
          return (
            <ScalePress
              key={opt.tipo}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(opt.tipo);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected }}
              style={{
                borderRadius: 18, padding: 18,
                flexDirection: 'row', alignItems: 'center', gap: 16,
                backgroundColor: selected ? darkCardBg : colors.bgCard,
                borderWidth: 2,
                borderColor: selected ? darkCardBg : colors.border,
              }}
            >
              <Text style={{ fontSize: 36 }}>{opt.emoji}</Text>
              <Text style={{
                fontSize: 18, fontWeight: '700', fontFamily: 'Nunito_700Bold',
                color: selected ? '#ffffff' : colors.textPrimary, flex: 1,
              }}>
                {opt.label}
              </Text>
              {selected && <Check size={22} color="#ffffff" strokeWidth={2.5} />}
            </ScalePress>
          );
        })}
      </View>

      <ScalePress
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onNext();
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Continuar"
        style={{
          backgroundColor: darkCardBg, borderRadius: 16, height: 56,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{
          color: '#ffffff', fontWeight: '700',
          fontSize: 16, fontFamily: 'Nunito_700Bold',
        }}>
          Continuar →
        </Text>
      </ScalePress>
    </ScrollView>
  );
}

// ─── Step 2: Perfil do pet ────────────────────────────────────

interface StepPetProfileProps {
  tipo: PetType;
  nome: string; raca: string; foto: string | null; nascimento: string;
  onChangeName: (v: string) => void;
  onChangeRaca: (v: string) => void;
  onChangeNascimento: (v: string) => void;
  onPickPhoto: () => void;
  onFinish: () => void;
}

function StepPetProfile({
  tipo, nome, raca, foto, nascimento,
  onChangeName, onChangeRaca, onChangeNascimento, onPickPhoto, onFinish,
}: StepPetProfileProps) {
  const { colors, isDark } = useThemeColors();
  const isReduced  = useReducedMotion();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;
  const isValid    = nome.trim().length > 0;
  const tipoLabel  = tipo === 'cachorro' ? 'cachorro' : tipo === 'gato' ? 'gato' : 'pet';
  const textEntering = isReduced ? FadeIn.duration(200) : FadeInRight.duration(280);

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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={textEntering}>
        <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
          Passo 3 de 3
        </Text>
        <Text style={{
          color: colors.textPrimary, fontFamily: 'Nunito_800ExtraBold',
          fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 20,
        }}>
          Perfil do {tipoLabel} 🐾
        </Text>
      </Animated.View>

      {/* Foto picker — PetPhoto cuida do fallback se foto vazia */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <ScalePress
          onPress={onPickPhoto}
          accessible
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

      {/* Nome */}
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
        Nome*
      </Text>
      <TextInput
        value={nome}
        onChangeText={onChangeName}
        placeholder={`Como se chama seu ${tipoLabel}?`}
        placeholderTextColor={colors.textTertiary}
        style={inputStyle}
        autoCapitalize="words"
        returnKeyType="next"
        accessible
        accessibilityLabel="Nome do pet"
      />

      {/* Raça — seletor full-screen com SRD e Outro. Pra tipo='outro',
          renderiza TextInput livre direto. */}
      <View style={{ marginBottom: 12 }}>
        <BreedPickerField
          label="Raça (opcional)"
          species={tipo}
          value={raca}
          onChange={onChangeRaca}
          petName={nome}
        />
      </View>

      {/* Nascimento — picker nativo (DB-002 follow-up):
          evita erro de formato comum no TextInput livre 'YYYY-MM-DD'. */}
      <BirthdayPickerField
        value={nascimento}
        onChange={onChangeNascimento}
      />

      {/* CTA */}
      <ScalePress
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onFinish();
        }}
        disabled={!isValid}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Conhecer o ${nome || tipoLabel}`}
        accessibilityState={{ disabled: !isValid }}
        style={{
          backgroundColor: isValid ? darkCardBg : colors.bgInput,
          borderRadius: 16, height: 56,
          alignItems: 'center', justifyContent: 'center',
          marginTop: 8,
        }}
      >
        <Text style={{
          color: isValid ? '#ffffff' : colors.textDisabled,
          fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
        }}>
          Conhecer o {nome || tipoLabel} →
        </Text>
      </ScalePress>
    </ScrollView>
  );
}
