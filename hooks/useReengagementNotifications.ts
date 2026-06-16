import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';

import { usePetStore } from '@/store/usePetStore';
import type { ActionLog, PetProfile } from '@/types/pet';
import {
  scheduleReengagementNotification,
  cancelReengagementNotification,
} from '@/services/NotificationService';
import {
  selectReengagementMessage,
  nextSensibleTriggerTime,
  REENGAGEMENT_RESCHEDULE_MIN_HOURS,
} from '@/constants/notifications';

const HOURS_MS = 60 * 60 * 1000;

interface CheckState {
  enabled:        boolean;
  activePetId:    string;
  pets:           Record<string, PetProfile>;
  actionHistory:  ActionLog[];
  lastScheduledAt: number | null;
}

/**
 * Fn module-level — extraída do hook pra ficar ≤80L conforme padrão
 * de rigor (briefing 02). Side-effects rodam em sequence; promises de
 * I/O têm catch com Sentry breadcrumb pra não vazar exception.
 */
async function runReengagementCheck(
  s: CheckState,
  setLastScheduledAt: (ts: number | null) => void,
): Promise<void> {
  if (!s.enabled) { await cancelReengagementNotification(); return; }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') { await cancelReengagementNotification(); return; }
  } catch {
    Sentry.addBreadcrumb({
      category: 'reengage', level: 'warning',
      message: 'getPermissionsAsync failed',
    });
    return;
  }

  const pet = s.pets[s.activePetId];
  if (!pet) { await cancelReengagementNotification(); return; }

  const logsThisPet = s.actionHistory.filter(
    (l) => !l.petId || l.petId === s.activePetId,
  );
  // User novo — sem log nenhum. Não confunde com inatividade.
  if (logsThisPet.length === 0) return;

  const lastLogTs = Math.max(...logsThisPet.map((l) => l.timestamp));
  const hoursSince = (Date.now() - lastLogTs) / HOURS_MS;

  // User ativo (< 24h) — cancela qualquer pendente de re-engajamento
  if (hoursSince < 24) { await cancelReengagementNotification(); return; }

  // Anti-stack: <12h desde último agendamento
  if (
    s.lastScheduledAt &&
    Date.now() - s.lastScheduledAt < REENGAGEMENT_RESCHEDULE_MIN_HOURS * HOURS_MS
  ) {
    return;
  }

  const message = selectReengagementMessage(hoursSince, pet.nome);
  if (!message) {
    // Janela anti-spam (96-168h) ou nome ausente — cancela e segue
    await cancelReengagementNotification();
    return;
  }

  try {
    await scheduleReengagementNotification(nextSensibleTriggerTime(new Date()), message);
    setLastScheduledAt(Date.now());
  } catch (err) {
    Sentry.captureException(err, { tags: { op: 'reengagement_schedule' } });
  }
}

/**
 * Hook side-effect: agenda/cancela notificação de re-engajamento (24h+
 * sem registro) baseado em toggle + permission + horas desde último log.
 * Roda em mount + cada transição `background → active`.
 */
export function useReengagementNotifications(): void {
  const enabled            = usePetStore((s) => s.reengagementEnabled);
  const activePetId        = usePetStore((s) => s.activePetId);
  const pets               = usePetStore((s) => s.pets);
  const actionHistory      = usePetStore((s) => s.actionHistory);
  const lastScheduledAt    = usePetStore((s) => s.lastReengagementScheduledAt);
  const setLastScheduledAt = usePetStore((s) => s.setLastReengagementScheduledAt);

  // Ref pra leitura no AppState listener sem deps stale
  const stateRef = useRef<CheckState>({ enabled, activePetId, pets, actionHistory, lastScheduledAt });
  stateRef.current = { enabled, activePetId, pets, actionHistory, lastScheduledAt };

  useEffect(() => {
    void runReengagementCheck(stateRef.current, setLastScheduledAt);
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') void runReengagementCheck(stateRef.current, setLastScheduledAt);
    });
    return () => sub.remove();
    // mount-only intencional — leitura via stateRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
