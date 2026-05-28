// ═══════════════════════════════════════════════════════════════
// ═══ Edge Function: health-analysis                          ═══
// ═══════════════════════════════════════════════════════════════
//
// Recebe payload anonimizado do app (services/AIInsights.ts) e
// devolve análise estruturada chamando a API da Anthropic.
//
// PRIVACIDADE:
//   - Payload já vem sem PII do app (sem nome, foto, email, ID).
//   - Esta function não persiste payload — request → API → response.
//   - Persiste apenas contadores de tokens em `ai_usage` (sem conteúdo).
//
// SEGURANÇA (auditoria 2026-05-24, findings #4 #12 #25):
//   - ANTHROPIC_API_KEY fica APENAS aqui no servidor.
//   - verify_jwt = true (config.toml) → JWT validado pelo runtime.
//   - is_pro(user_id) check → free users recebem 403 (paywall server-side).
//   - Cost cap mensal via ai_usage → 429 acima do limite por user/mês.
//   - Prompt caching no system prompt → input cacheado custa 10% (Anthropic).
//
// DEPLOY:
//   supabase functions deploy health-analysis --project-ref qhbsmvuwuiupdqdrrdov
// ═══════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ─── Config ──────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_TOKENS = 1024;

// Cost cap mensal por user (R$ 19,90 Pro ≈ $4 USD bruto, ~$2.80 líquido
// depois de Apple/Google 30%. Anthropic Haiku 4.5 = $1/$5 por MTok.
// 50 calls × 1024 tokens out = ~50K tokens out × $5 = $0.25/user/mês
// → margem >$2.50 por user Pro mesmo no pior caso). Ajustar via env.
const MONTHLY_CALL_CAP = Number(Deno.env.get('AI_MONTHLY_CALL_CAP') ?? '50');
const MONTHLY_TOKEN_OUT_CAP = Number(Deno.env.get('AI_MONTHLY_TOKEN_OUT_CAP') ?? '100000');

// CORS allowlist
const DEFAULT_ALLOWED_ORIGINS = [
  'https://cronopet.com.br',
  'cronopet://',
  'cronopet-dev://',
  'cronopet-stg://',
];
const ENV_OVERRIDE = Deno.env.get('ALLOW_ORIGIN');
const ALLOWED_ORIGINS = ENV_OVERRIDE
  ? ENV_OVERRIDE.split(',').map((o) => o.trim())
  : DEFAULT_ALLOWED_ORIGINS;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ─── System prompt — cacheado (prompt caching da Anthropic) ──────────
// System prompt é grande (~700 tokens) e estável → vira cache hit a
// partir da 2ª chamada do mesmo user no mesmo TTL (~5min default).
// Cache hits custam 10% do input regular.
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

// ─── Helpers ─────────────────────────────────────────────────────────

function json(body: unknown, status: number, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

function currentMonth(): string {
  // YYYY-MM em UTC pra evitar boundary issues
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return null;
}

function containsLikelyPII(payload: any): boolean {
  const json = JSON.stringify(payload).toLowerCase();
  const suspicious = ['email', '@gmail', '@hotmail', '@outlook', 'cpf', 'rg', 'lat":', 'lng":', 'longitude', 'latitude'];
  return suspicious.some((term) => json.includes(term));
}

// ─── Handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[health-analysis] Server misconfigured (envs missing)');
    return json({ error: 'server_misconfigured' }, 500, cors);
  }

  // ─── Auth: extrair user.id do JWT (verify_jwt já validou assinatura)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'missing_token' }, 401, cors);
  }

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.id) {
    return json({ error: 'invalid_token' }, 401, cors);
  }
  const userId = userData.user.id;

  // ─── Pro gate (finding #12): server-side. Cliente pode mentir.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: proCheck, error: proErr } = await admin.rpc('is_pro', { uid: userId });
  if (proErr) {
    console.error('[health-analysis] is_pro RPC error', proErr.message);
    return json({ error: 'auth_check_failed' }, 500, cors);
  }
  if (!proCheck) {
    return json({ error: 'pro_required', message: 'Recurso disponível apenas para assinantes Pro' }, 403, cors);
  }

  // ─── Rate limit / cost cap (finding #4)
  const month = currentMonth();
  const { data: usage, error: usageErr } = await admin
    .from('ai_usage')
    .select('calls, tokens_out')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (usageErr) {
    console.error('[health-analysis] ai_usage query error', usageErr.message);
    // Fail-closed: se não conseguimos checar usage, recusa pra não vazar.
    return json({ error: 'usage_check_failed' }, 500, cors);
  }

  if (usage) {
    if (usage.calls >= MONTHLY_CALL_CAP) {
      return json({
        error: 'rate_limited',
        message: `Limite mensal de ${MONTHLY_CALL_CAP} análises atingido. Aguarde o próximo mês.`,
        reset_at: `${month}-01 next month UTC`,
      }, 429, cors);
    }
    if (usage.tokens_out >= MONTHLY_TOKEN_OUT_CAP) {
      return json({
        error: 'token_cap_reached',
        message: 'Limite mensal de tokens atingido.',
      }, 429, cors);
    }
  }

  // ─── Parse + validar payload
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400, cors);
  }

  if (!payload?.pet || !payload?.last30Days) {
    return json({ error: 'invalid_payload_shape' }, 400, cors);
  }

  if (containsLikelyPII(payload)) {
    console.warn('[health-analysis] Rejecting payload — likely PII');
    return json({ error: 'payload_rejected_pii' }, 422, cors);
  }

  const userMessage = `Analise os dados deste pet e devolva o JSON conforme a especificação:

${JSON.stringify(payload, null, 2)}

Lembre-se: APENAS JSON na resposta, sem markdown, sem texto introdutório.`;

  // ─── Chamada Anthropic com prompt caching (finding #25)
  // system vira array de blocks pra suportar cache_control. O block do
  // SYSTEM_PROMPT fica cacheado por ~5min entre chamadas do mesmo user.
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        // anthropic-beta opcional pra cache control mais novo;
        // 'prompt-caching-2024-07-31' já é GA mas sem precisar header.
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[health-analysis] Claude API error', claudeRes.status, errText.slice(0, 300));
      return json({ error: 'upstream_provider_error' }, 502, cors);
    }

    const claudeData = await claudeRes.json();
    const text: string = claudeData?.content?.[0]?.text ?? '';
    const tokensIn = claudeData?.usage?.input_tokens ?? 0;
    const tokensOut = claudeData?.usage?.output_tokens ?? 0;

    const jsonText = extractJson(text);
    if (!jsonText) {
      console.error('[health-analysis] No JSON in model output:', text.slice(0, 200));
      // Bumpa usage mesmo em falha (Anthropic já cobrou os tokens)
      await admin.rpc('bump_ai_usage', {
        p_user_id: userId, p_month: month, p_tokens_in: tokensIn, p_tokens_out: tokensOut,
      }).catch(() => {});
      return json({ error: 'invalid_response_from_ai' }, 502, cors);
    }

    const analysis = JSON.parse(jsonText);

    if (
      typeof analysis.summary !== 'string' ||
      !Array.isArray(analysis.observations) ||
      !Array.isArray(analysis.suggestions) ||
      !['low', 'medium', 'high'].includes(analysis.overallSeverity)
    ) {
      console.error('[health-analysis] Bad shape from model', analysis);
      await admin.rpc('bump_ai_usage', {
        p_user_id: userId, p_month: month, p_tokens_in: tokensIn, p_tokens_out: tokensOut,
      }).catch(() => {});
      return json({ error: 'invalid_shape_from_ai' }, 502, cors);
    }

    if (!analysis.model) analysis.model = ANTHROPIC_MODEL;

    // Bumpa usage após sucesso. Não bloqueia resposta se falhar.
    await admin.rpc('bump_ai_usage', {
      p_user_id: userId, p_month: month, p_tokens_in: tokensIn, p_tokens_out: tokensOut,
    }).catch((e) => console.error('[health-analysis] bump_ai_usage failed', e?.message));

    return json(analysis, 200, cors);

  } catch (err) {
    console.error('[health-analysis] Unhandled error', err);
    return json({ error: 'internal_error' }, 500, cors);
  }
});
