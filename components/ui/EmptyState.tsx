import React, { type ComponentType } from 'react';
import { View, Text, Platform } from 'react-native';
import { ScalePress } from './ScalePress';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface IconProps { size?: number; color?: string; strokeWidth?: number }

interface EmptyStateProps {
  /** Ícone Lucide. Migração 2026-05-15 — emojis fora. */
  Icon?: ComponentType<IconProps>;
  /** @deprecated use Icon. */
  emoji?: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Cor primária do CTA e ícone — padrão: ACTIONS_V3.passeio.primary */
  accentColor?: string;
  /** Fundo do chip do ícone — padrão: ACTIONS_V3.passeio.tintL */
  accentBg?: string;
}

/**
 * Empty state charmoso com paleta pastel, mensagem amigável e CTA opcional.
 * Usar em todas as listas/abas sem dados.
 */
export function EmptyState({
  Icon,
  emoji,
  title,
  subtitle,
  ctaLabel,
  onCta,
  accentColor,
  accentBg,
}: EmptyStateProps) {
  const T = useTheme();

  // Fallback semântico: cores de "passeio" (verde) como neutro positivo
  const resolvedAccentColor = accentColor ?? ACTIONS_V3.passeio.primary;
  const resolvedAccentBg    = accentBg    ?? ACTIONS_V3.passeio.tintL;

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCta?.();
  };

  return (
    <View
      style={{
        backgroundColor: T.card,
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
      {/* Ícone dentro de bolha — Lucide ou fallback emoji legado */}
      <View
        style={{
          backgroundColor: resolvedAccentBg,
          borderRadius: 24,
          width: 72,
          height: 72,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {Icon ? (
          <Icon size={32} strokeWidth={2} color={resolvedAccentColor} />
        ) : emoji ? (
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        ) : null}
      </View>

      <Text
        style={{
          color: T.ink,
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
          color: T.ink2,
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
