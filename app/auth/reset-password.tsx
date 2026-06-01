// ─── Reset password (recovery flow) ─────────────────────────
//
// Tela final do fluxo "Esqueci minha senha". Roteamento:
//
//   1. User clica "Esqueci a senha" no StepAuth → AuthService.sendPasswordReset
//      manda e-mail com link `cronopet://auth/confirmed?...&type=recovery`.
//   2. Link abre o app, Supabase processa o token e faz signIn temporário
//      em modo "recovery" (sessão válida MAS marcada).
//   3. Listener global em app/_layout.tsx captura `onAuthStateChange`
//      com event === 'PASSWORD_RECOVERY' e navega pra cá.
//   4. Esta tela coleta a nova senha, valida e chama
//      supabase.auth.updateUser({ password }) — invalida a sessão de
//      recovery e cria uma normal.
//
// Sem esta tela, o user ficava logado via recovery session mas sem
// jeito de trocar a senha. Resolveu P1 reportado por user real.

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { getSupabase } from '@/services/supabase';
import { checkPasswordStrength } from '@/lib/security';
import { translateSupabaseError } from '@/lib/supabaseErrors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = pwd.length > 0 && pwd2.length > 0;

  const handleSubmit = useCallback(async () => {
    const strength = checkPasswordStrength(pwd);
    if (!strength.isValid) {
      Alert.alert(
        'Senha fraca',
        `Sua nova senha precisa de:\n\n• ${strength.issues.join('\n• ')}`,
      );
      return;
    }
    if (pwd !== pwd2) {
      Alert.alert('Senhas diferentes', 'A confirmação não bate com a nova senha.');
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Pronto', 'Sua senha foi atualizada.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro', translateSupabaseError(msg));
    } finally {
      setLoading(false);
    }
  }, [pwd, pwd2, router]);

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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28, gap: 16 }}>
        <View>
          <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
            Recuperação de acesso
          </Text>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 24,
              fontWeight: '800',
              marginTop: 4,
              lineHeight: 30,
            }}
          >
            Defina uma nova senha
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
            Quando confirmar, você entra com a nova senha imediatamente.
          </Text>
        </View>

        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Nova senha
          </Text>
          <TextInput
            value={pwd}
            onChangeText={setPwd}
            placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            textContentType="newPassword"
            accessibilityLabel="Nova senha"
            style={inputStyle}
          />

          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Confirme a nova senha
          </Text>
          <TextInput
            value={pwd2}
            onChangeText={setPwd2}
            placeholder="Digite a mesma senha"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            textContentType="newPassword"
            accessibilityLabel="Confirmar nova senha"
            onSubmitEditing={isValid ? handleSubmit : undefined}
            style={inputStyle}
          />
        </View>

        <ScalePress
          onPress={handleSubmit}
          disabled={!isValid || loading}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Atualizar senha"
          accessibilityState={{ disabled: !isValid || loading, busy: loading }}
          style={{
            backgroundColor: isValid && !loading ? darkCardBg : colors.bgInput,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? colors.textPrimary : '#ffffff'} />
          ) : (
            <Text
              style={{
                color: isValid ? '#ffffff' : colors.textDisabled,
                fontWeight: '700',
                fontSize: 16,
                fontFamily: 'Nunito_700Bold',
              }}
            >
              Atualizar senha →
            </Text>
          )}
        </ScalePress>
      </View>
    </SafeAreaView>
  );
}
