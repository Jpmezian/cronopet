import React, { useEffect } from 'react';
import {
  View, Text, Modal, Platform, Pressable,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { Bell, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { requestPermissionsAsync } from '@/services/NotificationService';

// ─── Props ────────────────────────────────────────────────────

interface NotificationAskSheetProps {
  visible: boolean;
  petNome: string;
  onConfirm: () => void;  // chamado após aceitar (e disparar permissão nativa)
  onDismiss: () => void;  // chamado ao fechar sem aceitar
}

/**
 * "Soft Ask" de permissão de notificações.
 *
 * Aparece ANTES do dialog nativo do iOS/Android, contextualizando o valor
 * da permissão (Princípio de Neurodesign: valor percebido antes da fricção).
 *
 * Gatilho ideal: logo após o usuário completar a primeira meta diária
 * (DailyProgress onFirstComplete callback).
 */
export function NotificationAskSheet({
  visible,
  petNome,
  onConfirm,
  onDismiss,
}: NotificationAskSheetProps) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestPermissionsAsync();
    onConfirm();
  };

  const overlayColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(28,25,23,0.4)';

  const sheetEnter = isReducedMotion
    ? FadeIn.duration(200)
    : SlideInDown.springify().damping(20).stiffness(280);

  const sheetExit = isReducedMotion
    ? FadeOut.duration(150)
    : SlideOutDown.duration(200);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlayColor }}
        onPress={onDismiss}
      >
        {/* Sheet — Pressable interno para não fechar ao tocar dentro */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={sheetEnter}
            exiting={sheetExit}
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 28,
            }}
          >
            {/* Alça */}
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center', marginBottom: 24,
            }} />

            {/* Ícone */}
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: actionTheme.agua.bg,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, alignSelf: 'center',
            }}>
              <Bell size={28} strokeWidth={2} color={actionTheme.agua.primary} />
            </View>

            {/* Título */}
            <Text style={{
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 22,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: 10,
            }}>
              {`Não deixe ${petNome || 'seu pet'} com fome!`}
            </Text>

            {/* Subtítulo */}
            <Text style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 28,
            }}>
              {'Podemos te enviar lembretes suaves quando estiver na hora das refeições e passeios.'}
            </Text>

            {/* CTA principal */}
            <ScalePress
              onPress={handleConfirm}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ativar lembretes"
              accessibilityHint="Abre a solicitação de permissão de notificações do sistema"
              style={{
                backgroundColor: actionTheme.agua.primary,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 16,
                color: '#ffffff',
              }}>
                Ativar Lembretes
              </Text>
            </ScalePress>

            {/* Botão fantasma */}
            <ScalePress
              onPress={onDismiss}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Talvez mais tarde"
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{
                fontSize: 14,
                color: colors.textTertiary,
                fontWeight: '500',
              }}>
                Talvez mais tarde
              </Text>
            </ScalePress>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
