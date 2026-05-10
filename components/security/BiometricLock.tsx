import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Lock, Fingerprint } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { usePetStore } from '@/store/usePetStore';

/**
 * Overlay que pede autenticação biométrica (Face ID / Touch ID) ao abrir
 * o app ou voltar do background. Só renderizado se o usuário ativou
 * `biometricLockEnabled` em Settings.
 *
 * Fluxo:
 *  1. App abre / volta do background → overlay bloqueia a tela
 *  2. Dispara promptAsync do expo-local-authentication
 *  3. Sucesso → overlay some
 *  4. Falha → mostra botão "Tentar novamente"
 *
 * SECURITY:
 *  - Não tem bypass via JS: o overlay cobre 100% da UI com zIndex alto
 *  - Se o device não tem biometria configurada, o overlay é pulado
 *    (feature degradada, não bloqueia o app)
 */

interface BiometricLockProps {
  children: React.ReactNode;
}

type LockState = 'locked' | 'authenticating' | 'unlocked' | 'unsupported';

export function BiometricLock({ children }: BiometricLockProps) {
  const { colors, isDark } = useThemeColors();
  const biometricEnabled = usePetStore((s) => s.biometricLockEnabled);

  const [state, setState] = useState<LockState>(
    biometricEnabled ? 'locked' : 'unlocked',
  );

  const authenticate = useCallback(async () => {
    setState('authenticating');
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setState('unsupported');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloqueie o CronoPet',
        fallbackLabel: 'Use o código',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,  // permite código do aparelho como fallback
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setState('unlocked');
      } else {
        setState('locked');
      }
    } catch {
      setState('locked');
    }
  }, []);

  // Ao montar: se lock está ativo, solicita autenticação imediata
  useEffect(() => {
    if (biometricEnabled) {
      authenticate();
    } else {
      setState('unlocked');
    }
  }, [biometricEnabled, authenticate]);

  // Re-lock ao voltar do background
  useEffect(() => {
    if (!biometricEnabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        setState('locked');
      } else if (next === 'active' && (state === 'locked')) {
        authenticate();
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, state, authenticate]);

  // Se não está habilitado ou device não suporta, só renderiza children
  if (!biometricEnabled || state === 'unlocked' || state === 'unsupported') {
    return <>{children}</>;
  }

  // Overlay bloqueando a UI
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {children}
      <View
        accessible accessibilityRole="none"
        accessibilityLabel="App bloqueado. Autentique para desbloquear."
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bgScreen,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          paddingHorizontal: 40,
        }}
      >
        <View style={{
          width: 96, height: 96, borderRadius: 28,
          backgroundColor: colors.bgCard,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
          ...(Platform.OS === 'android' ? { elevation: 4 } : {
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 12,
          }),
        }}>
          <Lock size={40} color={colors.textPrimary} strokeWidth={2} />
        </View>

        <Text style={{
          color: colors.textPrimary,
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 22, fontWeight: '800',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          CronoPet está bloqueado
        </Text>
        <Text style={{
          color: colors.textSecondary,
          fontSize: 14, textAlign: 'center', lineHeight: 20,
          marginBottom: 28,
        }}>
          Use Face ID ou Touch ID{'\n'}para desbloquear.
        </Text>

        <ScalePress
          onPress={authenticate}
          accessible accessibilityRole="button"
          accessibilityLabel="Desbloquear app"
          style={{
            backgroundColor: colors.textPrimary,
            borderRadius: 16,
            paddingHorizontal: 32, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center',
          }}
        >
          <Fingerprint size={18} color={colors.bgScreen} strokeWidth={2} style={{ marginRight: 8 }} />
          <Text style={{
            color: colors.bgScreen,
            fontFamily: 'Nunito_700Bold',
            fontSize: 15, fontWeight: '700',
          }}>
            {state === 'authenticating' ? 'Autenticando...' : 'Desbloquear'}
          </Text>
        </ScalePress>
      </View>
    </View>
  );
}
