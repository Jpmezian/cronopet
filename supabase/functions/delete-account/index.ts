// ═══════════════════════════════════════════════════════════════
// ═══ Edge Function: delete-account                            ═══
// ═══════════════════════════════════════════════════════════════
//
// Apple §5.1.1(v) (vigente 30/06/2022) + Google (vigente 31/05/2024)
// exigem que apps com conta tenham deleção REAL — não só logout local.
// Esta function faz CASCADE DELETE de todos os dados do user no
// Supabase e chama auth.admin.deleteUser pra invalidar a conta.
//
// PRIVACIDADE:
//   - Operação irreversível. Documentado em cronopet.com.br/excluir-conta
//   - Dados em tabelas com user_id ou via family_members são removidos
//   - Logs do Supabase Auth retidos por 30 dias (audit trail) — depois
//     são purged pelo Supabase automaticamente
//
// SEGURANÇA:
//   - Requer JWT válido do user (verify_jwt = true via config.toml)
//   - SERVICE_ROLE_KEY usado APENAS aqui no servidor pra deletar
//     (RLS bloquearia DELETE com anon key)
//   - User só consegue deletar SI MESMO (extraído do JWT)
//
// DEPLOY:
//   1. supabase functions deploy delete-account
//   2. config.toml já tem `verify_jwt = true` (precisa adicionar)
//   3. SUPABASE_SERVICE_ROLE_KEY já está como secret no projeto
//
// USO (cliente):
//   POST https://<project>.supabase.co/functions/v1/delete-account
//   Authorization: Bearer <user_jwt>
//   → 204 No Content (sucesso)
//   → 401 (JWT inválido/expirado)
//   → 500 (erro interno — logado em Sentry)
// ═══════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// CORS allowlist (mesmo padrão da health-analysis — R3 H-3 audit)
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

  // Extrai user JWT do header Authorization (validado pelo verify_jwt
  // do Supabase Functions runtime — se chegou aqui, JWT é válido)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'missing_token' }, cors);
  }

  // Cliente com JWT do user — pra extrair user.id do token
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json(401, { error: 'invalid_token' }, cors);
  }

  const userId = userData.user.id;

  // Cliente com service-role pra fazer DELETE (bypass RLS)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // ─── CASCADE DELETE em todas as tabelas com user_id ─────────
    // Ordem importa: tabelas-filhas primeiro, pais depois.
    //
    // OBS sobre família: se user é OWNER de algum family_group, deve
    // transferir ownership ou deletar o grupo. Política atual: deleta
    // o grupo inteiro (pets + logs + membros). Outros membros perdem
    // acesso. Documentado em /excluir-conta + Política de Privacidade.

    // 1. Achar groups onde user é owner — vamos deletar esses grupos
    const { data: ownedGroups } = await adminClient
      .from('family_groups')
      .select('id')
      .eq('owner_id', userId);

    const groupIds = (ownedGroups ?? []).map((g: any) => g.id);

    // 2. Deletar dados dos grupos owned (CASCADE FK cuida da maioria,
    //    mas vamos explicitar pra ter certeza)
    if (groupIds.length > 0) {
      await adminClient.from('action_logs').delete().in('group_id', groupIds);
      await adminClient.from('vaccines').delete().in('group_id', groupIds);
      await adminClient.from('appointments').delete().in('group_id', groupIds);
      await adminClient.from('weight_entries').delete().in('group_id', groupIds);
      await adminClient.from('pets').delete().in('group_id', groupIds);
      await adminClient.from('family_members').delete().in('group_id', groupIds);
      await adminClient.from('family_groups').delete().in('id', groupIds);
    }

    // 3. Deletar membership em grupos de outros owners (sai sem deletar
    //    o grupo)
    await adminClient.from('family_members').delete().eq('user_id', userId);

    // 4. Deletar logs/dados criados por este user em grupos compartilhados
    //    (campo user_id no action_logs por exemplo)
    await adminClient.from('action_logs').delete().eq('user_id', userId);

    // 5. Profile (FK pra auth.users)
    await adminClient.from('profiles').delete().eq('id', userId);

    // 6. Subscriptions — manter histórico anonimizado seria ideal,
    //    mas pra LGPD strict deletar tudo. RevenueCat tem registro
    //    próprio pra reconciliação.
    await adminClient.from('subscriptions').delete().eq('user_id', userId);

    // 7. Finalmente, deletar o auth.user (invalida JWT)
    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('auth.admin.deleteUser falhou:', delErr.message);
      return json(500, { error: 'auth_delete_failed', detail: delErr.message }, cors);
    }

    // 204 No Content — sucesso
    return new Response(null, { status: 204, headers: cors });

  } catch (err: any) {
    console.error('delete-account erro:', err?.message ?? err);
    return json(500, { error: 'internal_error' }, cors);
  }
});
