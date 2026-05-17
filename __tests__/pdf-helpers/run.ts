/**
 * Suite — services/pdfReportHelpers.ts
 *
 * Helpers puros do gerador de PDF (formatters + aggregação de stats).
 * Bug aqui = PDF que vai pro vet com dados errados (contagem, idade,
 * total de comida). Casos cobertos:
 *
 *  Formatters:
 *   - fmtISO converte YYYY-MM-DD → DD/MM/YYYY (sem bug de timezone)
 *   - fmtDateTime gera string pt-BR coerente
 *   - calcAge: recém-nascido, meses, anos, singular/plural
 *
 *  Conversores:
 *   - tolWord/riskWord cobertura completa low/medium/high
 *
 *  computeReportStats:
 *   - Janela default 30d filtra corretamente
 *   - counts por ActionKey
 *   - totalFoodGrams soma só `comida.quantity`
 *   - totalWalkMinutes soma só `passeio.duration`
 *   - abnormalCount conta `appearance==='abnormal'` (xixi/coco)
 *   - byDay agrupa por dia pt-BR
 *   - weightSorted ASC, apptSorted DESC
 *   - Empty case: tudo vazio sem crash
 *   - Janela custom (windowDays parâmetro)
 */

import {
  fmtISO, fmtDateTime, calcAge,
  tolWord, riskWord,
  computeReportStats,
} from '@/services/pdfReportHelpers';
import {
  assertEq, assertTrue, assertNear, runSuite,
} from '../_lib/assert';

const NOW = new Date('2026-05-17T12:00:00').getTime();
const DAY = 86_400_000;

let _id = 0;
const rid = () => `t${++_id}`;

runSuite('services/pdfReportHelpers', [
  // ─── Formatters ─────────────────────────────────────────────

  {
    name: '01. fmtISO: 2026-05-17 → "17/05/2026" sem timezone shift',
    fn: () => {
      assertEq(fmtISO('2026-05-17'), '17/05/2026');
      assertEq(fmtISO('2020-01-01'), '01/01/2020');
      // Bug clássico: passar pela Date() puxa pro UTC e datas de 1º do
      // mês ficam último dia do mês anterior em fusos negativos.
      // fmtISO faz split puro de string, imune a isso.
    },
  },

  {
    name: '02. fmtDateTime: contém data e hora pt-BR',
    fn: () => {
      const s = fmtDateTime(NOW);
      assertTrue(s.includes('2026'), 'ano presente');
      assertTrue(/\d{2}:\d{2}/.test(s), 'hora HH:MM presente');
      assertTrue(/\d{2}\/\d{2}/.test(s), 'data DD/MM presente');
    },
  },

  {
    name: '03. calcAge: < 1 mês = "Recém-nascido"',
    fn: () => {
      // Nascido há 10 dias
      const recent = new Date(NOW - 10 * DAY);
      const iso = `${recent.getFullYear()}-${String(recent.getMonth()+1).padStart(2,'0')}-${String(recent.getDate()).padStart(2,'0')}`;
      assertEq(calcAge(iso, NOW), 'Recém-nascido');
    },
  },

  {
    name: '04. calcAge: 1 mês → "1 mês" (singular)',
    fn: () => {
      // Nascido em 17 de abril → exatamente 1 mês em 17 de maio
      assertEq(calcAge('2026-04-17', NOW), '1 mês');
    },
  },

  {
    name: '05. calcAge: 6 meses → "6 meses" (plural)',
    fn: () => {
      assertEq(calcAge('2025-11-17', NOW), '6 meses');
    },
  },

  {
    name: '06. calcAge: 1 ano → "1 ano" (singular)',
    fn: () => {
      assertEq(calcAge('2025-05-17', NOW), '1 ano');
    },
  },

  {
    name: '07. calcAge: 7 anos → "7 anos" (plural)',
    fn: () => {
      assertEq(calcAge('2019-05-17', NOW), '7 anos');
    },
  },

  // ─── Word converters ────────────────────────────────────────

  {
    name: '08. tolWord/riskWord: cobertura completa low/medium/high',
    fn: () => {
      assertEq(tolWord('low'),    'baixa');
      assertEq(tolWord('medium'), 'média');
      assertEq(tolWord('high'),   'alta');
      assertEq(riskWord('low'),    'baixo');
      assertEq(riskWord('medium'), 'médio');
      assertEq(riskWord('high'),   'alto');
    },
  },

  // ─── computeReportStats ─────────────────────────────────────

  {
    name: '09. computeReportStats: janela 30d filtra logs antigos fora',
    fn: () => {
      const logs = [
        { id: rid(), key: 'comida' as const, timestamp: NOW - 5  * DAY },
        { id: rid(), key: 'comida' as const, timestamp: NOW - 25 * DAY },
        // Esses 2 ficam de fora:
        { id: rid(), key: 'comida' as const, timestamp: NOW - 35 * DAY },
        { id: rid(), key: 'comida' as const, timestamp: NOW - 60 * DAY },
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      assertEq(s.recentLogs.length, 2, 'só os 2 dentro da janela de 30d');
      assertEq(s.counts.comida, 2);
    },
  },

  {
    name: '10. counts: agrupa por ActionKey, conta correto',
    fn: () => {
      const logs = [
        { id: rid(), key: 'comida'  as const, timestamp: NOW - 1 * DAY },
        { id: rid(), key: 'comida'  as const, timestamp: NOW - 2 * DAY },
        { id: rid(), key: 'agua'    as const, timestamp: NOW - 1 * DAY },
        { id: rid(), key: 'passeio' as const, timestamp: NOW - 1 * DAY },
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      assertEq(s.counts.comida, 2);
      assertEq(s.counts.agua, 1);
      assertEq(s.counts.passeio, 1);
      assertEq(s.counts.xixi, undefined, 'keys ausentes não viram zeros');
    },
  },

  {
    name: '11. totalFoodGrams soma só comida.quantity, ignora outras keys',
    fn: () => {
      const logs = [
        { id: rid(), key: 'comida' as const, timestamp: NOW - 1*DAY, quantity: 150 },
        { id: rid(), key: 'comida' as const, timestamp: NOW - 2*DAY, quantity: 200 },
        // Sem quantity — ignorado
        { id: rid(), key: 'comida' as const, timestamp: NOW - 3*DAY },
        // Quantity em passeio não conta como food
        { id: rid(), key: 'passeio' as const, timestamp: NOW - 1*DAY, quantity: 999 },
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      assertEq(s.totalFoodGrams, 350, '150 + 200');
    },
  },

  {
    name: '12. totalWalkMinutes soma só passeio.duration',
    fn: () => {
      const logs = [
        { id: rid(), key: 'passeio' as const, timestamp: NOW - 1*DAY, duration: 30 },
        { id: rid(), key: 'passeio' as const, timestamp: NOW - 2*DAY, duration: 45 },
        // Sem duration — ignorado
        { id: rid(), key: 'passeio' as const, timestamp: NOW - 3*DAY },
        // duration em comida não conta
        { id: rid(), key: 'comida'  as const, timestamp: NOW - 1*DAY, duration: 999 },
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      assertEq(s.totalWalkMinutes, 75, '30 + 45');
    },
  },

  {
    name: '13. abnormalCount conta logs com appearance="abnormal"',
    fn: () => {
      const logs = [
        { id: rid(), key: 'xixi' as const, timestamp: NOW - 1*DAY, appearance: 'abnormal' as const },
        { id: rid(), key: 'coco' as const, timestamp: NOW - 2*DAY, appearance: 'abnormal' as const },
        { id: rid(), key: 'xixi' as const, timestamp: NOW - 3*DAY, appearance: 'normal'   as const },
        // Sem appearance — não conta
        { id: rid(), key: 'xixi' as const, timestamp: NOW - 4*DAY },
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      assertEq(s.abnormalCount, 2);
    },
  },

  {
    name: '14. byDay: agrupa por data (chave DD/MM/YYYY pt-BR)',
    fn: () => {
      const logs = [
        { id: rid(), key: 'comida' as const, timestamp: NOW - 1*DAY }, // dia A
        { id: rid(), key: 'agua'   as const, timestamp: NOW - 1*DAY + 1000 }, // mesmo dia
        { id: rid(), key: 'comida' as const, timestamp: NOW - 2*DAY }, // dia B
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW });
      const dias = Object.keys(s.byDay);
      assertEq(dias.length, 2, 'dois dias distintos');
      const valoresContagens = Object.values(s.byDay).map((arr) => arr.length).sort();
      assertEq(JSON.stringify(valoresContagens), '[1,2]', 'um dia tem 2 logs, outro tem 1');
    },
  },

  {
    name: '15. weightSorted ASC, apptSorted DESC',
    fn: () => {
      const s = computeReportStats({
        actionHistory: [],
        weightHistory: [
          { id: 'w1', peso: 6.5, data: '2026-05-15' },
          { id: 'w2', peso: 6.4, data: '2026-05-01' },
          { id: 'w3', peso: 6.6, data: '2026-04-15' },
        ],
        appointments: [
          { id: 'a1', titulo: 'Banho', data: '2026-04-01' },
          { id: 'a2', titulo: 'Vacina', data: '2026-06-01' },
          { id: 'a3', titulo: 'Check', data: '2026-05-15' },
        ],
        now: NOW,
      });
      assertEq(s.weightSorted.map((w) => w.data).join(','), '2026-04-15,2026-05-01,2026-05-15', 'crescente');
      assertEq(s.apptSorted.map((a) => a.data).join(','), '2026-06-01,2026-05-15,2026-04-01', 'decrescente');
    },
  },

  {
    name: '16. Empty case: histórico vazio retorna estrutura sem crash',
    fn: () => {
      const s = computeReportStats({ actionHistory: [], now: NOW });
      assertEq(s.recentLogs.length, 0);
      assertEq(Object.keys(s.counts).length, 0);
      assertEq(s.totalFoodGrams, 0);
      assertEq(s.totalWalkMinutes, 0);
      assertEq(s.abnormalCount, 0);
      assertEq(Object.keys(s.byDay).length, 0);
      assertEq(s.weightSorted.length, 0);
      assertEq(s.apptSorted.length, 0);
    },
  },

  {
    name: '17. windowDays custom: 7 dias só inclui última semana',
    fn: () => {
      const logs = [
        { id: rid(), key: 'comida' as const, timestamp: NOW - 3  * DAY }, // dentro
        { id: rid(), key: 'comida' as const, timestamp: NOW - 10 * DAY }, // fora
      ];
      const s = computeReportStats({ actionHistory: logs, now: NOW, windowDays: 7 });
      assertEq(s.recentLogs.length, 1);
    },
  },
]);
