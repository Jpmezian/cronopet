/**
 * hooks/useSmartHealthNotifications.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Plumbing entre o motor de insights e push notifications.
 *
 * Comportamento:
 *   • Sempre que insights de saúde mudam, checa se há algum severity=alert
 *     que ainda não foi notificado nas últimas 24h
 *   • Se sim, agenda uma push pra próxima manhã (9h) com o texto personalizado
 *   • Marca o insight no store pra não duplicar
 *   • Respeita as categorias desativadas pelo tutor (já filtradas no input)
 *   • Sem-op se permissão de notificação não foi concedida
 *
 * Por que NÃO ficar checando em background:
 *   • Background fetch no Expo é não-determinístico
 *   • Roda quando o app abre (frequente o suficiente pra MVP) é mais previsível
 *   • Push só agenda no futuro — se a condição resolver antes, o push ainda chega
 *     mas com texto dispensável (tradeoff aceito; pode evoluir pra cancelar)
 */

import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react-native';
import { usePetStore } from '@/store/usePetStore';
import { scheduleSmartHealthAlert } from '@/services/NotificationService';
import { personalizeInsight } from '@/lib/insightPersonalization';
import type { HealthInsight } from '@/services/HealthInsights';
import type { PetProfile } from '@/types/pet';

const RENOTIFY_AFTER_MS = 24 * 60 * 60 * 1000; // não re-notifica o mesmo insight em <24h
const PUSH_BODY_MAX_CHARS = 110;

/**
 * Decisão pura: escolhe o primeiro insight `alert` ainda não notificado
 * nas últimas 24h. Retorna null se não há candidato.
 *
 * Extraído pra ser testável sem render context.
 */
export function pickInsightToNotify(
  insights: HealthInsight[],
  notifiedInsightIds: Record<string, number>,
  now: number,
): HealthInsight | null {
  return insights.find((i) => {
    if (i.severity !== 'alert') return false;
    const lastNotified = notifiedInsightIds[i.id] ?? 0;
    return now - lastNotified > RENOTIFY_AFTER_MS;
  }) ?? null;
}

/**
 * Trunca body pra caber no limite de chars de push notification
 * (iOS/Android limitam ~110-150 chars antes de cortar com elipse feio).
 */
export function truncateNotificationBody(body: string, max = PUSH_BODY_MAX_CHARS): string {
  if (body.length <= max) return body;
  // '…' é 1 char (Unicode U+2026), não 3 como '...'. Usar max-1 garante
  // que o output final tenha exatamente `max` chars (bug antigo: o código
  // fazia `max-3` assumindo elipse ASCII e gerava strings 2 chars curtas).
  return body.slice(0, max - 1) + '…';
}

/**
 * Hash determinístico do conjunto de insights — usado pra evitar
 * disparar useEffect em re-renders que não mudam o conjunto.
 */
export function buildInsightsSnapshot(insights: HealthInsight[]): string {
  return insights.map((i) => `${i.id}:${i.severity}`).sort().join('|');
}

export function useSmartHealthNotifications(
  insights: HealthInsight[],
  pet: Pick<PetProfile, 'nome' | 'raca' | 'tipo'>,
) {
  const notifiedInsightIds = usePetStore((s) => s.notifiedInsightIds);
  const markInsightNotified = usePetStore((s) => s.markInsightNotified);

  // Evita disparar em re-render que não muda o conjunto de insights
  const lastSnapshotRef = useRef<string>('');

  useEffect(() => {
    const snapshot = buildInsightsSnapshot(insights);
    if (snapshot === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snapshot;

    const candidate = pickInsightToNotify(insights, notifiedInsightIds, Date.now());
    if (!candidate) return;

    (async () => {
      try {
        const copy = personalizeInsight(candidate, pet);
        await scheduleSmartHealthAlert(copy.title, truncateNotificationBody(copy.body));
        markInsightNotified(candidate.id);
      } catch (err) {
        Sentry.captureException(err, { tags: { source: 'smart_health_notifications' } });
      }
    })();
  }, [insights, pet, notifiedInsightIds, markInsightNotified]);
}
