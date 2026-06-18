import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarPlus, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { Appointment } from '@/types/pet';

interface AppointmentCardProps {
  next:        Appointment | null;
  upcoming:    Appointment[];
  onAdd:       () => void;
  onPressItem: (id: string) => void;
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function parseYMD(ymd: string): { day: string; mon: string } {
  const [, m, d] = ymd.split('-');
  return {
    day: String(parseInt(d, 10)),
    mon: MONTH_ABBR[parseInt(m, 10) - 1] ?? '',
  };
}

/**
 * AppointmentCard Bold v3 (briefing 08 § AppointmentCard).
 *
 * Card branco com quadrado data mint à esquerda. Hero = próxima consulta;
 * lista abaixo das próximas 2-3.
 *
 * Empty: Card com Button "Agendar consulta" → modal existente.
 *
 * Pet com 5 consultas no horizonte mostra hero + 2 secundárias (cap 3
 * total) pra não inflar a tela. Resto fica acessível via TODO P3 modal
 * "Ver todas".
 */
export const AppointmentCard = React.memo(function AppointmentCard({
  next, upcoming, onAdd, onPressItem,
}: AppointmentCardProps) {
  const T = useTheme();

  if (!next) {
    return (
      <Card padding={20}>
        <View style={s.emptyHeader}>
          <View style={[s.iconBox, { backgroundColor: T.surfaceTint }]}>
            <CalendarPlus size={22} color={T.ink2} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.emptyTitle, { color: T.ink }]}>Nenhuma consulta agendada</Text>
            <Text style={[s.emptySub, { color: T.ink2 }]}>
              Agende pra receber lembretes automáticos.
            </Text>
          </View>
        </View>
        <Button
          label="Agendar consulta"
          onPress={onAdd}
          variant="black"
          fullWidth
          style={{ marginTop: 14 }}
          accessibilityHint="Abre o modal de agendamento"
        />
      </Card>
    );
  }

  const secondary = upcoming.slice(1, 3);

  return (
    <Card padding={16}>
      <AppointmentRow appt={next} hero T={T} onPress={() => onPressItem(next.id)} />

      {secondary.length > 0 && (
        <View style={[s.divider, { backgroundColor: T.rule }]} />
      )}

      {secondary.map((a) => (
        <AppointmentRow
          key={a.id}
          appt={a}
          T={T}
          onPress={() => onPressItem(a.id)}
        />
      ))}
    </Card>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

// ─── Row ─────────────────────────────────────────────────────

interface AppointmentRowProps {
  appt:    Appointment;
  hero?:   boolean;
  T:       Theme;
  onPress: () => void;
}

function AppointmentRow({ appt, hero, T, onPress }: AppointmentRowProps) {
  const { day, mon } = parseYMD(appt.data);

  return (
    <ScalePress
      onPress={onPress}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${appt.titulo}. ${day} de ${mon}${appt.hora ? ` às ${appt.hora}` : ''}.`}
      accessibilityHint="Abre opções da consulta"
    >
      <View style={[s.row, hero && { paddingVertical: 4 }]}>
        <View style={[
          s.dateBox,
          {
            backgroundColor: T.mint,
            width:  hero ? 56 : 44,
            height: hero ? 56 : 44,
          },
        ]}>
          <Text style={[
            s.dateDay,
            { color: T.blk, fontSize: hero ? 22 : 17 },
          ]}>
            {day}
          </Text>
          <Text style={[
            s.dateMon,
            { color: T.blk, fontSize: hero ? 9 : 8 },
          ]}>
            {mon}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              s.title,
              { color: T.ink, fontSize: hero ? 16 : 14 },
            ]}
            numberOfLines={1}
          >
            {appt.titulo}
          </Text>
          <Text style={[s.sub, { color: T.ink2 }]} numberOfLines={1}>
            {appt.hora ? `${appt.hora}` : 'Sem horário'}
            {appt.veterinario ? ` · ${appt.veterinario}` : ''}
          </Text>
        </View>

        <ChevronRight size={18} color={T.ink4} strokeWidth={2.4} />
      </View>
    </ScalePress>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  dateBox:     { borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dateDay:     { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', lineHeight: 22 },
  dateMon:     { fontFamily: 'HankenGrotesk_800ExtraBold', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  title:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', letterSpacing: -0.3 },
  sub:         { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 2 },
  divider:     { height: 1, marginVertical: 8 },
  emptyHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconBox:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyTitle:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  emptySub:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
