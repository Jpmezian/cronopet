import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface StatusTheme {
  primary: string;
  bg:      string;
  border:  string;
}

interface CalorieBadgeProps {
  intake:      number;   // kcal consumidas
  recommended: number;   // kcal meta
  burned?:     number;   // kcal queimadas em passeio (opcional)
  status:      string;   // mensagem contextual
  statusTheme: StatusTheme;
}

/**
 * Bloco reutilizável que mostra as métricas de calorias (ingestão,
 * recomendado, queimadas) + badge de status colorido.
 * Usado em WellnessCard e no cabeçalho da tela de nutrição.
 */
export function CalorieBadge({
  intake,
  recommended,
  burned,
  status,
  statusTheme,
}: CalorieBadgeProps) {
  const T = useTheme();

  return (
    <View>
      {/* Métricas */}
      <View style={{ marginBottom: 14 }}>
        <MetricRow
          emoji="🍖"
          label="Ingestão"
          value={`${intake.toLocaleString('pt-BR')} kcal`}
          colors={{ textPrimary: T.ink, textSecondary: T.ink2 }}
        />
        <View style={{ height: 8 }} />
        <MetricRow
          emoji="📊"
          label="Recomendado"
          value={`${recommended.toLocaleString('pt-BR')} kcal`}
          colors={{ textPrimary: T.ink, textSecondary: T.ink2 }}
        />
        {burned !== undefined && burned > 0 && (
          <>
            <View style={{ height: 8 }} />
            <MetricRow
              emoji="🐾"
              label="Queimadas (passeio)"
              value={`${burned.toLocaleString('pt-BR')} kcal`}
              colors={{ textPrimary: T.ink, textSecondary: T.ink2 }}
            />
          </>
        )}
      </View>

      {/* Status badge */}
      <View style={{
        backgroundColor: statusTheme.bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: statusTheme.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <Text style={{ color: statusTheme.primary, fontWeight: '600', fontSize: 13 }}>
          {status}
        </Text>
      </View>
    </View>
  );
}

// ─── Sub-componente interno ──────────────────────────────────

interface MetricRowProps {
  emoji: string;
  label: string;
  value: string;
  colors: { textSecondary: string; textPrimary: string };
}

function MetricRow({ emoji, label, value, colors }: MetricRowProps) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        {emoji} {label}
      </Text>
      <Text style={{
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
      }}>
        {value}
      </Text>
    </View>
  );
}
