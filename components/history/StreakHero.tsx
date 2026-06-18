import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Flame } from 'lucide-react-native';
import { InkPanel } from '@/components/ui/InkPanel';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { WeekDay } from '@/hooks/useHistoryData';

interface StreakHeroProps {
  /** Sequência atual em dias. */
  streak: number;
  /** Maior streak histórico. */
  record: number;
  /** 7 dias Dom→Sáb da semana corrente. */
  week:   WeekDay[];
}

/**
 * StreakHero Bold v3 (briefing 07 § StreakHero).
 *
 * InkPanel preto com 3 zonas: eyebrow/flame + recorde, número 62 mint,
 * WeekStrip com check (completo) / contagem (parcial) / vazio (futuro).
 *
 * rgba inline pra fade sobre T.blk — apply opacity no parent quebraria
 * o ratio do filho, então mantém rgba como o screens-history.jsx do
 * material-fonte.
 */
export const StreakHero = React.memo(function StreakHero({
  streak, record, week,
}: StreakHeroProps) {
  const T = useTheme();
  const daysLabel = streak === 1 ? 'dia\nseguido' : 'dias\nseguidos';

  return (
    <InkPanel padding={22}>
      <View style={s.topRow}>
        <View>
          <View style={s.eyebrowRow}>
            <Flame size={16} color={T.mint} strokeWidth={2.4} />
            <Text style={[s.eyebrow, { color: 'rgba(246,244,234,0.65)' }]}>Sequência</Text>
          </View>
          <View style={s.numberRow}>
            <Text
              style={[s.bigNumber, { color: T.mint }]}
              accessibilityRole="text"
              accessibilityLabel={`${streak} dias seguidos`}
            >
              {streak}
            </Text>
            <Text style={[s.daysLabel, { color: T.onBlk }]}>{daysLabel}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.recordKicker, { color: 'rgba(246,244,234,0.5)' }]}>Recorde</Text>
          <Text
            style={[s.recordNumber, { color: T.onBlk }]}
            accessibilityLabel={`Recorde histórico ${record} dias`}
          >
            {record}
          </Text>
        </View>
      </View>

      <View style={s.weekStrip}>
        {week.map((d) => <WeekStripCell key={d.date} day={d} T={T} />)}
      </View>
    </InkPanel>
  );
});

StreakHero.displayName = 'StreakHero';

// ─── Cell ─────────────────────────────────────────────────────

const WeekStripCell = React.memo(function WeekStripCell({
  day, T,
}: { day: WeekDay; T: Theme }) {
  const full  = !day.isFuture && day.done === day.total;
  const empty = day.isFuture || day.done === 0;
  const bg    = full
    ? T.mint
    : empty
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(155,228,198,0.22)';
  const label = day.isFuture
    ? `${day.dia}, dia futuro`
    : full
      ? `${day.dia}, dia completo`
      : `${day.dia}, ${day.done} de ${day.total} metas`;

  return (
    <View style={s.cell}>
      <View
        style={[s.cellSquare, { backgroundColor: bg }]}
        accessible
        accessibilityLabel={label}
      >
        {full ? (
          <Check size={15} color={T.blk} strokeWidth={3.2} />
        ) : !empty ? (
          <Text style={[s.cellCount, { color: 'rgba(246,244,234,0.85)' }]}>{day.done}</Text>
        ) : null}
      </View>
      <Text
        style={[
          s.cellDayLabel,
          { color: day.isToday ? T.mint : 'rgba(246,244,234,0.4)' },
        ]}
      >
        {day.dia}
      </Text>
    </View>
  );
});

const s = StyleSheet.create({
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow:     { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  numberRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 13, marginTop: 6 },
  bigNumber:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 62, lineHeight: 62, letterSpacing: -1.5 },
  daysLabel:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 18, marginBottom: 8, letterSpacing: -0.4 },
  recordKicker:{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  recordNumber:{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 22, marginTop: 2 },
  weekStrip:   { flexDirection: 'row', gap: 6, marginTop: 20 },
  cell:        { flex: 1, alignItems: 'center', gap: 7 },
  cellSquare:  { width: '100%', aspectRatio: 1, maxHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cellCount:   { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800' },
  cellDayLabel:{ fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});
