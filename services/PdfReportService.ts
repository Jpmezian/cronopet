import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import type { ActionLog, MedicalEvent, Vaccine, PetProfile, Appointment, WeightEntry } from '@/types/pet';
import { escapeHtml } from '@/lib/security';

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

// Formata timestamp em data/hora pt-BR
function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Formata YYYY-MM-DD sem bug de timezone (não passa pelo construtor Date)
function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Calcula idade a partir de YYYY-MM-DD
function calcAge(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const now   = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1)  return 'Recém-nascido';
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

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
  const now          = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentLogs = actionHistory.filter((l) => l.timestamp >= thirtyDaysAgo);

  // Contagem por ação nos últimos 30 dias + totais de quantidade/duração
  const counts: Record<string, number> = {};
  let totalFoodGrams = 0;
  let totalWalkMinutes = 0;
  recentLogs.forEach((l) => {
    counts[l.key] = (counts[l.key] ?? 0) + 1;
    if (l.key === 'comida' && l.quantity) totalFoodGrams += l.quantity;
    if (l.key === 'passeio' && l.duration) totalWalkMinutes += l.duration;
  });

  // Ocorrências com aparência alterada (últimos 30 dias)
  const abnormalCount = recentLogs.filter((l) => l.appearance === 'abnormal').length;

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

  // Agrupa logs por data
  const byDay: Record<string, ActionLog[]> = {};
  recentLogs.forEach((l) => {
    const d = new Date(l.timestamp).toLocaleDateString('pt-BR');
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(l);
  });

  // Peso ordenado
  const weightSorted = [...weightHistory].sort((a, b) => a.data.localeCompare(b.data));

  // Consultas ordenadas: recentes primeiro
  const apptSorted = [...appointments].sort((a, b) => b.data.localeCompare(a.data));

  const today = new Date().toISOString().slice(0, 10);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1c1917; background: #fff; font-size: 13px; }
    .page { max-width: 680px; margin: 0 auto; padding: 32px 28px; }

    .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #1c1917; padding-bottom: 20px; margin-bottom: 24px; }
    .pet-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #e7e5e4; }
    .pet-photo-placeholder { width: 80px; height: 80px; border-radius: 50%; background: #f5f5f4; display: flex; align-items: center; justify-content: center; font-size: 36px; }
    .header-info h1 { font-size: 26px; font-weight: 700; }
    .header-info p { color: #78716c; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; background: #1c1917; color: #fff; border-radius: 8px; padding: 4px 12px; font-size: 11px; font-weight: 600; margin-top: 6px; }

    .disclaimer { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #92400e; line-height: 1.6; }

    .section { margin-bottom: 28px; }
    .section-title { font-size: 16px; font-weight: 700; border-left: 4px solid #1c1917; padding-left: 12px; margin-bottom: 14px; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f5f5f4; padding: 8px 12px; text-align: left; font-weight: 600; color: #44403c; }
    td { padding: 8px 12px; border-bottom: 1px solid #f5f5f4; }
    tr:last-child td { border-bottom: none; }

    .day-block { margin-bottom: 16px; }
    .day-title { font-size: 13px; font-weight: 700; color: #44403c; margin-bottom: 6px; background: #f5f5f4; padding: 6px 10px; border-radius: 8px; }
    .log-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f9f9f9; }
    .log-label { font-weight: 600; font-size: 13px; min-width: 90px; }
    .log-time { color: #a8a29e; font-size: 12px; }
    .log-note { color: #78716c; font-size: 12px; font-style: italic; margin-top: 2px; }
    .log-photo { width: 120px; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 6px; }

    .vaccine-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .vaccine-name { font-weight: 700; font-size: 14px; color: #14532d; }
    .vaccine-detail { font-size: 12px; color: #16a34a; margin-top: 4px; line-height: 1.7; }

    .appt-card { border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .appt-future { background: #eff6ff; border: 1px solid #bfdbfe; }
    .appt-past { background: #f9fafb; border: 1px solid #e5e7eb; }
    .appt-name { font-weight: 700; font-size: 14px; color: #1d4ed8; }
    .appt-past .appt-name { color: #374151; }
    .appt-detail { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.7; }

    .weight-row { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f5f5f4; align-items: center; }
    .weight-val { font-size: 16px; font-weight: 700; color: #7c3aed; min-width: 70px; }
    .weight-meta { font-size: 12px; color: #78716c; }

    .medical-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
    .medical-type { font-weight: 700; font-size: 14px; color: #991b1b; }
    .medical-detail { font-size: 12px; color: #dc2626; margin-top: 4px; line-height: 1.7; }

    .footer { border-top: 1px solid #e7e5e4; padding-top: 16px; margin-top: 32px; text-align: center; color: #a8a29e; font-size: 11px; }
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
          <div class="appt-name">${E(appt.titulo)}${isFuture ? ' <span style="font-size:11px;font-weight:400;color:#3b82f6">(futuro)</span>' : ''}</div>
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
      ? '<p style="color:#a8a29e">Nenhuma vacina registrada.</p>'
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
      ? '<p style="color:#a8a29e">Nenhuma ocorrência registrada.</p>'
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
      ? '<p style="color:#a8a29e">Nenhum registro no período.</p>'
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
