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

export function useSmartHealthNotifications(
  insights: HealthInsight[],
  pet: Pick<PetProfile, 'nome' | 'raca' | 'tipo'>,
) {
  const notifiedInsightIds = usePetStore((s) => s.notifiedInsightIds);
  const markInsightNotified = usePetStore((s) => s.markInsightNotified);

  // Evita disparar em re-render que não muda o conjunto de insights
  const lastSnapshotRef = useRef<string>('');

  useEffect(() => {
    const snapshot = insights.map((i) => `${i.id}:${i.severity}`).sort().join('|');
    if (snapshot === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snapshot;

    // Pega o pior alerta ainda não notificado nas últimas 24h
    const now = Date.now();
    const candidate = insights.find((i) => {
      if (i.severity !== 'alert') return false;
      const lastNotified = notifiedInsightIds[i.id] ?? 0;
      return now - lastNotified > RENOTIFY_AFTER_MS;
    });

    if (!candidate) return;

    (async () => {
      try {
        const copy = personalizeInsight(candidate, pet);
        // Push max ~110 chars — usa só body, sem o nextStep
        const truncatedBody = copy.body.length > 110
          ? copy.body.slice(0, 107) + '…'
          : copy.body;

        await scheduleSmartHealthAlert(copy.title, truncatedBody);
        markInsightNotified(candidate.id);
      } catch (err) {
        Sentry.captureException(err, { tags: { source: 'smart_health_notifications' } });
      }
    })();
  }, [insights, pet, notifiedInsightIds, markInsightNotified]);
}
