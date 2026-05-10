// ─── Demo seed data ──────────────────────────────────────────
// Gera 14 dias de histórico simulado para testes e demos.
// Uso: Sandbox → "Popular com dados demo" (só em dev)

import type {
  ActionLog, ActionKey, Vaccine, Appointment, WeightEntry,
  Acceptance, Consistency, Appearance,
} from '@/types/pet';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeId(i: number, suffix: string): string {
  return `demo-${i}-${suffix}-${Math.random().toString(36).slice(2, 7)}`;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Logs de ação (14 dias, com variação realista) ───────────

export function seedActionLogs(): ActionLog[] {
  const logs: ActionLog[] = [];
  const now = Date.now();

  for (let day = 13; day >= 0; day--) {
    const dayBase = now - day * DAY_MS;

    // Comida: 2x/dia (8h e 19h) — quase sempre registrada
    if (Math.random() > 0.1) {
      logs.push({
        id: makeId(day, 'food1'),
        key: 'comida',
        timestamp: dayBase - (new Date(dayBase).getHours() - 8) * 60 * 60 * 1000,
        quantity: randomPick([80, 100, 120, 150]),
        acceptance: randomPick<Acceptance>(['full', 'full', 'full', 'partial']),
      });
    }
    if (Math.random() > 0.15) {
      logs.push({
        id: makeId(day, 'food2'),
        key: 'comida',
        timestamp: dayBase - (new Date(dayBase).getHours() - 19) * 60 * 60 * 1000,
        quantity: randomPick([80, 100, 120, 150]),
        acceptance: randomPick<Acceptance>(['full', 'full', 'partial', 'refused']),
      });
    }

    // Água: 1-3x/dia
    const waterCount = 1 + Math.floor(Math.random() * 3);
    for (let w = 0; w < waterCount; w++) {
      logs.push({
        id: makeId(day, `water${w}`),
        key: 'agua',
        timestamp: dayBase - (10 + w * 4) * 60 * 60 * 1000,
        volumeMl: randomPick([50, 80, 100, 150, 200]),
      });
    }

    // Passeio: 1x/dia (cachorro)
    if (Math.random() > 0.2) {
      const walkLog: ActionLog = {
        id: makeId(day, 'walk'),
        key: 'passeio',
        timestamp: dayBase - (8 + Math.random() * 10) * 60 * 60 * 1000,
        duration: randomPick([15, 20, 25, 30, 35, 45, 60]),
        subActions: Math.random() > 0.3 ? ['xixi'] : Math.random() > 0.6 ? ['xixi', 'coco'] : [],
      };
      if (Math.random() > 0.9) {
        walkLog.note = randomPick([
          'Muitos latidos — assustado com buzinas',
          'Cruzou com outro cachorro, tudo bem',
          'Super animado hoje',
          'Correu atrás de um pombo 😂',
        ]);
      }
      logs.push(walkLog);
    }

    // Xixi/Cocô avulsos
    if (Math.random() > 0.5) {
      logs.push({
        id: makeId(day, 'xixi'),
        key: 'xixi',
        timestamp: dayBase - (14 + Math.random() * 6) * 60 * 60 * 1000,
        appearance: randomPick<Appearance>(['normal', 'normal', 'normal', 'abnormal']),
      });
    }
    if (Math.random() > 0.6) {
      logs.push({
        id: makeId(day, 'coco'),
        key: 'coco',
        timestamp: dayBase - (16 + Math.random() * 4) * 60 * 60 * 1000,
        consistency: randomPick<Consistency>(['normal', 'normal', 'normal', 'soft']),
        appearance: 'normal',
      });
    }

    // Banho: 1x/semana (dia 6 e 12)
    if (day === 6 || day === 12) {
      logs.push({
        id: makeId(day, 'bath'),
        key: 'banho',
        timestamp: dayBase - 15 * 60 * 60 * 1000,
        note: day === 6 ? 'Banho em casa' : 'Pet shop — banho e tosa',
      });
    }
  }

  return logs;
}

// ─── Pesos (3 registros, leve ganho) ──────────────────────────

export function seedWeightHistory(): WeightEntry[] {
  const now = new Date();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return [
    { id: makeId(0, 'w1'), peso: 4.8, data: fmt(new Date(now.getTime() - 30 * DAY_MS)) },
    { id: makeId(0, 'w2'), peso: 5.0, data: fmt(new Date(now.getTime() - 14 * DAY_MS)) },
    { id: makeId(0, 'w3'), peso: 5.2, data: fmt(new Date(now.getTime() - 2 * DAY_MS)) },
  ];
}

// ─── Vacinas ──────────────────────────────────────────────────

export function seedVaccines(): Vaccine[] {
  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * DAY_MS);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return [
    {
      id: makeId(0, 'vac1'),
      nome: 'V10 (Polivalente)',
      data: fmt(yearAgo),
      proxima: fmt(new Date(yearAgo.getTime() + 380 * DAY_MS)),
      veterinario: 'Dra. Marina Silva',
      lote: 'L2024-078',
    },
    {
      id: makeId(0, 'vac2'),
      nome: 'Antirrábica',
      data: fmt(new Date(now.getTime() - 180 * DAY_MS)),
      proxima: fmt(new Date(now.getTime() + 180 * DAY_MS)),
      veterinario: 'Dra. Marina Silva',
    },
  ];
}

// ─── Consultas ────────────────────────────────────────────────

export function seedAppointments(): Appointment[] {
  const now = new Date();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return [
    {
      id: makeId(0, 'appt1'),
      titulo: 'Check-up anual',
      data: fmt(new Date(now.getTime() + 15 * DAY_MS)),
      hora: '14:30',
      veterinario: 'Dra. Marina Silva',
      nota: 'Levar resultado dos exames',
    },
  ];
}
