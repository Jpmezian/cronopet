/**
 * components/home/HealthInsightsCard.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Renderiza até 3 insights de saúde priorizados pelo motor heurístico
 * (services/HealthInsights.ts). Cada insight tem dismiss persistente.
 *
 * Princípios:
 *   • NUNCA usa palavras de diagnóstico — sempre "possível", "pode ser",
 *     "considere", e fecha com "consulte o veterinário"
 *   • Severity bate com tokens semantic do design system (info/warning/error)
 *   • Acessível: cada card é um button com label completo + hint
 *   • Animado via useMotion() pra respeitar Reduced Motion
 *
 * Não chama analyzeHealth aqui — recebe os insights já calculados pelo caller
 * (mais fácil testar, evita re-render quando algo do estado muda mas insights
 * já estão memoizados).
 */

import React, { useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle, Info, AlertCircle, X, HeartPulse,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { useMotion } from '@/hooks/useMotion';
import { semantic } from '@/constants/colors';
import type { HealthInsight, InsightSeverity } from '@/services/HealthInsights';

interface Props {
  insights: HealthInsight[];
  onDismiss: (id: string) => void;
  /** Quantos mostrar (default 3) */
  limit?: number;
}

interface SevTheme {
  primary: string;
  bg: string;
  border: string;
  text: string;
}

const SEV_THEME: Record<InsightSeverity, SevTheme> = {
  info:    semantic.info,
  warning: semantic.warning,
  alert:   semantic.error,
};

const SEV_ICON: Record<InsightSeverity, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  info:    Info,
  warning: AlertTriangle,
  alert:   AlertCircle,
};

const SEV_LABEL: Record<InsightSeverity, string> = {
  info:    'Aviso',
  warning: 'Atenção',
  alert:   'Importante',
};

export function HealthInsightsCard({ insights, onDismiss, limit = 3 }: Props) {
  const { colors, isDark } = useThemeColors();
  const { entering } = useMotion();

  const visible = insights.slice(0, limit);

  const handleDismiss = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(id);
  }, [onDismiss]);

  if (visible.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {/* Header da seção */}
      <View
        accessible
        accessibilityRole="header"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}
      >
        <HeartPulse size={16} color={colors.textSecondary} strokeWidth={2.4} />
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.8,
          color: colors.textSecondary,
          textTransform: 'uppercase',
        }}>
          Sinais de saúde
        </Text>
      </View>

      {visible.map((ins, idx) => (
        <Animated.View key={ins.id} entering={entering(idx)}>
          <InsightItem
            insight={ins}
            isDark={isDark}
            onDismiss={() => handleDismiss(ins.id)}
          />
        </Animated.View>
      ))}

      {/* Disclaimer fixo */}
      <Text
        accessible
        accessibilityLabel="Aviso: estas observações não substituem avaliação veterinária"
        style={{
          fontSize: 11,
          color: colors.textTertiary,
          paddingHorizontal: 4,
          marginTop: 2,
          fontStyle: 'italic',
        }}
      >
        Não é diagnóstico. Consulte sempre o veterinário.
      </Text>
    </View>
  );
}

// ─── Item ──────────────────────────────────────────────────────────────

interface ItemProps {
  insight: HealthInsight;
  isDark: boolean;
  onDismiss: () => void;
}

function InsightItem({ insight, isDark, onDismiss }: ItemProps) {
  const { colors } = useThemeColors();
  const theme = SEV_THEME[insight.severity];
  const Icon  = SEV_ICON[insight.severity];

  // Dark mode: fundos pastéis viram tinted bg como o resto do app
  const bg = isDark
    ? (insight.severity === 'alert'    ? 'rgba(185, 28, 28, 0.18)'
      : insight.severity === 'warning' ? 'rgba(180, 83,  9, 0.18)'
      : 'rgba(29, 78, 216, 0.18)')
    : theme.bg;

  const border = isDark
    ? (insight.severity === 'alert'    ? 'rgba(185, 28, 28, 0.40)'
      : insight.severity === 'warning' ? 'rgba(180, 83,  9, 0.40)'
      : 'rgba(29, 78, 216, 0.40)')
    : theme.border;

  const a11yLabel = `${SEV_LABEL[insight.severity]}: ${insight.title}. ${insight.message} ${insight.suggestion}`;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={a11yLabel}
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
          android: { elevation: 1 },
        }),
      }}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Icon size={18} color={theme.primary} strokeWidth={2.2} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: isDark ? colors.textPrimary : theme.text,
        }}>
          {insight.title}
        </Text>
        <Text style={{
          fontSize: 13,
          color: isDark ? colors.textSecondary : theme.text,
          opacity: isDark ? 1 : 0.85,
          lineHeight: 18,
        }}>
          {insight.message}
        </Text>
        <Text style={{
          fontSize: 12,
          color: isDark ? colors.textSecondary : theme.text,
          opacity: 0.7,
          marginTop: 2,
        }}>
          {insight.suggestion}
        </Text>
      </View>

      <ScalePress
        accessibilityRole="button"
        accessibilityLabel="Dispensar aviso"
        accessibilityHint="Remove este aviso da lista"
        onPress={onDismiss}
        style={{
          width: 28, height: 28, borderRadius: 14,
          alignItems: 'center', justifyContent: 'center',
          marginTop: -2,
        }}
      >
        <X size={16} color={colors.textTertiary} strokeWidth={2} />
      </ScalePress>
    </View>
  );
}
