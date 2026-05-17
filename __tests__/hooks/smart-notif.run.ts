/**
 * Suite — hooks/useSmartHealthNotifications.ts
 *
 * Pure fns extraídas: pickInsightToNotify, truncateNotificationBody,
 * buildInsightsSnapshot. Bug aqui = push notification duplicada
 * (spam) ou alert crítico nunca chega no tutor.
 */

import {
  pickInsightToNotify,
  truncateNotificationBody,
  buildInsightsSnapshot,
} from '@/hooks/useSmartHealthNotifications';
import type { HealthInsight } from '@/services/HealthInsights';
import { assertEq, assertNull, assertNotNull, runSuite } from '../_lib/assert';

const NOW = new Date('2026-05-17T12:00:00').getTime();
const DAY = 86_400_000;

function alert(id: string): HealthInsight {
  return {
    id, severity: 'alert', category: 'medical',
    title: 'x', message: 'y', suggestion: 'z', detectedAt: NOW,
  };
}

function info(id: string): HealthInsight {
  return {
    id, severity: 'info', category: 'medical',
    title: 'x', message: 'y', suggestion: 'z', detectedAt: NOW,
  };
}

runSuite('hooks/useSmartHealthNotifications', [
  {
    name: '01. pickInsightToNotify: só considera severity="alert" (ignora info/warning)',
    fn: () => {
      const insights: HealthInsight[] = [
        info('i1'),
        { id: 'w1', severity: 'warning', category: 'medical', title: 'x', message: 'y', suggestion: 'z', detectedAt: NOW },
      ];
      assertNull(pickInsightToNotify(insights, {}, NOW), 'sem alert, sem notif');
    },
  },

  {
    name: '02. pickInsightToNotify: alert nunca notificado → retorna primeiro',
    fn: () => {
      const insights = [alert('a1'), alert('a2')];
      const picked = pickInsightToNotify(insights, {}, NOW);
      assertNotNull(picked);
      assertEq(picked.id, 'a1', 'primeiro alert na lista');
    },
  },

  {
    name: '03. pickInsightToNotify: alert notificado < 24h ATRÁS é pulado',
    fn: () => {
      const insights = [alert('a1'), alert('a2')];
      const notified = { a1: NOW - 12 * 3600_000 }; // 12h atrás
      const picked = pickInsightToNotify(insights, notified, NOW);
      assertNotNull(picked);
      assertEq(picked.id, 'a2', 'a1 ainda em cooldown, pula pra a2');
    },
  },

  {
    name: '04. pickInsightToNotify: cooldown expira após 24h, pode renotificar',
    fn: () => {
      const insights = [alert('a1')];
      const notified = { a1: NOW - 25 * 3600_000 }; // 25h atrás
      const picked = pickInsightToNotify(insights, notified, NOW);
      assertNotNull(picked);
      assertEq(picked.id, 'a1', 'passou da janela, libera renotif');
    },
  },

  {
    name: '05. truncateNotificationBody: <= 110 chars passa intacto',
    fn: () => {
      const body = 'mensagem curta'.repeat(2); // 28 chars
      assertEq(truncateNotificationBody(body), body, 'sem truncar');
    },
  },

  {
    name: '06. truncateNotificationBody: > 110 chars vira N-3 chars + "…"',
    fn: () => {
      const body = 'x'.repeat(200);
      const out = truncateNotificationBody(body);
      assertEq(out.length, 110, 'cap em 110');
      assertEq(out.endsWith('…'), true, 'sufixo de continuação');
    },
  },

  {
    name: '07. buildInsightsSnapshot: idempotente em mesmo conjunto, sensitivo a severity',
    fn: () => {
      const a = [alert('a1'), info('i1')];
      const b = [info('i1'), alert('a1')]; // ordem trocada
      assertEq(buildInsightsSnapshot(a), buildInsightsSnapshot(b), 'sort independente de ordem');

      // Severity muda → snapshot muda
      const c: HealthInsight[] = [{ ...alert('a1'), severity: 'warning' }];
      const d = [alert('a1')];
      assertEq(buildInsightsSnapshot(c) !== buildInsightsSnapshot(d), true);
    },
  },
]);
