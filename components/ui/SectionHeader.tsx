import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface SectionHeaderProps {
  title: string;
  /** @deprecated Sub-fase 0c removeu border bottom + sublinha visual.
   *  Subtitle continua renderizando por back-compat com Home + Nutrição
   *  até as fases respectivas migrarem. Será removido na Fase 9. */
  subtitle?: string;
  /** Cor opcional do título. Default `T.ink`. Usado pra accent contextual. */
  accent?: string;
  /** Label do link "ver tudo" à direita (briefing 03 § Componentes).
   *  Se ausente, link não renderiza. */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Estilo extra do wrapper. */
  style?: ViewStyle;
}

/**
 * Header de seção do sistema Bold v3 (briefing 03 § Tipografia).
 *
 * Refactor in-place 2026-06-14 (sub-fase 0c):
 *   • fontSize 18 → 21
 *   • fontFamily 'Nunito_800ExtraBold' → system bold
 *     (Bricolage entra na 0d quando fontes carregarem)
 *   • Remove border bottom (mais Bold v3 — Q-D aprovada)
 *   • Adiciona `actionLabel + onActionPress` ("ver tudo" link)
 *   • Mantém `subtitle` deprecated pra back-compat com Home + Nutrição
 *   • Tokens via `useTheme()` (era `useThemeColors`)
 *
 * Callers atuais (Home, Nutrição) ganham visual novo automaticamente.
 * Telas Bold v3 (Fase 1+) adicionam `actionLabel="Ver tudo"` quando
 * apropriado.
 */
export const SectionHeader = React.memo(function SectionHeader({
  title,
  subtitle,
  accent,
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  const T = useTheme();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[{ marginTop: 4, marginBottom: 10 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            // Bricolage Grotesque 21 800 -0.6 (briefing 03 § Escala — "Título de seção")
            fontFamily:    'BricolageGrotesque_800ExtraBold',
            color:         accent ?? T.ink,
            fontSize:      21,
            fontWeight:    '800',
            letterSpacing: -0.6,
            flex:          1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {actionLabel && onActionPress && (
          <ScalePress
            onPress={onActionPress}
            accessible
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            accessibilityHint="Abre a tela completa da seção"
            hitSlop={8}
          >
            <Text
              style={{
                // Hanken 13 700 (briefing 03 § Caption)
                fontFamily: 'HankenGrotesk_700Bold',
                color:      T.primary,
                fontSize:   13,
                fontWeight: '700',
              }}
            >
              {actionLabel}
            </Text>
          </ScalePress>
        )}
      </View>

      {!!subtitle && (
        <Text
          style={{
            // Hanken 12 500 — subtitle deprecated
            fontFamily: 'HankenGrotesk_500Medium',
            color:      T.ink3,
            fontSize:   12,
            fontWeight: '500',
            marginTop:  3,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';
