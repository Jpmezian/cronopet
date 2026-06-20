import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ModalShell } from '@/components/chrome/ModalShell';
import { Button } from '@/components/ui/Button';
import { ScalePress } from './ScalePress';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { requestPermissionsAsync } from '@/services/NotificationService';

interface NotificationAskSheetProps {
  visible:   boolean;
  petNome:   string;
  /** Chamado após o sistema responder. `granted` é o status real. */
  onConfirm: (granted: boolean) => void;
  onDismiss: () => void;
}

/**
 * "Soft Ask" de permissão de notificações — migrado pra ModalShell
 * Bold v3 (Fase 8, prova de uso F8-Q3).
 *
 * Aparece ANTES do dialog nativo iOS/Android, contextualizando o valor
 * da permissão (Neurodesign: valor percebido antes da fricção). Gatilho
 * ideal: logo após primeira meta diária completa.
 *
 * Visual migrado:
 *   • Backdrop + sheet + alça + close X agora vem do ModalShell
 *   • Ícone Bell box sobre T.surfaceTint
 *   • Título via prop title (Bricolage 26 — antes Nunito 22)
 *   • CTA via Button primitivo variant=primary
 *   • Ghost dismiss preservado
 */
export function NotificationAskSheet({
  visible, petNome, onConfirm, onDismiss,
}: NotificationAskSheetProps) {
  const T = useTheme();

  useEffect(() => {
    if (visible) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visible]);

  const handleConfirm = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* haptics opcional */ }
    const granted = await requestPermissionsAsync();
    onConfirm(granted);
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onDismiss}
      title={`Não deixe ${petNome || 'seu pet'} com fome`}
      kicker="Lembretes"
    >
      <View style={s.body}>
        <View
          style={[
            s.iconBox,
            { backgroundColor: T.isDark ? 'rgba(3,105,161,0.18)' : ACTIONS_V3.agua.tintL },
          ]}
        >
          <Bell size={28} strokeWidth={2.2} color={ACTIONS_V3.agua.primary} />
        </View>

        <Text style={[s.sub, { color: T.ink2 }]}>
          Podemos te enviar lembretes suaves quando estiver na hora das refeições e
          passeios.
        </Text>

        <Button
          label="Ativar lembretes"
          onPress={handleConfirm}
          variant="primary"
          fullWidth
          accessibilityHint="Abre a solicitação de permissão de notificações do sistema"
        />

        <ScalePress
          onPress={onDismiss}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Talvez mais tarde"
          style={s.ghost}
        >
          <Text style={[s.ghostLabel, { color: T.ink3 }]}>Talvez mais tarde</Text>
        </ScalePress>
      </View>
    </ModalShell>
  );
}

const s = StyleSheet.create({
  body:       { alignItems: 'center', gap: 18 },
  iconBox:    { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sub:        { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center', marginBottom: 2 },
  ghost:      { paddingVertical: 10 },
  ghostLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
});
