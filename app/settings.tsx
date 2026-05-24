import React, { useCallback } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Image,
  Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { ChevronLeft, Trash2, Sun, Moon, Monitor, Palette, Sparkles, LogOut } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { openLegal } from '@/lib/legalLinks';
import { signOut, deleteRemoteAccount } from '@/services/AuthService';
import { clearSupabaseAuthStorage } from '@/services/supabase';
import { InsightsSettingsCard } from '@/components/medical/InsightsSettingsCard';

// ─── Semântico fixo ───────────────────────────────────────────
// Cores de status que não variam com o tema
const WARNING = '#d97706';  // amber-600 — alerta / shield ativo
const ERROR   = '#dc2626';  // red-600  — ação destrutiva
const ERROR_2 = '#ef4444';  // red-500  — subtitle destrutivo

// ─── Componente ───────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  const themeMode      = usePetStore((s) => s.themeMode);
  const setThemeMode   = usePetStore((s) => s.setThemeMode);
  const paletteMode    = usePetStore((s) => s.paletteMode);
  const setPaletteMode = usePetStore((s) => s.setPaletteMode);
  const setHasCompletedTour = usePetStore((s) => s.setHasCompletedTour);
  const { colors, actionTheme, isDark } = useThemeColors();

  const notificationHour    = usePetStore((s) => s.notificationHour);
  const notificationMinute  = usePetStore((s) => s.notificationMinute);
  const setNotificationTime = usePetStore((s) => s.setNotificationTime);
  const streakShieldCount   = usePetStore((s) => s.streakShieldCount);
  const streak              = usePetStore((s) => s.streak);
  const resetStore          = usePetStore((s) => s.resetStore);

  // Fundo escuro intencional: visor do horário, badge streak
  // Light → textPrimary (#1c1917); Dark → bgCard (#1c1917 stone-900)
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  // Chevron destrutivo adaptado ao modo
  const errorChevron = isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5';

  const adjustHour = useCallback((delta: number) => {
    const newH = ((notificationHour + delta) + 24) % 24;
    setNotificationTime(newH, notificationMinute);
  }, [notificationHour, notificationMinute, setNotificationTime]);

  const adjustMinute = useCallback((delta: number) => {
    const newM = ((notificationMinute + delta) + 60) % 60;
    setNotificationTime(notificationHour, newM);
  }, [notificationHour, notificationMinute, setNotificationTime]);

  // R-L1: Apple §5.1.1(v) (vigente 30/06/2022) + Google Account
  // Deletion (vigente 31/05/2024) exigem deleção in-app. Renomeado
  // de "Apagar todos os dados" pra "Excluir minha conta" — texto
  // Apple-compliant. Mensagem clara sobre o que acontece COM SERVIDOR
  // (não só local): chama deleteRemoteAccount() que invoca Edge
  // Function pra fazer CASCADE DELETE no Supabase. Best-effort: se
  // Edge Function falhar, ainda assim limpa local + signOut (dados
  // remotos viram órfãos mas inacessíveis sem JWT válido).
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
            // 1) Pede ao backend pra apagar tudo (best-effort).
            //    Se Edge Function não estiver deployada ainda, falha
            //    silenciosa — dados ficam órfãos no Supabase até
            //    purge manual, mas sessão fica deslogada e nenhum
            //    JWT futuro consegue acessar.
            try {
              await deleteRemoteAccount();
            } catch (err) {
              Sentry.captureException(err, { tags: { op: 'deleteAccount.remote' } });
            }

            // 2) Signout do Supabase (invalida session client + server)
            try { await signOut(); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'deleteAccount.signOut' } }); }

            // 3) Limpa storage local criptografado (MMKV + reminders)
            resetStore();

            // 4) Limpa session JWT / refresh token (MMKV auth separado)
            clearSupabaseAuthStorage();

            // 5) Apaga chave de criptografia do Keychain/Keystore
            //    Sem a chave, dados MMKV residuais ficam ilegíveis
            try {
              await SecureStore.deleteItemAsync('cronopet.mmkv.encryption-key.v1');
            } catch (err) {
              Sentry.captureException(err, { tags: { op: 'deleteAccount.secureStore' } });
            }

            router.replace('/onboarding');
          },
        },
      ],
    );
  }, [resetStore, router]);

  // Sprint AUTH Fase 5: signOut simples (sem deletar dados).
  // Sessão é invalidada, dados locais ficam. Próximo cold-start vai
  // bater no auth guard e redirecionar pra /auth.
  const handleSignOut = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sair da conta',
      'Você vai precisar fazer login novamente pra acessar o app. Seus dados ficam preservados.',
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

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      }}>
        <ScalePress
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={{ padding: 6, marginLeft: -6, backgroundColor: colors.bgCard, borderRadius: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voltar para a tela anterior"
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </ScalePress>
        <View>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '500' }}>Configurações</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontFamily: 'Nunito_700Bold', marginTop: -2 }}>Preferências</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 24 }}>

        {/* ── Aparência ───────────────────────────────── */}
        {/* Feedback TestFlight #12: além de claro/escuro o user agora
            escolhe entre paleta CronoPet (brand) ou neutra. Quando
            CronoPet está selecionado, mostra o subseletor light/dark/
            system. Quando neutral está selecionado, a paleta já força
            o modo claro ou escuro — subseletor desaparece. */}
        <View style={{
          backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
          gap: 18,
          ...(Platform.OS === 'android' ? { elevation: 2 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8,
          }),
        }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Palette size={18} color={colors.textPrimary} strokeWidth={2} />
              <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 17 }}>
                Aparência
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 14 }}>
              Escolha o estilo visual do app
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                {
                  mode:    'cronopet' as const,
                  label:   'CronoPet',
                  desc:    'Paleta da marca',
                  swatch:  ['#04A29B', '#9BE4C6', '#E9F1CF'],
                },
                {
                  mode:    'light-neutral' as const,
                  label:   'Claro',
                  desc:    'Cinza neutro',
                  swatch:  ['#FFFFFF', '#F1F5F9', '#0F172A'],
                },
                {
                  mode:    'dark-neutral' as const,
                  label:   'Escuro',
                  desc:    'Cinza neutro',
                  swatch:  ['#0F172A', '#1E293B', '#F8FAFC'],
                },
              ]).map(({ mode, label, desc, swatch }) => {
                const active = paletteMode === mode;
                return (
                  <ScalePress
                    key={mode}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPaletteMode(mode);
                    }}
                    style={{ flex: 1 }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Paleta ${label}, ${desc}${active ? ', selecionada' : ''}`}
                  >
                    <View style={{
                      borderRadius: 14, padding: 10,
                      alignItems: 'center', gap: 8,
                      backgroundColor: active ? colors.bgInput : colors.bgCard,
                      borderWidth: 2,
                      borderColor: active ? colors.tabActive : colors.border,
                    }}>
                      {/* Mini swatch 3 cores */}
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {swatch.map((c, i) => (
                          <View
                            key={i}
                            style={{
                              width: 14, height: 14, borderRadius: 4,
                              backgroundColor: c,
                              borderWidth: 1,
                              borderColor: 'rgba(0,0,0,0.08)',
                            }}
                          />
                        ))}
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 12, fontWeight: '700',
                          color: active ? colors.textPrimary : colors.textSecondary,
                          fontFamily: 'Nunito_700Bold',
                        }}>
                          {label}
                        </Text>
                        <Text style={{
                          fontSize: 10, color: colors.textTertiary,
                          marginTop: 1,
                        }}>
                          {desc}
                        </Text>
                      </View>
                    </View>
                  </ScalePress>
                );
              })}
            </View>
          </View>

          {/* Subseletor claro/escuro só aparece pra paleta CronoPet —
              porque as neutras já fixam o modo. */}
          {paletteMode === 'cronopet' && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
                Modo (CronoPet)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { mode: 'system', Icon: Monitor, label: 'Sistema' },
                  { mode: 'light',  Icon: Sun,     label: 'Claro'   },
                  { mode: 'dark',   Icon: Moon,    label: 'Escuro'  },
                ] as const).map(({ mode, Icon, label }) => {
                  const active = themeMode === mode;
                  return (
                    <ScalePress
                      key={mode}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemeMode(mode);
                      }}
                      style={{ flex: 1 }}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Modo ${label}${active ? ', selecionado' : ''}`}
                    >
                      <View style={{
                        borderRadius: 12, paddingVertical: 10,
                        alignItems: 'center', gap: 4,
                        backgroundColor: active ? colors.textPrimary : colors.bgInput,
                        borderWidth: 1.5,
                        borderColor: active ? colors.textPrimary : colors.border,
                      }}>
                        <Icon size={16} color={active ? colors.bgCard : colors.textSecondary} strokeWidth={2} />
                        <Text style={{
                          fontSize: 11, fontWeight: '600',
                          color: active ? colors.bgCard : colors.textSecondary,
                        }}>
                          {label}
                        </Text>
                      </View>
                    </ScalePress>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── Notificações ────────────────────────────── */}
        <View>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 12 }}>
            🔔 Lembrete diário
          </Text>
          <View style={{
            backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            }),
          }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20, lineHeight: 20 }}>
              Escolha o horário para receber o lembrete diário de registros. O lembrete só aparece se você ainda não completou a rotina.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {/* Hora */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); adjustHour(1); }}
                  style={{ backgroundColor: colors.bgInput, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar hora"
                >
                  <Text style={{ fontSize: 22, color: colors.textPrimary, fontWeight: '700' }}>▲</Text>
                </ScalePress>
                <View style={{
                  backgroundColor: darkCardBg, borderRadius: 14,
                  width: 72, height: 64, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 28, fontFamily: 'Nunito_800ExtraBold' }}>{pad(notificationHour)}</Text>
                </View>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); adjustHour(-1); }}
                  style={{ backgroundColor: colors.bgInput, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir hora"
                >
                  <Text style={{ fontSize: 22, color: colors.textPrimary, fontWeight: '700' }}>▼</Text>
                </ScalePress>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Hora</Text>
              </View>

              <Text style={{ color: colors.textPrimary, fontSize: 36, fontWeight: '700', marginBottom: 20 }}>:</Text>

              {/* Minuto */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); adjustMinute(5); }}
                  style={{ backgroundColor: colors.bgInput, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar minuto"
                >
                  <Text style={{ fontSize: 22, color: colors.textPrimary, fontWeight: '700' }}>▲</Text>
                </ScalePress>
                <View style={{
                  backgroundColor: darkCardBg, borderRadius: 14,
                  width: 72, height: 64, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 28, fontFamily: 'Nunito_800ExtraBold' }}>{pad(notificationMinute)}</Text>
                </View>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); adjustMinute(-5); }}
                  style={{ backgroundColor: colors.bgInput, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir minuto"
                >
                  <Text style={{ fontSize: 22, color: colors.textPrimary, fontWeight: '700' }}>▼</Text>
                </ScalePress>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Min (+5)</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <View style={{ backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
                  Lembrete às {pad(notificationHour)}:{pad(notificationMinute)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Streak / Gamificação ─────────────────────── */}
        <View>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 12 }}>
            🔥 Sequência atual
          </Text>
          <View style={{
            backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 14,
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            }),
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Dias consecutivos</Text>
              <View style={{ backgroundColor: darkCardBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 }}>
                <Text style={{ color: '#ffffff', fontFamily: 'Nunito_800ExtraBold', fontSize: 16 }}>{streak}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Escudos de proteção</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                  Protege contra 1 dia esquecido
                </Text>
              </View>
              <View style={{
                backgroundColor: streakShieldCount > 0 ? actionTheme.comida.bg : colors.bgInput,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4,
              }}>
                <Text style={{
                  color: streakShieldCount > 0 ? WARNING : colors.textTertiary,
                  fontFamily: 'Nunito_800ExtraBold', fontSize: 16,
                }}>
                  {streakShieldCount > 0 ? `🛡️ ${streakShieldCount}` : '0'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Avisos de saúde (insights) ───────────────── */}
        <View>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 12 }}>
            🩺 Avisos de saúde
          </Text>
          <InsightsSettingsCard />
        </View>

        {/* ── Privacidade e Dados ──────────────────────── */}
        <View>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 12 }}>
            🔐 Privacidade e Dados
          </Text>
          <View style={{
            backgroundColor: colors.bgCard, borderRadius: 20, overflow: 'hidden',
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            }),
          }}>
            <View style={{
              padding: 20,
              backgroundColor: actionTheme.passeio.bg,
              borderBottomWidth: 1, borderBottomColor: actionTheme.passeio.border,
            }}>
              <Text style={{ color: actionTheme.passeio.primary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                ✅ Seus dados são seus
              </Text>
              <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, lineHeight: 20 }}>
                Todos os dados do CronoPet ficam armazenados somente no seu dispositivo. Nenhuma informação é enviada para servidores externos. As fotos têm os metadados de localização (EXIF) removidos automaticamente.
              </Text>
            </View>
            <ScalePress
              onPress={handleSignOut}
              style={{
                padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              accessibilityHint="Desconecta sua conta. Dados ficam preservados."
            >
              <LogOut size={18} color={colors.textSecondary} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Sair da conta</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>Desconecta sua sessão. Você poderá fazer login de novo a qualquer hora.</Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 16 }}>›</Text>
            </ScalePress>
            <ScalePress
              onPress={handleDeleteAccount}
              style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Excluir minha conta"
              accessibilityHint="Remove permanentemente todos os dados deste app e do servidor"
            >
              <Trash2 size={18} color={ERROR} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: ERROR, fontWeight: '700', fontSize: 14 }}>Excluir minha conta</Text>
                <Text style={{ color: ERROR_2, fontSize: 12, marginTop: 2 }}>Apaga perfil, histórico, fotos e dados em nuvem permanentemente</Text>
              </View>
              <Text style={{ color: errorChevron, fontSize: 16 }}>›</Text>
            </ScalePress>
          </View>
        </View>

        {/* ── Sobre ───────────────────────────────────── */}
        <View>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 12 }}>
            📋 Sobre
          </Text>
          <View style={{
            backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 12,
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            }),
          }}>
            {/* Brand mark — feedback R2-8 (UX research): logo NÃO vai
                em chrome interno (tab bar, header), mas Settings>Sobre
                é o lugar canônico. Strava/Linear/Apple Health seguem
                esse mesmo padrão. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 44, height: 44, borderRadius: 12 }}
                resizeMode="cover"
                accessible
                accessibilityRole="image"
                accessibilityLabel="Logo CronoPet"
              />
              <View>
                <Text style={{
                  color: colors.textPrimary,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 17, fontWeight: '800',
                }}>
                  CronoPet
                </Text>
                <Text style={{
                  color: colors.textTertiary, fontSize: 12,
                }}>
                  cronopet.app
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Versão</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>1.0.0</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <ScalePress
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHasCompletedTour(false);
                router.push('/(tabs)');
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Ver tour de boas-vindas novamente"
              accessibilityHint="Reabre o tutorial inicial com as principais funcionalidades"
              style={{
                flexDirection: 'row', alignItems: 'center',
                gap: 10, paddingVertical: 4,
              }}
            >
              <Sparkles size={16} color={colors.tabActive} strokeWidth={2.2} />
              <Text style={{ color: colors.tabActive, fontSize: 14, fontWeight: '600' }}>
                Ver tour de boas-vindas
              </Text>
            </ScalePress>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            {/* L6: links legais — abrem no browser (URLs em
                lib/legalLinks.ts). Placeholder até cronopet.com.br
                hospedar os docs reais. */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Documentos legais
              </Text>
              <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLegal('terms'); }}
                  accessible accessibilityRole="button"
                  accessibilityLabel="Abrir Termos de Uso no navegador"
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ color: colors.tabActive, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    Termos de Uso
                  </Text>
                </ScalePress>
                <ScalePress
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLegal('privacy'); }}
                  accessible accessibilityRole="button"
                  accessibilityLabel="Abrir Política de Privacidade no navegador"
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ color: colors.tabActive, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    Política de Privacidade
                  </Text>
                </ScalePress>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 20 }}>
              O CronoPet é um aplicativo informativo e organizativo. <Text style={{ fontWeight: '700' }}>NÃO substitui consulta veterinária presencial.</Text> Health Insights, plano nutricional e recomendações de ração têm caráter exclusivamente educativo. Decisões clínicas, terapêuticas ou nutricionais são de responsabilidade do tutor em conjunto com médico-veterinário inscrito no CRMV.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
