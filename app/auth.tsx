// ─── Tela de Auth standalone ─────────────────────────────────
//
// Reaproveita o StepAuth do onboarding pra cenários onde o user já
// passou pelo onboarding mas a sessão sumiu:
//   - Token expirou
//   - User deslogou manualmente em Settings
//   - Reinstalou o app (MMKV criado novo, sem session) mas o
//     hasOnboarded persiste true via persist middleware (não persiste,
//     mas defensive)
//
// Caller: guard global em _layout.tsx redireciona aqui se
// hasOnboarded && !hasSession.

import React from 'react';
import { View, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { StepAuth } from '@/components/onboarding/StepAuth';
import { IllustrationWelcome } from '@/components/onboarding/IllustrationWelcome';

export default function AuthScreen() {
  const router = useRouter();
  const T = useTheme();
  const { height } = useWindowDimensions();

  // HERO_H reduzido de 0.30 → 0.20 (2026-06-02): no re-login standalone
  // o user precisa SÓ logar — hero é puro decorativo. Hero pequeno deixa
  // mais espaço pros campos quando o teclado abre.
  const HERO_H = height * 0.20;
  const heroBg = ACTIONS_V3.xixi.tintL;

  return (
    <View style={{ flex: 1, backgroundColor: heroBg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* KeyboardAvoidingView estava AUSENTE nesta tela (bug reportado):
            teclado cobria os campos no re-login standalone. Onboarding já
            tem KAV; esta tela compartilha o StepAuth mas estava nua. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ height: HERO_H, alignItems: 'center', justifyContent: 'center' }}>
            <IllustrationWelcome />
          </View>

          <View style={{
            flex: 1,
            backgroundColor: T.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}>
            <StepAuth
              onSuccess={() => router.replace('/(tabs)')}
              // No standalone, "voltar" não tem pra onde ir — esconde via
              // navegação ignorada (botão Voltar mostra mas no-op confortável)
              onBack={() => { /* no-op: sem onde voltar */ }}
            />
            {/* No standalone, hadCloudPet é ignorado: já está pós-onboarding,
                vai direto pras tabs com store hidratado pelo AuthService. */}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
