import React, { useCallback } from 'react';
import {
  View, Text, SafeAreaView, ScrollView,
  Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePetStore } from '@/store/usePetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { ChevronLeft, Trash2, Sun, Moon, Monitor } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { signOut } from '@/services/AuthService';
import { clearSupabaseAuthStorage } from '@/services/supabase';

// ─── Semântico fixo ───────────────────────────────────────────
// Cores de status que não variam com o tema
const WARNING = '#d97706';  // amber-600 — alerta / shield ativo
const ERROR   = '#dc2626';  // red-600  — ação destrutiva
const ERROR_2 = '#ef4444';  // red-500  — subtitle destrutivo

// ─── Componente ───────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  const themeMode    = usePetStore((s) => s.themeMode);
  const setThemeMode = usePetStore((s) => s.setThemeMode);
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

  const handleDeleteAllData = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Apagar todos os dados',
      'Isso irá remover permanentemente:\n\n• Perfil do seu pet\n• Todo o histórico de registros\n• Vacinas e consultas\n• Fotos armazenadas\n• Sessão de autenticação\n• Chave de criptografia local\n\nEsta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            // LGPD/GDPR right-to-be-forgotten:
            // 1) Signout do Supabase (invalida session no backend)
            try { await signOut(); }
            catch (err) { Sentry.captureException(err, { tags: { op: 'deleteAllData.signOut' } }); }

            // 2) Limpa storage local criptografado (MMKV + reminders)
            resetStore();

            // 3) Limpa session JWT / refresh token (MMKV auth separado)
            clearSupabaseAuthStorage();

            // 4) Apaga chave de criptografia do Keychain/Keystore
            //    Sem a chave, dados MMKV residuais ficam ilegíveis
            try {
              await SecureStore.deleteItemAsync('cronopet.mmkv.encryption-key.v1');
            } catch (err) {
              Sentry.captureException(err, { tags: { op: 'deleteAllData.secureStore' } });
            }

            router.replace('/onboarding');
          },
        },
      ],
    );
  }, [resetStore, router]);

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
        <View style={{
          backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
          ...(Platform.OS === 'android' ? { elevation: 2 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8,
          }),
        }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_700Bold', fontSize: 17, marginBottom: 16 }}>
            Aparência
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
                  accessibilityLabel={`Tema ${label}${active ? ', selecionado' : ''}`}
                >
                  <View style={{
                    borderRadius: 14, paddingVertical: 12,
                    alignItems: 'center', gap: 6,
                    backgroundColor: active ? colors.textPrimary : colors.bgInput,
                    borderWidth: 2,
                    borderColor: active ? colors.textPrimary : colors.border,
                  }}>
                    <Icon size={20} color={active ? '#ffffff' : colors.textSecondary} strokeWidth={2} />
                    <Text style={{
                      fontSize: 12, fontWeight: '600',
                      color: active ? '#ffffff' : colors.textSecondary,
                    }}>
                      {label}
                    </Text>
                  </View>
                </ScalePress>
              );
            })}
          </View>
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
              onPress={handleDeleteAllData}
              style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Apagar todos os dados"
            >
              <Trash2 size={18} color={ERROR} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: ERROR, fontWeight: '700', fontSize: 14 }}>Apagar todos os dados</Text>
                <Text style={{ color: ERROR_2, fontSize: 12, marginTop: 2 }}>Remove perfil, histórico, vacinas e consultas</Text>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Versão</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>1.0.0</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 20 }}>
              O CronoPet não se responsabiliza pela saúde do seu animal e não substitui a avaliação de um médico veterinário. Este app é apenas um apoio para organizar a rotina e informações do seu pet.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
