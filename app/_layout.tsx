import 'react-native-url-polyfill/auto';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

import { usePetStore } from '@/store/usePetStore';
import { View } from 'react-native';
import { ToastRenderer } from '@/components/ui/ToastRenderer';
import { ensureEncryptionKeyReady } from '@/store/storage';
import { initSupabaseAuthStorage } from '@/services/supabase';
import { BiometricLock } from '@/components/security/BiometricLock';
import { initAnalytics, track } from '@/services/analytics';
import { createPostHogClient, posthogBackend } from '@/services/analytics-posthog';
import { initPurchases } from '@/services/purchases';
import { getSession } from '@/services/AuthService';
// global.css removido junto com NativeWind (R7-B). Mantemos o arquivo
// só pra preservar o gap visual no diff — sem side effects.

// Inicializa o Sentry antes de qualquer renderização.
// DSN lida do .env (EXPO_PUBLIC_SENTRY_DSN).
// Em desenvolvimento (__DEV__ = true) o Sentry fica desativado para
// não poluir o dashboard com crashes de dev/simulador.
//
// PII SCRUB (security audit 2026-05-21, M-4):
//   - sendDefaultPii: false  → não anexa IP/email/cookies automaticamente
//   - beforeSend: tira email do event.user e auth headers
//   - beforeBreadcrumb: redige emails em mensagens de console capturadas
//     (breadcrumbs fazem auto-capture de console.log, que pode vazar
//      nome do pet, email, etc. — app é local-first com dados clínicos)
//
// Defesa em camadas pra LGPD: peso, nome do pet, foto NUNCA devem
// trafegar pra Sentry. Mesmo que algum console.log esqueça de redigir
// no código, o filtro abaixo segura.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TOKEN_RE = /\b(?:Bearer\s+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_.-]+/g;
function scrubString(s: string): string {
  return s.replace(EMAIL_RE, '[email]').replace(TOKEN_RE, '[token]');
}

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
    }
    return event;
  },
  beforeBreadcrumb(crumb) {
    // console.log/warn/error breadcrumbs podem vazar PII — redige
    // emails e tokens antes de mandar pra Sentry.
    if (crumb.category === 'console' && typeof crumb.message === 'string') {
      crumb.message = scrubString(crumb.message);
    }
    if (crumb.data && typeof crumb.data === 'object') {
      for (const k of Object.keys(crumb.data)) {
        const v = (crumb.data as Record<string, unknown>)[k];
        if (typeof v === 'string') {
          (crumb.data as Record<string, unknown>)[k] = scrubString(v);
        }
      }
    }
    return crumb;
  },
});

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const hasOnboarded = usePetStore((s) => s.hasOnboarded);
  const hasHydrated = usePetStore((s) => s._hasHydrated);
  const themeMode = usePetStore((s) => s.themeMode);
  const recordFirstAppOpen = usePetStore((s) => s.recordFirstAppOpen);

  const [storageReady, setStorageReady] = useState(false);

  // SECURITY: carregar chave de criptografia do Keychain ANTES de hidratar.
  // Sem essa chave, o MMKV seria criado unencrypted (modo degradado).
  useEffect(() => {
    (async () => {
      try {
        const key = await ensureEncryptionKeyReady();
        initSupabaseAuthStorage(key);
      } finally {
        setStorageReady(true);
      }
    })();
  }, []);

  // Analytics + RevenueCat ficam atrás de storageReady pra não rodar
  // antes de termos session/userId potenciais.
  useEffect(() => {
    if (!storageReady) return;
    (async () => {
      // PostHog opcional: se EXPO_PUBLIC_POSTHOG_KEY vazia, fica em modo
      // stub (apenas console em DEV). Sem ele, o app não trava.
      const phClient = await createPostHogClient();
      initAnalytics(phClient ? posthogBackend(phClient) : undefined);
      track({ name: 'app_opened', props: { coldStart: true } });
    })();
    initPurchases().catch(() => {});

    // Cold-start auth: chama getSession (que internamente também
    // dispara `maybeApplyDevPremium`) pra reativar premium dev em
    // toda abertura do app, sem precisar logar/abrir tela /premium.
    // Feedback R3-3: users já logados não viam o premium ativar
    // porque o grant SÓ rodava em signIn fresh ou na tela /premium.
    // Falha silenciosa se Supabase offline — não bloqueia nada.
    getSession().catch(() => {});
  }, [storageReady]);

  // Registra first-open uma única vez (usado para trigger "7 dias de uso")
  useEffect(() => {
    if (storageReady) recordFirstAppOpen();
  }, [storageReady, recordFirstAppOpen]);

  const router = useRouter();
  const segments = useSegments();

  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const guardRanRef = useRef(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated || !storageReady) return;

    if (guardRanRef.current) return;
    guardRanRef.current = true;

    const inOnboarding = (segments as string[])[0] === 'onboarding';
    const inDev = (segments as string[])[0] === '(dev)';

    if (!hasOnboarded && !inOnboarding && !inDev) {
      router.replace('/onboarding');
    } else if (hasOnboarded && inOnboarding) {
      router.replace('/(tabs)');
    }

    setIsNavigationReady(true);
    SplashScreen.hideAsync();
  }, [fontsLoaded, hasHydrated, hasOnboarded, storageReady]);

  useEffect(() => {
    guardRanRef.current = false;
  }, [hasOnboarded]);

  if (!isNavigationReady) return null;

  return (
    <BiometricLock>
    <View style={{ flex: 1 }}>
      <StatusBar style={themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'dark' : 'auto'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="edit-profile"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="premium"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="(dev)" />
        <Stack.Screen
          name="log-detail"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="nutrition"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="photos"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="invite"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <ToastRenderer />
    </View>
    </BiometricLock>
  );
}
