// ═══════════════════════════════════════════════════════════════
// ═══ Edge Function: check-premium-grant                       ═══
// ═══════════════════════════════════════════════════════════════
//
// Verifica se o user logado tem grant manual de Premium na tabela
// `public.premium_grants`. Chamada pelo AuthService após login +
// no cold start (getSession). Resultado mescla com hardcoded de
// lib/devPremium.ts (fallback offline).
//
// SEGURANÇA:
//   - verify_jwt = true (config.toml) → assinatura validada antes
//     do handler. Email extraído do JWT, não do body — atacante
//     não consegue forjar email de outro user.
//   - SERVICE_ROLE_KEY usado APENAS aqui (RLS bloqueia anon).
//   - Retorna mínimo necessário: { granted, plan, expiresAt }.
//     Não vaza outras infos da tabela (granted_by, notes, etc).
//
// CORS:
//   - Mesma allowlist das outras functions (cronopet.com.br + custom
//     schemes do app). Bloqueia chamadas de origem desconhecida.
//
// DEPLOY:
//   supabase functions deploy check-premium-grant --project-ref qhbsmvuwuiupdqdrrdov
//
// USO (cliente):
//   POST /functions/v1/check-premium-grant
//   Authorization: Bearer <user_jwt>
//   → 200 { granted: true,  plan: 'annual', expiresAt: null }
//   → 200 { granted: false }
//   → 401 (JWT inválido)
// ═══════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ALLOWED_ORIGINS = [
  'https://cronopet.com.br',
  'cronopet://',
  'cronopet-dev://',
  'cronopet-stg://',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(status: number, body: Record<string, any>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, cors);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'server_misconfigured' }, cors);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'missing_token' }, cors);
  }

  // Cliente com JWT → extrai user.email confiável (assinatura JÁ
  // validada pelo verify_jwt do runtime)
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.email) {
    return json(401, { error: 'invalid_token' }, cors);
  }

  const email = userData.user.email.trim().toLowerCase();

  // Cliente admin pra consultar tabela (RLS bloquearia user-context)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data, error } = await adminClient
      .from('premium_grants')
      .select('plan, expires_at, active')
      .eq('email', email)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('premium_grants query erro:', error.message);
      return json(500, { error: 'query_failed' }, cors);
    }

    if (!data) {
      return json(200, { granted: false }, cors);
    }

    // Verifica expiração (NULL = lifetime)
    const now = Date.now();
    const expiresAtMs = data.expires_at ? new Date(data.expires_at).getTime() : null;
    if (expiresAtMs !== null && expiresAtMs < now) {
      return json(200, { granted: false, reason: 'expired' }, cors);
    }

    return json(200, {
      granted: true,
      plan: data.plan,
      expiresAt: expiresAtMs,
    }, cors);

  } catch (err: any) {
    console.error('check-premium-grant erro:', err?.message ?? err);
    return json(500, { error: 'internal_error' }, cors);
  }
});
