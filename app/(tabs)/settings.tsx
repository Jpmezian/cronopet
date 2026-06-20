import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { AccountCard } from '@/components/settings/AccountCard';
import { FamilyCard } from '@/components/settings/FamilyCard';
import { PetsCard } from '@/components/settings/PetsCard';
import { AppearanceCard } from '@/components/settings/AppearanceCard';
import { NotificationsCard } from '@/components/settings/NotificationsCard';
import { AboutCard } from '@/components/settings/AboutCard';
import { DangerZone } from '@/components/settings/DangerZone';
import { InsightsSettingsCard } from '@/components/medical/InsightsSettingsCard';
import { signOut, deleteRemoteAccount } from '@/services/AuthService';
import { clearSupabaseAuthStorage, getSupabase } from '@/services/supabase';
import { usePetStore } from '@/store/usePetStore';
import { usePremium } from '@/hooks/usePremium';
import { useMotion } from '@/hooks/useMotion';
import { useTheme } from '@/hooks/useTheme';

/**
 * SettingsScreen — Bold v3 (Fase 7 — briefing 11).
 *
 * Composição:
 *   1. Título "Configurações" (Fase 8: settings virou tab, header back
 *      removido — não há pra onde voltar em tab raiz)
 *   2. AccountCard
 *   3. FamilyCard → /premium
 *   4. PetsCard (multi-pet DB-002)
 *   5. AppearanceCard (mode + tone)
 *   6. NotificationsCard (lembrete diário + toggle re-engagement)
 *   7. InsightsSettingsCard (legacy externo — useThemeColors interno
 *      mantido, R-fase-7-2)
 *   8. AboutCard (logo + versão + tour + suporte + legal)
 *   9. DangerZone (sair + excluir)
 *
 * useThemeColors removido desta tela. Migração liquida dívida do
 * toggle re-engagement (commit 55df174) — agora usa Toggle Bold v3.
 *
 * Seções DESCARTADAS (R-fase-7-1): Sequência atual + escudos (já em
 * StreakHero da Fase 3, duplicação).
 *
 * Pet handlers, signOut, deleteAccount preservados intactos.
 */
export default function SettingsScreen() {
  const T = useTheme();
  const router = useRouter();
  const { entering, sectionEntering } = useMotion();
  const premium = usePremium();

  const setHasCompletedTour = usePetStore((s) => s.setHasCompletedTour);
  const resetStore          = usePetStore((s) => s.resetStore);
  const activePet           = usePetStore((s) => s.pet);

  // ── Conta (email/nome do user logado) ─────────────────────
  const [account, setAccount] = useState<{ email: string; nome?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        const u = data.session?.user;
        if (!u?.email) { setAccount(null); return; }
        setAccount({
          email: u.email,
          nome:  u.user_metadata?.nome as string | undefined,
        });
      } catch { /* sem session, sem card */ }
    })();
    return () => { alive = false; };
  }, []);

  const { handleSignOut, handleDeleteAccount } = useAccountActions(router, resetStore);
  const handleReplayTour = useCallback(() => {
    setHasCompletedTour(false);
    router.push('/(tabs)');
  }, [setHasCompletedTour, router]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        <Animated.View entering={sectionEntering(0)}>
          <Text style={[s.h1, { color: T.ink }]} accessibilityRole="header">
            Configurações
          </Text>
        </Animated.View>

        <View style={{ marginTop: 22, gap: 20 }}>
          <Animated.View entering={entering(0)}>
            <AccountCard
              email={account?.email ?? null}
              nome={account?.nome}
              isPremium={premium.isPremium}
            />
          </Animated.View>

          <Animated.View entering={entering(1)}>
            <FamilyCard
              petNome={activePet.nome}
              onManage={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/premium');
              }}
            />
          </Animated.View>

          <Animated.View entering={entering(2)}>
            <PetsCard
              onAddPet={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/add-pet');
              }}
            />
          </Animated.View>

          <Animated.View entering={entering(3)}>
            <AppearanceCard />
          </Animated.View>

          <Animated.View entering={entering(4)}>
            <NotificationsCard />
          </Animated.View>

          <Animated.View entering={entering(5)}>
            <InsightsSettingsCard />
          </Animated.View>

          <Animated.View entering={entering(6)}>
            <AboutCard onReplayTour={handleReplayTour} />
          </Animated.View>

          <Animated.View entering={entering(7)}>
            <DangerZone
              onSignOut={handleSignOut}
              onDeleteAccount={handleDeleteAccount}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Encapsula confirms LGPD-compliant + chamadas Supabase do
 * SignOut/DeleteAccount. Extraído pra manter SettingsScreen ≤150L.
 * Não vira hook reutilizável fora daqui — é só helper de organização.
 */
function useAccountActions(
  router: ReturnType<typeof useRouter>,
  resetStore: () => void,
) {
  const handleDeleteAccount = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Excluir minha conta',
      'Isso irá remover permanentemente:\n\n' +
      '• Perfil do seu pet (nome, foto, raça, etc.)\n' +
      '• Todo o histórico de registros e fotos\n' +
      '• Vacinas, consultas, ocorrências, peso\n' +
      '• Sua conta CronoPet (e-mail e identificadores)\n' +
      '• Dados sincronizados em nuvem (se tiver Pro)\n' +
      '• Chave de criptografia local\n\n' +
      'Dados em servidor são apagados em até 30 dias. Esta ação NÃO pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: async () => {
            try { await deleteRemoteAccount(); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'deleteAccount.remote' } }); }
            try { await signOut(); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'deleteAccount.signOut' } }); }
            resetStore();
            clearSupabaseAuthStorage();
            try { await SecureStore.deleteItemAsync('cronopet.mmkv.encryption-key.v1'); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'deleteAccount.secureStore' } }); }
            router.replace('/onboarding');
          },
        },
      ],
    );
  }, [resetStore, router]);

  const handleSignOut = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sair da conta',
      'Você vai precisar fazer login de novo pra acessar o app. Seus dados ficam guardados na nuvem.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try { await signOut(); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'signOut' } }); }
            router.replace('/auth');
          },
        },
      ],
    );
  }, [router]);

  return { handleSignOut, handleDeleteAccount };
}

const s = StyleSheet.create({
  scroll:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  h1:        { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 32, letterSpacing: -1.2, marginTop: 6 },
});
