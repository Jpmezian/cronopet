// ─── Onboarding Step 1: Autenticação ──────────────────────────
//
// Decisão de produto (2026-05-24): login OBRIGATÓRIO no onboarding.
// Sem login, dados ficam só local e somem se user trocar de celular.
// Esta tela é gate — usuário não chega no StepPetType sem session.
//
// Após signUp/signIn bem-sucedidos:
//   - AuthService.maybeApplyDevPremium → aplica Pro se email hardcoded
//   - AuthService.hydrateStoreFromCloud → puxa pet/logs se já existia
//   - Trigger 011 (Supabase) cria personal family_group automaticamente
//   - Caller (onboarding.tsx) chama onSuccess() → avança pra step 2

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { signIn, signUp } from '@/services/AuthService';
import { hydrateFromCloud } from '@/services/SyncService';
import { isValidEmail, checkPasswordStrength } from '@/lib/security';
import { translateSupabaseError } from '@/lib/supabaseErrors';

type AuthTab = 'signup' | 'signin';

interface StepAuthProps {
  /** Nome do tutor (pré-preenchido do welcome, ou string vazia). Usado no signUp. */
  defaultName?: string;
  /** Callback chamado após auth com sucesso.
   *  hadCloudPet=true → user já tem pet no Supabase (caso "trocou de
   *  celular"); caller pode pular criação de pet e ir direto pro
   *  dashboard. hadCloudPet=false → fluxo normal (criar pet). */
  onSuccess: (info: { hadCloudPet: boolean }) => void;
  /** Callback pra voltar ao step anterior (welcome). */
  onBack: () => void;
}

export function StepAuth({ defaultName = '', onSuccess, onBack }: StepAuthProps) {
  const { colors, isDark } = useThemeColors();
  const isReduced  = useReducedMotion();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;
  const textEntering = isReduced ? FadeIn.duration(200) : FadeInRight.duration(280);

  const [tab,      setTab]      = useState<AuthTab>('signup');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [nome,     setNome]     = useState(defaultName);
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14 as const,
    paddingVertical: 12 as const,
    fontSize: 15 as const,
    color: colors.textPrimary,
    marginBottom: 12 as const,
  };

  const handleSubmit = useCallback(async () => {
    // ─── Validações client-side ─────────────────────────────
    if (!isValidEmail(email)) {
      Alert.alert('E-mail inválido', 'Digite um endereço de e-mail válido.');
      return;
    }
    if (tab === 'signup') {
      if (!nome.trim() || nome.trim().length < 2) {
        Alert.alert('Nome obrigatório', 'Como você quer ser chamado(a)?');
        return;
      }
      const strength = checkPasswordStrength(password);
      if (!strength.isValid) {
        Alert.alert(
          'Senha fraca',
          `Sua senha precisa de:\n\n• ${strength.issues.join('\n• ')}`,
        );
        return;
      }
    } else {
      if (!password) {
        Alert.alert('Senha obrigatória', 'Digite sua senha.');
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === 'signup') {
        await signUp(email, password, nome.trim());
        // Signup novo nunca tem pet no cloud (trigger 011 acabou de
        // criar o group vazio). Avisa do email de confirmação e segue.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Conta criada!',
          'Enviamos um e-mail de confirmação para você. Pode ignorar e continuar — confirme quando puder pra ter Pro/família.',
          [{ text: 'Continuar', onPress: () => onSuccess({ hadCloudPet: false }) }],
        );
      } else {
        await signIn(email, password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Sprint AUTH Fase 5: detectar se cloud já tem pet pra pular
        // a criação no onboarding. Timeout 3s — se hydrate demorar,
        // assume sem pet e segue fluxo normal (PetType + Setup).
        let hadCloudPet = false;
        try {
          const snapshot = await Promise.race([
            hydrateFromCloud(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
          ]);
          hadCloudPet = !!(snapshot?.pet && snapshot.pet.nome);
        } catch { /* fallback hadCloudPet=false */ }
        onSuccess({ hadCloudPet });
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro', translateSupabaseError(msg));
    } finally {
      setLoading(false);
    }
  }, [tab, email, password, nome, onSuccess]);

  const isValidForm =
    isValidEmail(email) &&
    password.length > 0 &&
    (tab === 'signin' || nome.trim().length >= 2);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 28,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={textEntering}>
        <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
          Passo 1 de 3
        </Text>
        <Text style={{
          color: colors.textPrimary, fontFamily: 'Nunito_800ExtraBold',
          fontSize: 24, fontWeight: '800', marginTop: 4, lineHeight: 30,
        }}>
          {tab === 'signup' ? 'Crie sua conta' : 'Entre na sua conta'}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
          {tab === 'signup'
            ? 'Pra seus dados ficarem salvos mesmo se você trocar de celular.'
            : 'Bem-vindo de volta. Seus pets te esperam.'}
        </Text>
      </Animated.View>

      {/* Tabs Sign up / Sign in */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {(['signup', 'signin'] as AuthTab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 10, alignItems: 'center',
                borderRadius: 10,
                backgroundColor: active ? darkCardBg : colors.bgCard,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t === 'signup' ? 'Aba criar conta' : 'Aba já tenho conta'}
            >
              <Text style={{
                color: active ? '#ffffff' : colors.textSecondary,
                fontSize: 14, fontWeight: '700', fontFamily: 'Nunito_700Bold',
              }}>
                {t === 'signup' ? 'Criar conta' : 'Já tenho conta'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Form */}
      <View>
        {tab === 'signup' && (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
              Seu nome
            </Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Como podemos te chamar?"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Seu nome"
              maxLength={50}
            />
          </>
        )}

        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
          E-mail
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          accessibilityLabel="E-mail"
          textContentType={tab === 'signup' ? 'newPassword' : 'username'}
        />

        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
          Senha
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={tab === 'signup' ? 'Mín. 8 chars, 1 maiúscula, 1 número' : 'Sua senha'}
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Senha"
          textContentType={tab === 'signup' ? 'newPassword' : 'password'}
          onSubmitEditing={isValidForm ? handleSubmit : undefined}
        />
      </View>

      {/* Disclaimer LGPD curto */}
      <Text style={{ color: colors.textTertiary, fontSize: 11, lineHeight: 16 }}>
        Ao continuar você concorda com nossos{' '}
        <Text
          style={{ color: colors.tabActive, fontWeight: '600' }}
          onPress={() => Linking.openURL('https://cronopet.com.br/termos').catch(() => {})}
        >
          Termos
        </Text>{' '}
        e{' '}
        <Text
          style={{ color: colors.tabActive, fontWeight: '600' }}
          onPress={() => Linking.openURL('https://cronopet.com.br/privacidade').catch(() => {})}
        >
          Política de Privacidade
        </Text>.
      </Text>

      {/* CTA */}
      <ScalePress
        onPress={handleSubmit}
        disabled={!isValidForm || loading}
        accessibilityRole="button"
        accessibilityLabel={tab === 'signup' ? 'Criar conta e continuar' : 'Entrar e continuar'}
        accessibilityState={{ disabled: !isValidForm || loading, busy: loading }}
        style={{
          backgroundColor: isValidForm && !loading ? darkCardBg : colors.bgInput,
          borderRadius: 16, height: 56,
          alignItems: 'center', justifyContent: 'center',
          marginTop: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color={isDark ? colors.textPrimary : '#ffffff'} />
        ) : (
          <Text style={{
            color: isValidForm ? '#ffffff' : colors.textDisabled,
            fontWeight: '700', fontSize: 16, fontFamily: 'Nunito_700Bold',
          }}>
            {tab === 'signup' ? 'Criar conta →' : 'Entrar →'}
          </Text>
        )}
      </ScalePress>

      {/* Voltar ao welcome */}
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={{ alignSelf: 'center', paddingVertical: 8 }}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
          ← Voltar
        </Text>
      </Pressable>
    </ScrollView>
  );
}
