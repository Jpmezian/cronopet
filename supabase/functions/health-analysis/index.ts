// ═══════════════════════════════════════════════════════════════
// ═══ Edge Function: health-analysis                          ═══
// ═══════════════════════════════════════════════════════════════
//
// Recebe payload anonimizado do app (services/AIInsights.ts) e
// devolve análise estruturada chamando a API da Anthropic.
//
// PRIVACIDADE:
//   - Payload já vem sem PII do app (sem nome, foto, email, ID).
//   - Esta function não persiste nada — request → API → response, fim.
//   - Se quiser logging para debugging, use Sentry com sampling baixo.
//
// SEGURANÇA:
//   - ANTHROPIC_API_KEY fica APENAS aqui no servidor (nunca no bundle).
//   - Auth opcional via JWT do Supabase (recomendado pra production).
//   - Rate limit por IP/user via Supabase Edge Runtime built-in.
//
// DEPLOY:
//   1. Instalar Supabase CLI: brew install supabase/tap/supabase
//   2. supabase login
//   3. supabase link --project-ref qhbsmvuwuiupdqdrrdov
//   4. supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
//   5. supabase functions deploy health-analysis
//
// O endpoint resultante (https://qhbsmvuwuiupdqdrrdov.supabase.co/
// functions/v1/health-analysis) deve ir em EXPO_PUBLIC_AI_ENDPOINT.
// ═══════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// ─── Config ──────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

// CORS allowlist — security audit 2026-05-21 (H-3).
// Antes: ALLOW_ORIGIN=* default. Risco: qualquer site no mundo podia
// chamar a function do navegador (com JWT vazado / capturado / etc).
// Agora: allowlist explícita do app (custom scheme) + web origin.
// `ALLOW_ORIGIN` env var ainda dá override pra dev local — mas em PROD
// configurar EXATAMENTE as origens válidas, nada de wildcard.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://cronopet.com.br',
  'cronopet://',       // iOS deep link
  'cronopet-dev://',   // dev variant
  'cronopet-stg://',   // staging variant
];
const ENV_OVERRIDE = Deno.env.get('ALLOW_ORIGIN');
const ALLOWED_ORIGINS = ENV_OVERRIDE
  ? ENV_OVERRIDE.split(',').map((o) => o.trim())
  : DEFAULT_ALLOWED_ORIGINS;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  // Echo back só se for da allowlist. Caso contrário, devolve o primeiro
  // permitido (browser bloqueia, mas mantém o response funcional pra
  // clientes nativos que não respeitam CORS).
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',  // CDN-correct: cache key inclui Origin
  };
}

// ─── System prompt — define a "personalidade" e os limites do modelo ──

const SYSTEM_PROMPT = `Você é um assistente VETERINÁRIO INFORMACIONAL embarcado num app de cuidado de pets brasileiro. Sua função é analisar dados estruturados sobre um pet e devolver observações úteis em português brasileiro claro.

REGRAS ABSOLUTAS:
1. NUNCA diagnostique. Sempre escreva "pode ser", "vale investigar", "considere consultar o veterinário".
2. NUNCA prescreva remédios, doses, dietas curativas ou tratamentos específicos.
3. Sempre encerre reforçando que avaliação por veterinário em pessoa é insubstituível.
4. Use o contexto da raça (breedContext) para enquadrar achados — ex: cansaço em Cavalier King Charles tem leitura diferente de cansaço em Vira-lata.
5. Cruze contagens/agregados dos últimos 30 dias com predisposições conhecidas. Quando algo bate, mencione explicitamente.
6. Tom: claro, técnico mas leigo-friendly, sem alarmismo. Frases curtas.
7. Se os dados são insuficientes (poucos registros), reconheça isso e peça pro tutor registrar mais antes de concluir.

FORMATO DE SAÍDA OBRIGATÓRIO — JSON puro, sem markdown, sem texto antes/depois:
{
  "summary": "string — 2-3 frases panorama geral do que os dados mostram",
  "observations": ["string — bullet curto sobre algo notável", "string — outro ponto", "..."],
  "suggestions": ["string — sugestão de o que monitorar / perguntar ao vet", "..."],
  "overallSeverity": "low" | "medium" | "high",
  "model": "claude-haiku-4-5"
}

overallSeverity:
- "low" = nada chama atenção, rotina parece saudável
- "medium" = há sinais que valem acompanhamento, sem urgência
- "high" = padrão preocupante, recomenda-se procurar veterinário em breve

Lembre: você está olhando AGREGADOS de 30 dias, não detalhes clínicos. Seja sóbrio. Limite observations e suggestions a 4 itens cada.`;

// ─── Handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  const cors = corsHeaders(req);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, cors);
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('[health-analysis] ANTHROPIC_API_KEY missing in secrets');
    return json({ error: 'Server not configured' }, 500, cors);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  // Validação mínima — payload tem que ter pet + last30Days
  if (!payload?.pet || !payload?.last30Days) {
    return json({ error: 'Invalid payload shape' }, 400, cors);
  }

  // Sanitização defensiva: rejeita campos suspeitos de PII que o cliente
  // não deveria ter mandado (nome, foto, email, user_id, lat/long).
  if (containsLikelyPII(payload)) {
    console.warn('[health-analysis] Rejecting payload — likely PII detected');
    return json({ error: 'Payload rejected by privacy check' }, 422, cors);
  }

  // Monta a mensagem do usuário pro Claude
  const userMessage = `Analise os dados deste pet e devolva o JSON conforme a especificação:

${JSON.stringify(payload, null, 2)}

Lembre-se: APENAS JSON na resposta, sem markdown, sem texto introdutório.`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[health-analysis] Claude API error', claudeRes.status, errText);
      // Não vazamos detalhes do erro do provider pro cliente
      return json({ error: 'Upstream provider error' }, 502, cors);
    }

    const claudeData = await claudeRes.json();
    const text: string = claudeData?.content?.[0]?.text ?? '';

    // Extrai o JSON da resposta. Em DEV o modelo às vezes embala em ```json …```
    const jsonText = extractJson(text);
    if (!jsonText) {
      console.error('[health-analysis] No JSON in model output:', text.slice(0, 200));
      return json({ error: 'Invalid response from AI' }, 502, cors);
    }

    const analysis = JSON.parse(jsonText);

    // Validação do shape esperado pelo app
    if (
      typeof analysis.summary !== 'string' ||
      !Array.isArray(analysis.observations) ||
      !Array.isArray(analysis.suggestions) ||
      !['low', 'medium', 'high'].includes(analysis.overallSeverity)
    ) {
      console.error('[health-analysis] Bad shape from model', analysis);
      return json({ error: 'Invalid shape from AI' }, 502, cors);
    }

    // Garante o campo `model` mesmo se o modelo esqueceu
    if (!analysis.model) analysis.model = ANTHROPIC_MODEL;

    return json(analysis, 200, cors);
  } catch (err) {
    console.error('[health-analysis] Unhandled error', err);
    return json({ error: 'Internal error' }, 500, cors);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────

function json(body: unknown, status: number, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

/**
 * Extrai bloco JSON de uma resposta que pode vir embalada em markdown.
 */
function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;

  // Procura ```json … ``` ou ``` … ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Última tentativa: pega do primeiro `{` até o último `}`
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return null;
}

/**
 * Detecta tentativas óbvias de envio de PII pelo cliente.
 * Não é blindagem perfeita, é sanity check defensivo.
 */
function containsLikelyPII(payload: any): boolean {
  const json = JSON.stringify(payload).toLowerCase();
  const suspicious = ['email', '@gmail', '@hotmail', '@outlook', 'cpf', 'rg', 'lat":', 'lng":', 'longitude', 'latitude'];
  return suspicious.some((term) => json.includes(term));
}
