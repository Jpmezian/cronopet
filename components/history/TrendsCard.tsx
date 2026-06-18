import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Stamp } from '@/components/ui/Stamp';
import { MiniBars } from '@/components/ui/MiniBars';
import { DeltaIndicator } from '@/components/history/DeltaIndicator';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import type { Trend } from '@/hooks/useHistoryData';

interface TrendsCardProps {
  /** Trends das ações tracked. Ordem preservada do hook. */
  trends: Trend[];
}

/**
 * TrendsCard Bold v3 (briefing 07 § TrendsCard).
 *
 * Card branco com rows separados por T.rule. Cada row:
 *   Stamp 44 solid · titulo + avg + unit · MiniBars · Delta
 *
 * Cores das MiniBars: vêm de `ACTIONS_V3[key].primary` — match com a
 * primária da própria ação (água azul, comida laranja, passeio verde).
 * Zero hardcode: tokens semânticos.
 */
export const TrendsCard = React.memo(function TrendsCard({ trends }: TrendsCardProps) {
  return (
    <Card padding={20}>
      {trends.map((t, i) => (
        <TrendRow
          key={t.key}
          trend={t}
          isLast={i === trends.length - 1}
        />
      ))}
    </Card>
  );
});

TrendsCard.displayName = 'TrendsCard';

// ─── Row ──────────────────────────────────────────────────────

interface TrendRowProps {
  trend:  Trend;
  isLast: boolean;
}

const TrendRow = React.memo(function TrendRow({ trend, isLast }: TrendRowProps) {
  const T = useTheme();
  const actionColor = ACTIONS_V3[trend.key].primary;

  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               14,
        paddingVertical:   15,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: T.rule,
      }}
      accessible
      accessibilityLabel={
        `${trend.title}. ${trend.avg} ${trend.unit} por dia em média. ` +
        `Delta de ${trend.delta} vs semana anterior.`
      }
    >
      {/* Stamp solid da ação */}
      <Stamp glyph={trend.key} size="md" tint="solid" />

      {/* Textos */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily:    'HankenGrotesk_800ExtraBold',
            fontSize:      11,
            fontWeight:    '800',
            color:         T.ink3,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
          numberOfLines={1}
        >
          {trend.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <Text
            style={{
              fontFamily:    'BricolageGrotesque_800ExtraBold',
              fontWeight:    '800',
              fontSize:      23,
              color:         T.ink,
              letterSpacing: -0.6,
            }}
          >
            {trend.avg}
          </Text>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_500Medium',
              fontSize:   12,
              fontWeight: '500',
              color:      T.ink3,
            }}
            numberOfLines={1}
          >
            {trend.unit}
          </Text>
        </View>
      </View>

      {/* MiniBars 7 dias */}
      <View style={{ width: 64, flexShrink: 0 }}>
        <MiniBars
          data={trend.miniBars}
          color={actionColor}
          width={64}
          height={30}
        />
      </View>

      {/* Delta */}
      <View style={{ width: 48, alignItems: 'flex-end' }}>
        <DeltaIndicator value={trend.delta} />
      </View>
    </View>
  );
});

TrendRow.displayName = 'TrendRow';
