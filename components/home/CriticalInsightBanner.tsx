/**
 * components/home/CriticalInsightBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Banner proeminente no topo da home quando há insight crítico (severity=alert).
 *
 * Design:
 *   • Card branco, borda fina, sombra muito sutil — clean e sem alarme visual
 *   • Indicador lateral colorido por severidade (sem invadir o card)
 *   • Tipografia hierárquica clara: kicker → título → corpo → ações
 *   • Texto personalizado (lib/insightPersonalization) — usa nome, raça, evidência
 *   • Sem emoji, sem ícone "robô/sparkle/AI" — passa como conselho humano
 *   • Duas ações: primária (Marcar consulta) + secundária (Lembrar amanhã)
 *
 * Comportamento:
 *   • Mostra só o insight de maior severidade ativo
 *   • Snooze de 24h salva no store; reaparece no dia seguinte se ainda detectado
 *   • Marcar consulta cria appointment com título e data sugeridos
 *   • Toast de feedback no snooze e na criação da consulta
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CalendarPlus, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ScalePress } from '@/components/ui/ScalePress';
import { useToastStore } from '@/store/useToastStore';
import { usePetStore } from '@/store/usePetStore';
import { personalizeInsight } from '@/lib/insightPersonalization';
import { tsToLocalYMD } from '@/lib/dateLocal';
import type { HealthInsight } from '@/services/HealthInsights';
import type { PetProfile } from '@/types/pet';

interface Props {
  insights: HealthInsight[];
  pet: Pick<PetProfile, 'nome' | 'raca' | 'tipo'>;
}

/** Sugere uma data de consulta a 3 dias úteis a partir de hoje (YYYY-MM-DD) */
function suggestAppointmentDate(): string {
  const d = new Date();
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return tsToLocalYMD(d.getTime());
}

export function CriticalInsightBanner({ insights, pet }: Props) {
  const T = useTheme();
  const showToast = useToastStore((s) => s.showToast);
  const snoozeInsight = usePetStore((s) => s.snoozeInsight);
  const snoozedInsights = usePetStore((s) => s.snoozedInsights);
  const addAppointment = usePetStore((s) => s.addAppointment);
  const registerAlertHandled = usePetStore((s) => s.registerAlertHandled);

  // Filtra: só severity=alert, descartando os já adiados
  const critical = useMemo(() => {
    const now = Date.now();
    return insights.find(
      (i) => i.severity === 'alert' && (snoozedInsights[i.id] ?? 0) <= now,
    );
  }, [insights, snoozedInsights]);

  const copy = useMemo(
    () => (critical ? personalizeInsight(critical, pet) : null),
    [critical, pet],
  );

  const handleSchedule = useCallback(async () => {
    if (!copy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const data = suggestAppointmentDate();
    await addAppointment({
      titulo: copy.appointmentTitle,
      data,
      nota: 'Consulta sugerida pelo app a partir de sinais observados na rotina.',
    });
    if (critical) snoozeInsight(critical.id, 7 * 24);
    registerAlertHandled();
    showToast('success', `Consulta marcada para ${formatBR(data)}. Edite na aba Saúde se precisar.`);
  }, [copy, critical, addAppointment, snoozeInsight, registerAlertHandled, showToast]);

  const handleSnooze = useCallback(() => {
    if (!critical) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snoozeInsight(critical.id, 24);
    showToast('info', 'Voltamos a lembrar amanhã.');
  }, [critical, snoozeInsight, showToast]);

  if (!critical || !copy) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(180)}
      style={{ paddingHorizontal: 20, marginTop: 16 }}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`Importante: ${copy.title}. ${copy.body} ${copy.nextStep}`}
        style={{
          backgroundColor: T.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: T.rule,
          overflow: 'hidden',
          flexDirection: 'row',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
            android: { elevation: 2 },
          }),
        }}
      >
        {/* Indicador lateral — único elemento de cor "alarmista", e mesmo assim contido */}
        <View style={{
          width: 4,
          backgroundColor: T.isDark ? '#fca5a5' : '#b91c1c',
        }} />

        <View style={{ flex: 1, padding: 18, gap: 12 }}>
          {/* Kicker */}
          <Text
            accessibilityRole="text"
            style={{
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.4,
              color: T.isDark ? '#fca5a5' : '#b91c1c',
              textTransform: 'uppercase',
            }}
          >
            Importante
          </Text>

          {/* Título */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: T.ink,
              lineHeight: 26,
              fontFamily: 'Nunito_800ExtraBold',
              letterSpacing: -0.3,
            }}
          >
            {copy.title}
          </Text>

          {/* Corpo */}
          <Text style={{
            fontSize: 14,
            color: T.ink2,
            lineHeight: 21,
          }}>
            {copy.body}
          </Text>

          {/* Próximo passo */}
          <Text style={{
            fontSize: 13,
            color: T.ink,
            fontWeight: '600',
            lineHeight: 19,
            marginTop: 2,
          }}>
            {copy.nextStep}
          </Text>

          {/* Ações */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <ScalePress
              accessibilityRole="button"
              accessibilityLabel={`Marcar consulta. ${copy.appointmentTitle} sugerida.`}
              accessibilityHint="Cria uma consulta na aba Saúde com data sugerida"
              onPress={handleSchedule}
              style={{
                flex: 1,
                backgroundColor: T.ink,
                paddingVertical: 13,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CalendarPlus size={16} color={T.bg} strokeWidth={2.4} />
              <Text style={{
                color: T.bg,
                fontWeight: '700',
                fontSize: 14,
                fontFamily: 'Nunito_700Bold',
              }}>
                Marcar consulta
              </Text>
            </ScalePress>

            <ScalePress
              accessibilityRole="button"
              accessibilityLabel="Lembrar amanhã"
              accessibilityHint="Adia o lembrete por 24 horas"
              onPress={handleSnooze}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: T.surfaceTint,
                alignItems: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
            >
              <Clock size={14} color={T.ink2} strokeWidth={2.2} />
              <Text style={{
                color: T.ink2,
                fontWeight: '600',
                fontSize: 13,
              }}>
                Amanhã
              </Text>
            </ScalePress>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatBR(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-');
  return `${d}/${m}/${y}`;
}
