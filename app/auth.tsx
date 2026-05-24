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
import { View, SafeAreaView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StepAuth } from '@/components/onboarding/StepAuth';
import { IllustrationWelcome } from '@/components/onboarding/IllustrationWelcome';

export default function AuthScreen() {
  const router = useRouter();
  const { colors, actionTheme } = useThemeColors();
  const { height } = useWindowDimensions();

  const HERO_H = height * 0.30;
  const heroBg = actionTheme.xixi.bg;

  return (
    <View style={{ flex: 1, backgroundColor: heroBg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ height: HERO_H, alignItems: 'center', justifyContent: 'center' }}>
          <IllustrationWelcome />
        </View>

        <View style={{
          flex: 1,
          backgroundColor: colors.bgScreen,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}>
          <StepAuth
            onSuccess={() => router.replace('/(tabs)')}
            // No standalone, "voltar" não tem pra onde ir — esconde via
            // navegação ignorada (botão Voltar mostra mas no-op confortável)
            onBack={() => { /* no-op: sem onde voltar */ }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
