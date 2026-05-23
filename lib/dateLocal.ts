// ─── Datas em fuso LOCAL (não UTC) — R4-2 ──────────────────────
//
// Bug crítico achado no TestFlight: registros feitos à noite no Brasil
// (ex.: 21h BRT) apareciam como "hoje" na manhã seguinte. Root cause:
// `toISOString().slice(0,10)` retorna a data em UTC. Em UTC-3, registro
// das 21h BRT = 00h UTC do dia seguinte. Tanto o ts do log quanto o
// `getTodayString` ficavam "puxados pra frente" em UTC, então o filtro
// continuava casando errado.
//
// Solução: helpers que retornam YYYY-MM-DD usando timezone do device.
// `Intl.DateTimeFormat` com `sv-SE` dá formato ISO já no fuso local.
// Funciona em iOS/Android sem polyfill (RN modern runtime tem Intl).
//
// Migre TUDO que usava `.toISOString().slice(0,10)` pra cá. UTC fica só
// pra serialização (ts em ms já é absoluto, não precisa formatar).

/**
 * Hoje em "YYYY-MM-DD" no fuso horário do device.
 */
export function getLocalToday(): string {
  return formatLocalYMD(new Date());
}

/**
 * Converte um timestamp (ms) pra "YYYY-MM-DD" no fuso local.
 * Use pra agrupar/filtrar logs por dia.
 */
export function tsToLocalYMD(ts: number): string {
  return formatLocalYMD(new Date(ts));
}

function formatLocalYMD(d: Date): string {
  // sv-SE retorna "YYYY-MM-DD HH:MM:SS" — pegamos a primeira parte.
  // Já respeita o timezone do device sem precisar offset manual.
  // Fallback defensivo (caso Intl indisponível por algum motivo):
  // computamos manualmente.
  try {
    const ymd = new Intl.DateTimeFormat('sv-SE', {
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(d);
    return ymd; // já vem "YYYY-MM-DD"
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
