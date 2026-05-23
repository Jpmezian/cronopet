import React from 'react';
import { View, Text, Platform } from 'react-native';
import { ShieldCheck, BookOpen, Calendar } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FOODS_DB_UPDATED_AT } from '@/data/foods';

/**
 * Banner de confiança que vai acima da lista de rações recomendadas.
 *
 * Feedback TestFlight (#9 + #10): usuários sentiam falta de algo
 * que reforçasse que (a) o app não tem parceria comercial com nenhuma
 * marca e (b) as recomendações vêm de uma metodologia auditável. O
 * disclaimer minúsculo no rodapé não passava confiança.
 *
 * Agora: 3 chips visuais no topo deixando explícito antes da lista —
 *   • Sem parceria comercial (sem afiliação, sem comissão)
 *   • Metodologia NRC + FEDIAF (fontes científicas reconhecidas)
 *   • Data da última atualização do banco de dados de rações
 *
 * Continua usando a paleta `actionTheme.passeio` (verde — "seguro/ok")
 * em vez de uma cor de alerta, porque é informação afirmativa, não aviso.
 */
export function NutritionTrustBanner() {
  const { colors, actionTheme, isDark } = useThemeColors();

  const chipBg = isDark
    ? 'rgba(4, 120, 87, 0.18)'
    : actionTheme.passeio.bg;
  const chipBorder = actionTheme.passeio.border;
  const chipFg = actionTheme.passeio.primary;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Transparência: CronoPet não tem parceria comercial com nenhuma marca de ração. Recomendações baseadas em metodologia NRC e FEDIAF. Banco de rações atualizado em ${FOODS_DB_UPDATED_AT}.`}
      style={{
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: chipBorder,
        borderRadius: 16,
        padding: 14,
        gap: 10,
        ...(Platform.OS === 'android' ? { elevation: 1 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.18 : 0.04, shadowRadius: 4,
        }),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={16} color={chipFg} strokeWidth={2.2} />
        <Text style={{
          color: chipFg,
          fontFamily: 'Nunito_700Bold',
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.2,
        }}>
          Transparência sobre as recomendações
        </Text>
      </View>

      <Row
        Icon={ShieldCheck}
        bg={chipBg}
        fg={chipFg}
        primary="Sem parceria comercial"
        secondary="CronoPet não é afiliado a nenhuma marca de ração. Não recebemos comissão por nada que aparece aqui."
        colors={colors}
      />

      <Row
        Icon={BookOpen}
        bg={chipBg}
        fg={chipFg}
        primary="Baseado em NRC 2006 + FEDIAF"
        secondary="Cálculo calórico segue o National Research Council. Recomendações de porções seguem diretrizes da FEDIAF (federação europeia de alimentos pra pet)."
        colors={colors}
      />

      <Row
        Icon={Calendar}
        bg={chipBg}
        fg={chipFg}
        primary={`Banco atualizado em ${FOODS_DB_UPDATED_AT}`}
        secondary="Preços e composições verificados manualmente. Variam por região e ponto de venda — use como referência inicial."
        colors={colors}
      />
    </View>
  );
}

function Row({
  Icon, bg, fg, primary, secondary, colors,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  bg: string;
  fg: string;
  primary: string;
  secondary: string;
  colors: { textPrimary: string; textSecondary: string };
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        <Icon size={14} color={fg} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: colors.textPrimary,
          fontFamily: 'Nunito_700Bold',
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 17,
        }}>
          {primary}
        </Text>
        <Text style={{
          color: colors.textSecondary,
          fontSize: 12,
          lineHeight: 16,
          marginTop: 2,
        }}>
          {secondary}
        </Text>
      </View>
    </View>
  );
}
