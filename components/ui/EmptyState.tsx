import React from 'react';
import { View, Text, Platform } from 'react-native';
import { ScalePress } from './ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Cor primária do CTA e ícone — padrão: actionTheme.passeio.primary */
  accentColor?: string;
  /** Fundo da bolha do emoji — padrão: actionTheme.passeio.bg */
  accentBg?: string;
}

/**
 * Empty state charmoso com paleta pastel, mensagem amigável e CTA opcional.
 * Usar em todas as listas/abas sem dados.
 */
export function EmptyState({
  emoji,
  title,
  subtitle,
  ctaLabel,
  onCta,
  accentColor,
  accentBg,
}: EmptyStateProps) {
  const { colors, actionTheme } = useThemeColors();

  // Fallback semântico: cores de "passeio" (verde) como neutro positivo
  const resolvedAccentColor = accentColor ?? actionTheme.passeio.primary;
  const resolvedAccentBg    = accentBg    ?? actionTheme.passeio.bg;

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCta?.();
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 36,
        alignItems: 'center',
        ...(Platform.OS === 'android'
          ? { elevation: 2 }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }),
      }}
    >
      {/* Emoji dentro de bolha pastel */}
      <View
        style={{
          backgroundColor: resolvedAccentBg,
          borderRadius: 28,
          width: 72,
          height: 72,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
      </View>

      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 16,
          fontFamily: 'Nunito_700Bold',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
          marginBottom: ctaLabel ? 20 : 0,
        }}
      >
        {subtitle}
      </Text>

      {ctaLabel && onCta && (
        <ScalePress
          onPress={handleCta}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <View
            style={{
              backgroundColor: resolvedAccentColor,
              borderRadius: 14,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontFamily: 'Nunito_700Bold',
              }}
            >
              {ctaLabel}
            </Text>
          </View>
        </ScalePress>
      )}
    </View>
  );
}
