import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useTheme } from '@/hooks/useTheme';
import type { WeekDay } from '@/hooks/useHistoryData';

interface WeekGoalsCardProps {
  /** 7 dias Dom→Sáb (mesmo array do StreakHero). */
  week:  WeekDay[];
  /** Metas batidas na semana (apenas dias passados + hoje). */
  done:  number;
  /** Total possível na semana (dias passados + hoje × goals por dia). */
  total: number;
}

/**
 * WeekGoalsCard Bold v3 (briefing 07 § WeekGoalsCard).
 *
 * Card branco com 7 barras verticais Dom→Sáb. Cada barra:
 *   • 100% verdigris (T.primary) se TODAS metas batidas no dia
 *   • Proporção mint (T.mint) se parcial
 *   • Trilha ruleSoft pra futuro/vazio
 *
 * Pill "X de Y" no header.
 */
export const WeekGoalsCard = React.memo(function WeekGoalsCard({
  week, done, total,
}: WeekGoalsCardProps) {
  const T = useTheme();

  const BAR_HEIGHT = 104;
  const MIN_RATIO  = 0.12; // 12% pra dar floor visual em parciais ≥ 1

  return (
    <Card padding={20}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={{
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   20,
      }}>
        <Text
          style={{
            fontFamily:    'BricolageGrotesque_800ExtraBold',
            fontWeight:    '800',
            fontSize:      18,
            color:         T.ink,
            letterSpacing: -0.4,
          }}
          accessibilityRole="header"
        >
          Metas da semana
        </Text>
        <Pill label={`${done} de ${total}`} tone="success" />
      </View>

      {/* ── Barras ─────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems:    'flex-end',
          gap:           9,
          height:        BAR_HEIGHT,
        }}
        accessible
        accessibilityLabel={`${done} de ${total} metas batidas na semana`}
      >
        {week.map((d) => {
          const ratio   = d.total > 0 ? d.done / d.total : 0;
          const isFull  = !d.isFuture && d.done === d.total && d.done > 0;
          const fillPct = d.isFuture
            ? 0
            : ratio === 0
              ? 0
              : Math.max(MIN_RATIO, ratio);

          // Cor da barra: full=verdigris, parcial=mint, vazio=ruleSoft
          const fillColor = isFull
            ? T.primary
            : ratio > 0
              ? T.mint
              : 'transparent';

          return (
            <View
              key={d.date}
              style={{
                flex:          1,
                alignItems:    'center',
                gap:           9,
                height:        '100%',
              }}
            >
              {/* Track + fill */}
              <View
                style={{
                  flex:            1,
                  width:           '100%',
                  borderRadius:    8,
                  backgroundColor: T.ruleSoft,
                  justifyContent:  'flex-end',
                  overflow:        'hidden',
                }}
              >
                <View
                  style={{
                    width:           '100%',
                    height:          `${fillPct * 100}%`,
                    backgroundColor: fillColor,
                    borderRadius:    8,
                  }}
                />
              </View>

              {/* Label Dom-Sáb */}
              <Text
                style={{
                  fontFamily:    'HankenGrotesk_800ExtraBold',
                  fontSize:      11,
                  fontWeight:    '800',
                  color:         d.isToday ? T.primary : T.ink4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {d.dia}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
});

WeekGoalsCard.displayName = 'WeekGoalsCard';
