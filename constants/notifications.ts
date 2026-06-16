// ═══════════════════════════════════════════════════════════════
// ═══ Constantes de notificações                              ═══
// ═══════════════════════════════════════════════════════════════
//
// Mensagens i18n-ready (só pt-BR por enquanto) + helper de seleção
// por janela temporal. Tone: caloroso, sem culpa, sem exclamação.
//
// Re-engajamento: dispara quando passa > 24h sem registro. Cresce
// gradativamente em afeto mas PARA depois de 96h (anti-spam) e só
// reinicia após 168h (1 semana).

export const REENGAGEMENT_NOTIFICATION_ID = 'cronopet.reengagement';

interface ReengagementWindow {
  /** Limite inferior (horas, inclusivo). */
  minH: number;
  /** Limite superior (horas, exclusivo). `Infinity` cobre extremo. */
  maxH: number;
  /** Template com `{pet}` substituído pelo nome. `null` = NÃO agenda. */
  message: string | null;
}

const REENGAGEMENT_WINDOWS_PT_BR: ReengagementWindow[] = [
  { minH:  24, maxH:  48, message: 'Como foi o dia de {pet}?' },
  { minH:  48, maxH:  72, message: '{pet} tá com saudade do registro' },
  { minH:  72, maxH:  96, message: 'Bora dar uma olhada no {pet}?' },
  // 96–168h: NÃO agenda (anti-spam — user pode estar de viagem, doente, etc)
  { minH:  96, maxH: 168, message: null },
  // >168h (1 semana): reinicia ciclo
  { minH: 168, maxH: Infinity, message: 'Como foi o dia de {pet}?' },
];

/**
 * Seleciona a mensagem de re-engajamento baseada em horas desde o
 * último registro. Retorna `null` quando NÃO deve agendar (janela
 * anti-spam ou input fora dos limites).
 *
 * @param hoursSinceLastLog Horas desde o `max(timestamp)` do pet ativo.
 * @param petName           Nome do pet ativo (substitui `{pet}` no template).
 *
 * Pura — testável isoladamente sem mock de Date/store.
 */
export function selectReengagementMessage(
  hoursSinceLastLog: number,
  petName: string,
): string | null {
  if (!Number.isFinite(hoursSinceLastLog) || hoursSinceLastLog < 24) return null;
  if (!petName) return null;

  const window = REENGAGEMENT_WINDOWS_PT_BR.find(
    (w) => hoursSinceLastLog >= w.minH && hoursSinceLastLog < w.maxH,
  );
  if (!window || !window.message) return null;

  return window.message.replace(/\{pet\}/g, petName);
}

/**
 * Próximo horário "sensato" pra disparar a notificação:
 * • Entre 9h e 21h local: agora + 1h (mas dentro do range)
 * • Fora desse range: 9h do dia seguinte (ou de hoje se for antes das 9h)
 *
 * Pura — recebe `now` como parâmetro pra testabilidade.
 */
export function nextSensibleTriggerTime(now: Date): Date {
  const result = new Date(now);
  const hour = result.getHours();

  if (hour < 9) {
    // Antes das 9h → agenda pra 9h de hoje
    result.setHours(9, 0, 0, 0);
    return result;
  }
  if (hour >= 21) {
    // Após 21h → 9h do dia seguinte
    result.setDate(result.getDate() + 1);
    result.setHours(9, 0, 0, 0);
    return result;
  }
  // Range válido — +1h pra dar respiro vs agora
  result.setHours(hour + 1, 0, 0, 0);
  return result;
}

/**
 * Anti-duplicação: só permite re-agendar se passou > N horas desde
 * o último agendamento. Evita stacking em foreground rápido seguido.
 */
export const REENGAGEMENT_RESCHEDULE_MIN_HOURS = 12;
