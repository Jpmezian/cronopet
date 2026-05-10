import React from 'react';
import { View, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SectionHeaderProps {
  title:    string;
  subtitle?: string;
  accent?: string;  // cor opcional para o título (default: textPrimary)
}

/**
 * Header de seção reutilizável.
 * Título grande em Nunito 800 + subtítulo opcional em textTertiary.
 * Segue o padrão "HOJE" / "INSIGHTS" / "SAÚDE".
 */
export function SectionHeader({ title, subtitle, accent }: SectionHeaderProps) {
  const { colors } = useThemeColors();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      style={{ marginTop: 4, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{
          color: accent ?? colors.textPrimary,
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 18, fontWeight: '800',
          letterSpacing: 0.3,
        }}>
          {title}
        </Text>
        <View style={{
          flex: 1, height: 1.5,
          backgroundColor: colors.border,
          marginLeft: 12, marginRight: 2,
          borderRadius: 1,
        }} />
      </View>
      {!!subtitle && (
        <Text style={{
          color: colors.textTertiary,
          fontSize: 12, fontWeight: '500',
          marginTop: 3,
        }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
