// ─── Rota de retorno do email confirmation ───────────────────
//
// Supabase Auth (Site URL = cronopet://auth/confirmed) redireciona
// o user pra este path APÓS processar o token de confirmação. Quando
// o link no email é clicado:
//
//   1. Supabase processa GET /auth/v1/verify?token=...&type=signup
//      e seta `email_confirmed_at` na auth.users
//   2. Redireciona pra `cronopet://auth/confirmed`
//   3. iOS/Android abre o app via custom scheme
//   4. expo-router resolve essa URL pra este file
//
// Comportamento desta tela:
//   - Loading + texto "Confirmando..." imediato
//   - getSession() pra checar se a sessão já foi populada pelo SDK
//     (Supabase auto-restaura via PKCE / refresh token armazenado)
//   - Se session válida → vai pro app principal /(tabs)
//   - Sem session → redireciona pra /auth com toast pedindo login
//     (caso comum: user confirmou email no desktop e abriu app no
//     celular sem ter logado ainda)
//
// Sem este file, o deep link caía em +not-found.tsx e o user via
// "Página não encontrada" depois de confirmar email.

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToastStore } from '@/store/useToastStore';

export default function AuthConfirmedScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (data.session?.user) {
          // Sessão restaurada (PKCE flow ou refresh em curso) — vai
          // direto pro dashboard. Onboarding guard no _layout decide
          // se ainda precisa criar pet (hasOnboarded=false).
          router.replace('/(tabs)');
        } else {
          // Email confirmado mas sem sessão local nesse device. Manda
          // pro login pra ele entrar com credenciais agora confirmadas.
          showToast('success', 'E-mail confirmado. Faça login pra continuar.', 4000);
          router.replace('/auth');
        }
      } catch {
        if (cancelled) return;
        // Falha rara (storage off / SDK quebrado) — fallback pro login
        // sem toast de erro pra não assustar; user reentra normalmente.
        router.replace('/auth');
      }
    })();

    return () => { cancelled = true; };
  }, [router, showToast]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgScreen,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
      }}
    >
      <ActivityIndicator size="large" color={colors.tabActive} />
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: 'Nunito_700Bold',
          fontSize: 18,
          textAlign: 'center',
        }}
        accessibilityRole="header"
      >
        Confirmando seu e-mail…
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 18,
        }}
      >
        Só um instante. Estamos finalizando seu acesso.
      </Text>
    </View>
  );
}
