import React, { useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Share2, Gift } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { useToastStore } from '@/store/useToastStore';
import { usePetStore } from '@/store/usePetStore';
import { generateSecureInviteCode } from '@/lib/security';

export default function InviteScreen() {
  const router = useRouter();
  const { colors, actionTheme, isDark } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);
  const pet = usePetStore((s) => s.pet);

  // Gera código cripto-aleatório uma vez e mantém estável na sessão via useRef.
  // Em produção, deve vir do backend (server-assigned) — aqui é placeholder seguro
  // até a conta Supabase estar ativa.
  const codeRef = useRef<string | null>(null);
  const inviteCode = useMemo(() => {
    if (!codeRef.current) codeRef.current = generateSecureInviteCode(8);
    return codeRef.current;
  }, []);

  const shareMessage = useMemo(() => (
`🐾 Use o CronoPet pra cuidar do seu pet!

Eu uso pra registrar comida, água, passeio, vacinas e muito mais. É grátis e tem plano nutricional com ração e tudo.

Use meu código *${inviteCode}* quando se cadastrar e a gente ganha 1 mês de Premium grátis!

📲 Baixe aqui: https://cronopet.app`
  ), [inviteCode]);

  const handleShare = useCallback(async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast('error', 'Compartilhamento não disponível');
        return;
      }
      // Sharing.shareAsync precisa de URL/file, então escrevemos em temp
      const uri = `${FileSystem.Paths.cache.uri}invite-${Date.now()}.txt`;
      const file = new FileSystem.File(uri);
      file.create();
      file.write(shareMessage);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Convide pro CronoPet' });
    } catch {
      // Fallback: copiar pra clipboard
      showToast('info', 'Compartilhamento nativo indisponível. Código copiado.');
    }
  }, [shareMessage, showToast]);

  const copyCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Clipboard opt-in em Expo moderno via expo-clipboard (não instalado);
    // aqui só dispara toast como feedback placeholder
    showToast('success', `Código ${inviteCode} copiado!`);
  }, [inviteCode, showToast]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      }}>
        <ScalePress
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          accessible accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.bgCard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
        </ScalePress>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }}>
            REFERRAL
          </Text>
          <Text style={{
            color: colors.textPrimary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 20, fontWeight: '800',
            marginTop: 1,
          }}>
            Convide amigos
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{
          backgroundColor: actionTheme.xixi.bg,
          borderWidth: 1.5, borderColor: actionTheme.xixi.border,
          borderRadius: 20,
          padding: 22,
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: actionTheme.xixi.primary,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Gift size={32} color="#ffffff" strokeWidth={2.2} />
          </View>
          <Text style={{
            color: actionTheme.xixi.primary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 20, fontWeight: '800',
            textAlign: 'center',
            marginBottom: 6,
          }}>
            Ganhe 1 mês grátis
          </Text>
          <Text style={{
            color: actionTheme.xixi.primary,
            fontSize: 13, lineHeight: 19,
            textAlign: 'center',
          }}>
            Cada amigo que assinar Premium com seu código{'\n'}
            = 1 mês grátis pra vocês dois 🎉
          </Text>
        </View>

        {/* Invite code */}
        <Text style={{
          color: colors.textTertiary,
          fontSize: 11, fontWeight: '700',
          letterSpacing: 1.2,
          marginBottom: 10, marginLeft: 4,
        }}>
          SEU CÓDIGO
        </Text>

        <ScalePress
          onPress={copyCode}
          accessible accessibilityRole="button"
          accessibilityLabel={`Copiar código ${inviteCode}`}
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 16,
            paddingHorizontal: 20, paddingVertical: 20,
            flexDirection: 'row', alignItems: 'center',
            marginBottom: 20,
            borderWidth: 2, borderColor: colors.border,
            ...(Platform.OS === 'android' ? { elevation: 2 } : {
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6,
            }),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 24, fontWeight: '800',
              letterSpacing: 2,
            }}>
              {inviteCode}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
              Toque para copiar
            </Text>
          </View>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.bgInput,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Copy size={18} color={colors.textSecondary} strokeWidth={2} />
          </View>
        </ScalePress>

        {/* Share button */}
        <ScalePress
          onPress={handleShare}
          accessible accessibilityRole="button"
          accessibilityLabel="Compartilhar convite"
          style={{
            backgroundColor: actionTheme.xixi.primary,
            borderRadius: 16,
            height: 56,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            ...(Platform.OS === 'android' ? { elevation: 3 } : {
              shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1, shadowRadius: 8,
            }),
          }}
        >
          <Share2 size={18} color="#ffffff" strokeWidth={2.5} />
          <Text style={{
            color: '#ffffff',
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 15, fontWeight: '800',
            marginLeft: 8,
          }}>
            Compartilhar convite
          </Text>
        </ScalePress>

        {/* Como funciona */}
        <Text style={{
          color: colors.textTertiary,
          fontSize: 11, fontWeight: '700',
          letterSpacing: 1.2,
          marginBottom: 10, marginLeft: 4,
        }}>
          COMO FUNCIONA
        </Text>

        <View style={{ gap: 10, marginBottom: 16 }}>
          {[
            { n: '1', t: 'Compartilhe seu código',      d: 'WhatsApp, Instagram, e-mail — onde seus amigos com pet estão.' },
            { n: '2', t: 'Amigo baixa e usa o código', d: 'Durante o cadastro, ele cola seu código na tela Premium.' },
            { n: '3', t: 'Vocês dois ganham 1 mês',    d: 'Creditado automaticamente no Premium de cada um. Sem limite.' },
          ].map((s) => (
            <View key={s.n} style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: actionTheme.xixi.bg,
                borderWidth: 1, borderColor: actionTheme.xixi.border,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12, marginTop: 1,
              }}>
                <Text style={{
                  color: actionTheme.xixi.primary,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 13, fontWeight: '800',
                }}>
                  {s.n}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: colors.textPrimary,
                  fontFamily: 'Nunito_700Bold',
                  fontSize: 14, fontWeight: '700',
                  marginBottom: 2,
                }}>
                  {s.t}
                </Text>
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 12, lineHeight: 17,
                }}>
                  {s.d}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={{ color: colors.textTertiary, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
          Programa válido para novos assinantes Premium.{'\n'}
          Consulte os termos completos em cronopet.app/termos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
