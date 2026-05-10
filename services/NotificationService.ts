import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Constantes ────────────────────────────────────────────────

const CHANNEL_ID       = 'cronopet-daily';
const CHANNEL_APPT_ID  = 'cronopet-appointments';

// ─── Handler de foreground ─────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// ─── Helpers internos ──────────────────────────────────────────

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name:              'Lembretes Diários',
    importance:        Notifications.AndroidImportance.DEFAULT,
    vibrationPattern:  [0, 250, 250, 250],
    lightColor:        '#FBBF24',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_APPT_ID, {
    name:       'Consultas e Compromissos',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#60A5FA',
  });
}

// ─── API pública ───────────────────────────────────────────────

/**
 * Solicita permissão nativa de notificações.
 * @returns true se a permissão foi concedida.
 */
export async function requestPermissionsAsync(): Promise<boolean> {
  await ensureChannels();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda lembrete diário recorrente usando trigger CALENDAR.
 * Dispara todo dia no horário configurado pelo usuário.
 * @param petNome Nome do pet.
 * @param streak  Dias consecutivos atuais.
 * @param hour    Hora do lembrete (0-23).
 * @param minute  Minuto do lembrete (0-59).
 */
export async function scheduleDailyReminder(
  petNome:  string,
  streak:   number,
  hour:     number,
  minute:   number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CronoPet 🐾',
      body:  streak > 0
        ? `O(a) ${petNome} precisa de você! Não perca sua ofensiva de ${streak} dias 🔥`
        : `O(a) ${petNome} ainda espera pelos registros de hoje!`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      second:  0,
      repeats: true,
    },
  });
}

/**
 * Agenda aviso "streak em risco" às 21:00 caso o dia ainda não
 * esteja completo. Cancela sozinho se já passou das 21h.
 * @param petNome Nome do pet.
 * @param streak  Streak atual.
 */
export async function scheduleStreakAtRiskReminder(
  petNome: string,
  streak:  number,
): Promise<void> {
  const now  = new Date();
  const risk = new Date();
  risk.setHours(21, 0, 0, 0);

  // Só agenda se ainda faltam pelo menos 5 min para as 21h
  if (risk.getTime() - now.getTime() < 5 * 60 * 1000) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: streak > 0 ? `Ofensiva de ${streak} dias em risco! 🔥` : 'CronoPet 🐾',
      body:  `${petNome} ainda não tem comida e água registrados hoje. Não quebre a sequência!`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour:    21,
      minute:  0,
      second:  0,
      repeats: false,
    },
  });
}

/**
 * Agenda lembrete para uma consulta/compromisso.
 * Dispara 15 minutos antes do horário marcado.
 * @returns ID da notificação agendada (para cancelamento posterior).
 */
export async function scheduleAppointmentReminder(
  titulo: string,
  data:   string,   // YYYY-MM-DD
  hora?:  string,   // HH:MM
): Promise<string> {
  await ensureChannels();

  const [year, month, day] = data.split('-').map(Number);
  const [h, m] = hora ? hora.split(':').map(Number) : [9, 0];

  // Dispara 15 min antes
  const apptDate = new Date(year, month - 1, day, h, m, 0);
  const triggerDate = new Date(apptDate.getTime() - 15 * 60 * 1000);

  // Não agendar no passado
  if (triggerDate.getTime() <= Date.now()) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: `🗓️ ${titulo}`,
        body:  `Compromisso agendado para hoje${hora ? ` às ${hora}` : ''}.`,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_APPT_ID }),
      },
      trigger: null,
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🗓️ ${titulo}`,
      body:  `Compromisso em 15 minutos${hora ? ` (${hora})` : ''}.`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_APPT_ID }),
    },
    trigger: {
      type:  Notifications.SchedulableTriggerInputTypes.DATE,
      date:  triggerDate,
    },
  });
}

/**
 * Agenda uma push notification de saúde inteligente — disparada quando o
 * motor de insights detectou algo crítico que ainda não foi notificado.
 *
 * Diferenças vs `scheduleDailyReminder`:
 *   • Trigger único (não recorre)
 *   • Disparado pra horário sensato (manhã do próximo dia)
 *   • Texto vem do `personalizeInsight` — humano, não genérico
 *   • Canal de "consultas" (high importance) pra furar Modo Não Perturbe
 *
 * Retorna o ID da notification agendada (pra cancelar se o insight resolver).
 *
 * @param title    Título curto da notification (max ~30 chars)
 * @param body     Corpo (max ~110 chars pra renderizar bem em iOS lock screen)
 * @param fireAt   Quando disparar — default: amanhã 9h
 */
export async function scheduleSmartHealthAlert(
  title: string,
  body: string,
  fireAt?: Date,
): Promise<string> {
  await ensureChannels();

  const target = fireAt ?? nextMorning(9);

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_APPT_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
}

/** Próxima ocorrência da hora indicada — se já passou hoje, agenda pra amanhã */
function nextMorning(hour: number): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Cancela uma notificação específica pelo ID.
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancela todos os lembretes diários/streak agendados.
 * Preserva notificações de consultas (por ID).
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
