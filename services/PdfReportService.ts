import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { ActionLog, MedicalEvent, Vaccine, PetProfile, Appointment, WeightEntry } from '@/types/pet';
import { escapeHtml } from '@/lib/security';
import { getLocalToday } from '@/lib/dateLocal';
// getBreedHealthProfile/CATEGORY_LABELS/SEVERITY_LABELS REMOVIDOS no
// R2-9 — feedback do TestFlight de que predisposição racial no PDF
// pode ofender o veterinário (parece que o app tá ensinando ele).
// O conteúdo continua no app, mas não no relatório clínico.
import { analyzeHealth, type HealthInsight } from '@/services/HealthInsights';
import {
  fmtDateTime, fmtISO, calcAge, tolWord, riskWord, computeReportStats,
} from './pdfReportHelpers';

// ─── Alias local para deixar o template HTML mais legível ───
const E = escapeHtml;

// ─── Metadados ────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  comida:  '🍖 Comida',
  agua:    '💧 Água',
  passeio: '🐾 Passeio',
  xixi:    '🪣 Xixi',
  coco:    '💩 Cocô',
  banho:   '🛁 Banho',
};

const MEDICAL_LABELS: Record<string, string> = {
  vomito:        '🤢 Vômito',
  febre:         '🌡️ Febre',
  mancando:      '🦵 Mancando',
  diarreia:      '💧 Diarreia',
  coceira:       '🐾 Coceira',
  perda_apetite: '🍽️ Perda de apetite',
  outro:         '📋 Outro',
};

const ACCEPTANCE_LABELS: Record<string, string> = {
  full:    '😋 Comeu tudo',
  partial: '🥄 Parcial',
  refused: '🙅 Recusou',
};

const CONSISTENCY_LABELS: Record<string, string> = {
  normal: '✅ Consistência normal',
  soft:   '〰️ Fezes moles',
  liquid: '💧 Fezes líquidas',
  hard:   '⬛ Fezes duras',
};

// fmtDateTime, fmtISO, calcAge, tolWord, riskWord extraídos pra
// pdfReportHelpers.ts em 2026-05-17 — testáveis sem mock de expo-print.

// Converte URI local para base64 data URI para embutir no HTML
async function toBase64(uri: string): Promise<string | null> {
  try {
    if (uri.startsWith('http')) return uri;
    const base64 = await new File(uri).base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

// ─── Geração do relatório ─────────────────────────────────────

export async function generateVetReport(
  pet:            PetProfile,
  actionHistory:  ActionLog[],
  medicalEvents:  MedicalEvent[],
  vaccines:       Vaccine[],
  appointments:   Appointment[] = [],
  weightHistory:  WeightEntry[]  = [],
): Promise<void> {
  const now = Date.now();
  const stats = computeReportStats({
    actionHistory, weightHistory, appointments, now, windowDays: 30,
  });
  const { recentLogs, counts, totalFoodGrams, totalWalkMinutes, abnormalCount } = stats;

  // Insights heurísticos detectados a partir dos dados do tutor.
  // Perfil da raça foi removido do PDF (R2-9) — vai pro vet apenas
  // o que é evidência observável: padrões e estatísticas dos logs.
  const healthInsights = analyzeHealth({
    pet: { tipo: pet.tipo, raca: pet.raca, idealWeightKg: pet.idealWeightKg },
    actionHistory,
    weightHistory,
    medicalEvents,
  });

  // Foto do pet
  const petPhotoSrc = pet.foto ? await toBase64(pet.foto) : null;

  // Fotos dos logs (máx 20)
  const logsWithPhotos = recentLogs.filter((l) => l.photo).slice(0, 20);
  const photoMap: Record<string, string> = {};
  await Promise.all(
    logsWithPhotos.map(async (log) => {
      if (log.photo) {
        const src = await toBase64(log.photo);
        if (src) photoMap[log.id] = src;
      }
    })
  );

  // byDay / weightSorted / apptSorted vêm de `stats` (computeReportStats)
  const { byDay, weightSorted, apptSorted } = stats;
  const today = getLocalToday();

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    /* R3-9 (TestFlight): texto com cor "bege amarelado" estava ilegível
       no PDF. Cores warm-tertiary (#A09684, #7A6F5F) caíam abaixo de
       4.5:1 sobre branco. Migramos texto secundário pra ash-brown
       escuro (#5C493D = 8.2:1) e texto de apoio pra graphite com
       opacidade (#403A33 = ~10:1). Mantemos a paleta brand, só
       elevamos o nível dos tons. */
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1C1917; background: #fff; font-size: 13px; }
    .page { max-width: 680px; margin: 0 auto; padding: 32px 28px; }

    .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #2C2B27; padding-bottom: 20px; margin-bottom: 24px; }
    .pet-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #C9BFB1; }
    .pet-photo-placeholder { width: 80px; height: 80px; border-radius: 50%; background: #E0D9C4; display: flex; align-items: center; justify-content: center; font-size: 36px; }
    .header-info h1 { font-size: 26px; font-weight: 700; }
    .header-info p { color: #5C493D; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; background: #1C1917; color: #fff; border-radius: 8px; padding: 4px 12px; font-size: 11px; font-weight: 600; margin-top: 6px; }

    .disclaimer { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #78350f; line-height: 1.6; }

    .section { margin-bottom: 28px; }
    .section-title { font-size: 16px; font-weight: 700; color: #1C1917; border-left: 4px solid #04A29B; padding-left: 12px; margin-bottom: 14px; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #E0D9C4; padding: 8px 12px; text-align: left; font-weight: 700; color: #2C2B27; }
    td { padding: 8px 12px; border-bottom: 1px solid #E0D9C4; color: #1C1917; }
    tr:last-child td { border-bottom: none; }

    .day-block { margin-bottom: 16px; }
    .day-title { font-size: 13px; font-weight: 700; color: #2C2B27; margin-bottom: 6px; background: #E0D9C4; padding: 6px 10px; border-radius: 8px; }
    .log-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #E0D9C4; }
    .log-label { font-weight: 700; font-size: 13px; min-width: 90px; color: #1C1917; }
    .log-time { color: #5C493D; font-size: 12px; font-weight: 600; }
    .log-note { color: #2C2B27; font-size: 12px; font-style: italic; margin-top: 2px; }
    .log-photo { width: 120px; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 6px; }

    .vaccine-card { background: #EAFAF1; border: 1px solid #5DC3A8; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .vaccine-name { font-weight: 700; font-size: 14px; color: #024A47; }
    .vaccine-detail { font-size: 12px; color: #036E69; margin-top: 4px; line-height: 1.7; font-weight: 500; }

    .appt-card { border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .appt-future { background: #E5F7F3; border: 1px solid #5DC3A8; }
    .appt-past { background: #E0D9C4; border: 1px solid #C9BFB1; }
    .appt-name { font-weight: 700; font-size: 14px; color: #024A47; }
    .appt-past .appt-name { color: #2C2B27; }
    .appt-detail { font-size: 12px; color: #2C2B27; margin-top: 4px; line-height: 1.7; }

    .weight-row { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid #E0D9C4; align-items: center; }
    .weight-val { font-size: 16px; font-weight: 700; color: #024A47; min-width: 70px; }
    .weight-meta { font-size: 12px; color: #2C2B27; font-weight: 500; }

    .medical-card { background: #fee2e2; border: 1px solid #f87171; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .medical-type { font-weight: 700; font-size: 14px; color: #7f1d1d; }
    .medical-detail { font-size: 12px; color: #991b1b; margin-top: 4px; line-height: 1.7; font-weight: 500; }

    .footer { border-top: 1px solid #C9BFB1; padding-top: 16px; margin-top: 32px; text-align: center; color: #2C2B27; font-size: 11px; font-weight: 500; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    ${petPhotoSrc
      ? `<img src="${petPhotoSrc}" class="pet-photo" />`
      : `<div class="pet-photo-placeholder">🐾</div>`}
    <div class="header-info">
      <h1>${E(pet.nome)}</h1>
      <p>
        ${pet.raca && pet.raca !== 'Sem raça definida' ? E(pet.raca) + ' · ' : ''}
        ${pet.tipo === 'cachorro' ? 'Cachorro' : pet.tipo === 'gato' ? 'Gato' : 'Outro'}
        ${pet.nascimento ? ` · ${calcAge(pet.nascimento)} (nasc. ${fmtISO(E(pet.nascimento))})` : ''}
      </p>
      <span class="badge">Relatório gerado em ${fmtISO(today)}</span>
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    ⚠️ <strong>Aviso importante:</strong> Este relatório foi gerado automaticamente pelo app CronoPet com base nos registros feitos pelo tutor.
    O CronoPet não se responsabiliza pela saúde do animal e não substitui a avaliação de um médico veterinário.
    As informações aqui contidas servem exclusivamente como apoio para facilitar o acompanhamento clínico profissional.
  </div>

  ${renderHealthInsightsSection(healthInsights.filter((i) => i.category !== 'breed'))}

  <!-- Predisposições raciais e perfil-de-raça removidos do PDF em
       2026-05-23 (feedback R2-9): tutores ficavam apresentando "o
       cachorro é cavalier então tem predisposição a doença mitral"
       como diagnóstico ao veterinário, o que pode soar invasivo /
       como se o app estivesse tentando ensinar o vet a trabalhar.
       O conteúdo continua disponível NO APP (BreedHealthCard) pra
       o tutor saber a que ficar atento, mas não vai no relatório
       clínico que vai pra mão do profissional. -->

  ${pet.notes && pet.notes.trim() ? `
  <!-- Anotações do tutor (R3-8) — alergias, medicações, manias -->
  <div class="section">
    <div class="section-title">📝 Anotações do tutor</div>
    <p style="font-size:13px;color:#1f2937;line-height:1.55;white-space:pre-wrap">${E(pet.notes.trim())}</p>
  </div>
  ` : ''}

  <!-- Resumo (30 dias) -->
  <div class="section">
    <div class="section-title">📊 Resumo dos últimos 30 dias</div>
    <table>
      <thead>
        <tr><th>Atividade</th><th>Total de registros</th></tr>
      </thead>
      <tbody>
        ${Object.entries(ACTION_LABELS).map(([key, label]) => {
          let extra = '';
          if (key === 'comida' && totalFoodGrams > 0) extra = ` (${totalFoodGrams}g total)`;
          if (key === 'passeio' && totalWalkMinutes > 0) extra = ` (${totalWalkMinutes} min total)`;
          return `
          <tr>
            <td>${label}</td>
            <td><strong>${counts[key] ?? 0}</strong>${extra}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${abnormalCount > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;margin-top:14px;font-size:12px;color:#991b1b;line-height:1.6">
      ⚠️ <strong>Atenção:</strong> ${abnormalCount} ${abnormalCount === 1 ? 'ocorrência' : 'ocorrências'} com aparência alterada nos últimos 30 dias. Recomenda-se atenção veterinária.
    </div>
    ` : ''}
  </div>

  <!-- Peso -->
  ${weightSorted.length > 0 ? `
  <div class="section">
    <div class="section-title">⚖️ Histórico de Peso</div>
    ${weightSorted.slice().reverse().map((w) => `
      <div class="weight-row">
        <span class="weight-val">${w.peso.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg</span>
        <div>
          <div class="weight-meta">${fmtISO(E(w.data))}</div>
          ${w.nota ? `<div class="weight-meta" style="font-style:italic">${E(w.nota)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Consultas -->
  ${apptSorted.length > 0 ? `
  <div class="section">
    <div class="section-title">🗓️ Consultas e Compromissos</div>
    ${apptSorted.map((appt) => {
      const isFuture = appt.data >= today;
      return `
        <div class="appt-card ${isFuture ? 'appt-future' : 'appt-past'}">
          <div class="appt-name">${E(appt.titulo)}${isFuture ? ' <span style="font-size:11px;font-weight:400;color:#04A29B">(futuro)</span>' : ''}</div>
          <div class="appt-detail">
            📅 ${fmtISO(E(appt.data))}${appt.hora ? ` às ${E(appt.hora)}` : ''}
            ${appt.veterinario ? `<br/>👨‍⚕️ ${E(appt.veterinario)}` : ''}
            ${appt.nota ? `<br/><em>${E(appt.nota)}</em>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>
  ` : ''}

  <!-- Carteira de vacinação -->
  <div class="section">
    <div class="section-title">💉 Carteira de Vacinação</div>
    ${vaccines.length === 0
      ? '<p style="color:#A09684">Nenhuma vacina registrada.</p>'
      : vaccines.sort((a, b) => b.data.localeCompare(a.data)).map((v) => `
        <div class="vaccine-card">
          <div class="vaccine-name">${E(v.nome)}</div>
          <div class="vaccine-detail">
            📅 Aplicada em: <strong>${fmtISO(E(v.data))}</strong>
            ${v.proxima ? `<br/>🔁 Próxima dose: <strong>${fmtISO(E(v.proxima))}</strong>` : ''}
            ${v.veterinario ? `<br/>👨‍⚕️ Vet: ${E(v.veterinario)}` : ''}
            ${v.lote ? `<br/>🔖 Lote: ${E(v.lote)}` : ''}
            ${v.nota ? `<br/><em>${E(v.nota)}</em>` : ''}
          </div>
        </div>
      `).join('')}
  </div>

  <!-- Eventos de saúde -->
  <div class="section">
    <div class="section-title">🩺 Ocorrências de Saúde</div>
    ${medicalEvents.length === 0
      ? '<p style="color:#A09684">Nenhuma ocorrência registrada.</p>'
      : medicalEvents.sort((a, b) => b.timestamp - a.timestamp).map((e) => `
        <div class="medical-card">
          <div class="medical-type">${MEDICAL_LABELS[e.type] ?? E(e.type)}</div>
          <div class="medical-detail">
            🕒 ${fmtDateTime(e.timestamp)}
            ${e.note ? `<br/><em>"${E(e.note)}"</em>` : ''}
          </div>
        </div>
      `).join('')}
  </div>

  <!-- Logs detalhados -->
  <div class="section">
    <div class="section-title">📋 Registros detalhados (últimos 30 dias)</div>
    ${Object.keys(byDay).length === 0
      ? '<p style="color:#A09684">Nenhum registro no período.</p>'
      : Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a)).map(([date, logs]) => `
        <div class="day-block">
          <div class="day-title">${date}</div>
          ${logs.sort((a, b) => a.timestamp - b.timestamp).map((log) => `
            <div class="log-item">
              <div style="flex:1">
                <div style="display:flex;gap:12px;align-items:center">
                  <span class="log-label">${ACTION_LABELS[log.key] ?? E(log.key)}</span>
                  <span class="log-time">${fmtDateTime(log.timestamp)}</span>
                </div>
                ${log.note ? `<div class="log-note">"${E(log.note)}"</div>` : ''}
                ${log.quantity != null ? `<div class="log-note">⚖️ ${log.quantity}g</div>` : ''}
                ${log.duration != null ? `<div class="log-note">⏱ ${log.duration} min</div>` : ''}
                ${log.volumeMl != null ? `<div class="log-note">💧 ${log.volumeMl} ml</div>` : ''}
                ${log.acceptance ? `<div class="log-note">${ACCEPTANCE_LABELS[log.acceptance]}</div>` : ''}
                ${log.consistency ? `<div class="log-note">${CONSISTENCY_LABELS[log.consistency]}</div>` : ''}
                ${log.appearance === 'abnormal' ? `<div class="log-note" style="color:#dc2626">⚠️ Aparência alterada</div>` : ''}
                ${log.subActions?.length ? `<div class="log-note">+ ${log.subActions.map((s: string) => ACTION_LABELS[s] ?? s).join(', ')}</div>` : ''}
                ${log.photo && photoMap[log.id] ? `<img src="${photoMap[log.id]}" class="log-photo" />` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
  </div>

  <!-- Footer -->
  <div class="footer">
    Gerado pelo CronoPet · ${new Date().toLocaleString('pt-BR')} · Apenas para uso veterinário
  </div>

</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Relatório de saúde — ${E(pet.nome)}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

// ─── Helpers de renderização das novas seções ───────────────────────

/**
 * Renderiza os insights heurísticos detectados no momento de gerar o PDF.
 * Vai logo no topo (antes do resumo) pra que o veterinário veja primeiro
 * o que está acontecendo agora.
 */
function renderHealthInsightsSection(insights: HealthInsight[]): string {
  if (insights.length === 0) return '';

  const sevColor = (s: 'info' | 'warning' | 'alert') =>
    s === 'alert' ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' }
    : s === 'warning' ? { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' }
    : { bg: '#EAFAF1', border: '#9BE4C6', text: '#024A47' };

  const sevLabel = (s: 'info' | 'warning' | 'alert') =>
    s === 'alert' ? 'IMPORTANTE' : s === 'warning' ? 'ATENÇÃO' : 'AVISO';

  const items = insights.map((ins) => {
    const c = sevColor(ins.severity);
    return `
    <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 14px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:${c.text};letter-spacing:0.5px;margin-bottom:4px">${sevLabel(ins.severity)}</div>
      <div style="font-size:14px;font-weight:700;color:${c.text};margin-bottom:4px">${E(ins.title)}</div>
      <div style="font-size:12px;color:#374151;line-height:1.5;margin-bottom:4px">${E(ins.message)}</div>
      <div style="font-size:11px;color:#6b7280;line-height:1.4">${E(ins.suggestion)}</div>
    </div>`;
  }).join('');

  return `
  <!-- Insights de saúde detectados pelo app -->
  <div class="section">
    <div class="section-title">🩺 Sinais detectados pelo app</div>
    <p style="font-size:11px;color:#6b7280;margin-bottom:12px">
      Padrões identificados automaticamente cruzando os registros do tutor com regras clínicas. Não são diagnóstico.
    </p>
    ${items}
  </div>
  `;
}

// renderBreedProfileSection: REMOVIDO em 2026-05-23 (feedback R2-9).
// Vet pode interpretar "esta raça tem predisposição a X" como o app
// querendo ensinar o profissional. O conteúdo continua acessível ao
// tutor via BreedHealthCard no app, mas não vai pro PDF clínico.
//
// tolWord/riskWord vêm de pdfReportHelpers.ts — mantidos no import
// porque outros lugares podem usar no futuro (e o knip cuida disso).
