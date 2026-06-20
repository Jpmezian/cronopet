import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';
import { usePetStore } from '@/store/usePetStore';
import { useTheme } from '@/hooks/useTheme';

/**
 * NotificationsCard Bold v3 (briefing 11 § Notificações).
 *
 * 3 partes:
 *   1. Horário do lembrete diário (HH:MM com ▲▼ chips estilizados)
 *   2. ToggleRow "Lembrete pós-inatividade" (re-engagement 24h+)
 *
 * Hour adjusts ±1, minute adjusts ±5 (decisão UX legacy mantida —
 * granularidade adequada pra lembrete diário, evita over-fidget).
 *
 * Migra o toggle de re-engagement que era inline com useThemeColors —
 * dívida liquidada (vide commit 55df174).
 */
export const NotificationsCard = React.memo(function NotificationsCard() {
  const T = useTheme();

  const hour    = usePetStore((s) => s.notificationHour);
  const minute  = usePetStore((s) => s.notificationMinute);
  const setTime = usePetStore((s) => s.setNotificationTime);
  const reengEnabled  = usePetStore((s) => s.reengagementEnabled);
  const setReeng      = usePetStore((s) => s.setReengagementEnabled);

  const adjustHour = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTime(((hour + delta) + 24) % 24, minute);
  }, [hour, minute, setTime]);

  const adjustMinute = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTime(hour, ((minute + delta) + 60) % 60);
  }, [hour, minute, setTime]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Card padding={20}>
      <Kicker>Lembrete diário</Kicker>
      <Text style={[s.desc, { color: T.ink2 }]}>
        Horário do aviso pra completar a rotina do dia.
      </Text>

      <View style={s.timeRow}>
        <TimeStepper
          value={pad(hour)}
          onUp={() => adjustHour(1)}
          onDown={() => adjustHour(-1)}
          label="Hora"
          accessibilityLabel={`Hora ${hour}`}
        />
        <Text style={[s.colon, { color: T.ink }]}>:</Text>
        <TimeStepper
          value={pad(minute)}
          onUp={() => adjustMinute(5)}
          onDown={() => adjustMinute(-5)}
          label="Min (+5)"
          accessibilityLabel={`Minuto ${minute}`}
        />
      </View>

      <View style={[s.divider, { backgroundColor: T.rule }]} />

      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[s.toggleTitle, { color: T.ink }]}>Lembrete pós-inatividade</Text>
          <Text style={[s.toggleDesc, { color: T.ink3 }]}>
            Avisa quando passa 24h sem registrar nada. Sem spam.
          </Text>
        </View>
        <Toggle
          value={reengEnabled}
          onValueChange={setReeng}
          label="Lembrete pós-inatividade"
          hint="Quando ativado, envia uma notificação após 24h sem registros"
        />
      </View>
    </Card>
  );
});

NotificationsCard.displayName = 'NotificationsCard';

// ─── Stepper ─────────────────────────────────────────────────

interface TimeStepperProps {
  value:    string;
  onUp:     () => void;
  onDown:   () => void;
  label:    string;
  accessibilityLabel: string;
}

function TimeStepper({ value, onUp, onDown, label, accessibilityLabel }: TimeStepperProps) {
  const T = useTheme();
  return (
    <View style={s.stepper}>
      <ScalePress
        onPress={onUp}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${label}`}
        hitSlop={6}
        style={[s.stepBtn, { backgroundColor: T.surfaceTint }]}
      >
        <ChevronUp size={18} color={T.ink} strokeWidth={2.4} />
      </ScalePress>
      <View
        style={[s.valueBox, { backgroundColor: T.blk }]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={[s.valueText, { color: T.onBlk }]}>{value}</Text>
      </View>
      <ScalePress
        onPress={onDown}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Diminuir ${label}`}
        hitSlop={6}
        style={[s.stepBtn, { backgroundColor: T.surfaceTint }]}
      >
        <ChevronDown size={18} color={T.ink} strokeWidth={2.4} />
      </ScalePress>
      <Text style={[s.stepLabel, { color: T.ink3 }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  desc:        { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 8, lineHeight: 18 },
  timeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 18, marginBottom: 8 },
  colon:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 28, fontWeight: '800', marginBottom: 28 },
  stepper:     { alignItems: 'center', gap: 6 },
  stepBtn:     { width: 40, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  valueBox:    { width: 64, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  valueText:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 26 },
  stepLabel:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500' },
  divider:     { height: 1, marginVertical: 20 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  toggleTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
  toggleDesc:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 16 },
});
