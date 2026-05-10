# Edge Function — `health-analysis`

Recebe um payload anonimizado de saúde do pet e devolve uma análise estruturada gerada pelo Claude (Anthropic).

## Por que existir

A `services/AIInsights.ts` no app é um wrapper agnóstico — ela manda o payload pra um endpoint HTTPS configurado em `EXPO_PUBLIC_AI_ENDPOINT`. Esta Edge Function é esse endpoint.

**Não dá pra colocar a chave da Anthropic dentro do app**: qualquer tutor que faça reverse engineering do bundle iOS/Android extrai a chave e usa de graça na sua conta. A Edge Function resolve isso — a chave fica só no Supabase, o app só fala com a Edge.

## Setup (uma vez)

```bash
# 1. Instale Supabase CLI
brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Linka com o projeto
cd /Users/joaopedromezian/CronoPet
supabase link --project-ref qhbsmvuwuiupdqdrrdov

# 4. Configura secrets no Supabase (não vai pro git)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXX

# Opcional: especifica modelo (default: claude-haiku-4-5)
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-5

# Opcional: restringe CORS pra produção
supabase secrets set ALLOW_ORIGIN=https://cronopet.app

# 5. Deploy da function
supabase functions deploy health-analysis
```

Depois do deploy, a URL final é:
```
https://qhbsmvuwuiupdqdrrdov.supabase.co/functions/v1/health-analysis
```

Coloca essa URL em `.env.prod`:
```
EXPO_PUBLIC_AI_ENDPOINT=https://qhbsmvuwuiupdqdrrdov.supabase.co/functions/v1/health-analysis
```

Rebuilda o app — `services/AIInsights.ts` detecta a variável e começa a chamar a function de verdade em vez do stub de DEV.

## Custos estimados

**Claude Haiku 4.5** (default):
- ~$1 / milhão tokens de input
- ~$5 / milhão tokens de output
- Cada análise consome ~1500 tokens input + ~400 tokens output ≈ **$0.0035 por análise**
- Cache de 24h no app (`AIInsights.ts`) garante ≤ 1 chamada por usuário por dia
- Com 1000 usuários ativos: ~$3.50/mês

Pra clientes Premium pagantes (R$ 14,90/mês): margem confortável.

## Testar local

```bash
# Roda localmente
supabase functions serve health-analysis --env-file .env.functions

# (.env.functions com ANTHROPIC_API_KEY=sk-ant-...)

# Testa com curl
curl -X POST http://localhost:54321/functions/v1/health-analysis \
  -H "Content-Type: application/json" \
  -d @sample-payload.json
```

## Rate limiting

Supabase Edge Runtime já limita ~1000 invocações/min por projeto. Se precisar de algo mais granular (por usuário/IP), adicione um middleware no início do handler usando KV ou Postgres.

## Observabilidade

Logs aparecem em:
- Supabase Dashboard → Functions → `health-analysis` → Logs
- Erros estruturados (4xx/5xx) já estão sendo `console.error`'ados pra facilitar busca

Pra produção considere integrar com Sentry usando `@sentry/deno`.

## Privacidade

A function aplica um `containsLikelyPII()` defensivo que rejeita payloads contendo campos suspeitos (email, CPF, lat/lng). Isso é redundante com o que o app já anonimiza, mas serve como fail-safe contra bugs do cliente.

A function **não persiste nada**. Request → Anthropic → Response. Sem logs de payload, sem cache de respostas no servidor.
