# Premium grants — manual de operação

> Como conceder Premium pra alguém sem cobrar via RevenueCat. Pra founder/sócios/família/beta testers/influencers/parceiros/compensações.

---

## Como funciona em 30 segundos

1. **Você** roda um `INSERT` no SQL Editor do Supabase (ou edita `lib/devPremium.ts` pra founders permanentes).
2. **User** faz login no app (ou só abre, se já tava logado).
3. **AuthService** chama Edge Function `check-premium-grant`.
4. Edge Function lê o email do JWT, consulta `premium_grants`, retorna `{ granted, plan, expiresAt }`.
5. Store seta `isPremium=true` + persiste no MMKV. Pronto, vê Pro na hora.

---

## Duas camadas

| Camada | Onde | Quando usar | Como adicionar |
|---|---|---|---|
| **Hardcoded** | `lib/devPremium.ts` → `DEV_PREMIUM_EMAILS_RAW` | Founder, sócios. **Funciona offline** (cold start em modo avião) | Editar array + EAS build + submit |
| **Remoto** | tabela `public.premium_grants` no Supabase | Tudo o resto: beta testers, family, influencer, comp | `INSERT` SQL — vale no próximo login |

Os dois rodam juntos. Hardcoded primeiro (sync). Remoto depois (async, sobrescreve se backend tiver dado mais novo).

---

## Adicionar via SQL (caminho normal)

Acesso: https://supabase.com/dashboard/project/qhbsmvuwuiupdqdrrdov/sql/new

### Conceder vitalício (lifetime)

```sql
insert into public.premium_grants (email, plan, reason, granted_by, notes)
values (
  'pessoa@exemplo.com',  -- lowercase, mas citext aceita qualquer caso
  'annual',              -- 'monthly' | 'annual'
  'beta_tester',         -- ver enum abaixo
  'jp@cronopet.com.br',  -- você
  'TestFlight 3 — feedback Maio/2026'
);
```

### Conceder por tempo limitado (ex: 90 dias)

```sql
insert into public.premium_grants (email, plan, expires_at, reason, granted_by, notes)
values (
  'influencer@exemplo.com',
  'annual',
  now() + interval '90 days',
  'influencer',
  'jp@cronopet.com.br',
  'Parceria conteúdo Instagram — 90d trial'
);
```

### Listar grants ativos

```sql
select email, plan, reason, expires_at, granted_at, notes
from public.premium_grants
where active = true
  and (expires_at is null or expires_at > now())
order by granted_at desc;
```

### Revogar

```sql
update public.premium_grants
set active = false, notes = coalesce(notes,'') || ' | revogado em ' || now()::date
where email = 'pessoa@exemplo.com';
```

> Importante: o user revogado só perde Premium no próximo login + chamada do
> `check-premium-grant`. Antes disso, o último estado persistido em MMKV
> mantém. Em geral isso resolve sozinho em <24h (todo cold start consulta).
> Pra forçar imediato: orientar o user a deslogar e logar de novo.

### Deletar de vez

```sql
delete from public.premium_grants where email = 'pessoa@exemplo.com';
```

---

## Enum `reason`

| Valor | Quando usar |
|---|---|
| `founder` | Você, dono |
| `socio` | Sócio formal do negócio |
| `family` | Família/cônjuge/etc |
| `beta_tester` | TestFlight / Play Internal |
| `influencer` | Parceria de conteúdo |
| `partner` | Veterinário parceiro, integradora |
| `compensation` | Comp por bug crítico / reembolso |
| `manual` | Sem categoria específica (default) |

Se precisar de novo `reason`: editar o CHECK constraint na migration `005_premium_grants.sql` + criar `006_*.sql` com `alter table`.

---

## Adicionar founder via hardcoded (raríssimo)

Apenas se a pessoa precisa funcionar **mesmo offline** e em **cold start sem rede** (ex: você apresentando o app sem wifi).

1. Editar `lib/devPremium.ts`:
   ```ts
   const DEV_PREMIUM_EMAILS_RAW: readonly string[] = [
     'rocha3751@gmail.com',
     'viniciusvrcoutinho@gmail.com',
     'novo-founder@exemplo.com',  // ← novo
   ];
   ```
2. Adicionar **também** no banco (manter paridade pro dia que removermos hardcoded):
   ```sql
   insert into public.premium_grants (email, plan, reason, granted_by, notes)
   values ('novo-founder@exemplo.com', 'annual', 'founder', 'system', 'Add hardcoded + remoto')
   on conflict (email) do nothing;
   ```
3. `npm run typecheck`
4. EAS build (production) + submit (App Store + Play)

---

## Segurança & limitações

### Não é à prova de adversário
Se atacante descobre que `beta@x.com` está com Premium grant, ele pode criar conta com esse email e ganhar. Mitigações:
- Emails na tabela **não são públicos** (RLS bloqueia tudo exceto service_role)
- Supabase Auth exige confirmação por email → atacante não consegue reivindicar email alheio
- Para grants públicos (ex: campanha de influencer), gere emails únicos descartáveis

### RLS na tabela
A migration habilita RLS **sem nenhuma policy**. Resultado:
- `anon` → bloqueado
- `authenticated` → bloqueado (sim, mesmo o próprio user logado não consegue ver se ele tem grant)
- `service_role` → bypass (Edge Function + SQL Editor do dashboard)

Isso é proposital: a única forma de consultar é via Edge Function `check-premium-grant` que valida JWT antes.

### Edge Function
- `verify_jwt = true` no `config.toml` → JWT inválido = 401 antes do handler rodar
- Email vem do `auth.getUser()` (assinado), não do body → atacante não pode forjar email de outro user
- Service role key fica só no servidor (Supabase secret)

---

## Quando remover o hardcoded?

Hoje hardcoded e remoto coexistem por defesa em profundidade. Quando:
- O sistema remoto provou estabilidade (>3 meses sem incidente)
- Você tem confiança que cold start sem rede não vai te deixar sem Pro
- Founders aceitam re-logar se algo falhar

→ Esvaziar `DEV_PREMIUM_EMAILS_RAW` e deixar tudo na tabela. Aí toda mudança de grant é via SQL, sem rebuild.

---

## Troubleshooting

**"Adicionei o grant mas user não vê Pro"**
1. Confirma que user logou (não basta abrir o app se ele nunca logou)
2. Confirma email exato (case-insensitive já tá garantido via `citext`, mas typo é typo)
3. Olha logs da Edge Function: dashboard → Functions → check-premium-grant → Logs
4. Pede pro user deslogar + logar pra forçar nova chamada

**"User reportou que Pro sumiu"**
1. `select * from premium_grants where email = 'X'` — ainda tá active?
2. `expires_at` passou?
3. Edge Function caiu? Olha logs
4. Se RevenueCat também caiu E grant expirou → comportamento esperado

**"Como sei quem tem Pro grant agora?"**
```sql
select email, plan, reason, granted_at, expires_at, notes
from public.premium_grants
where active = true
order by granted_at desc;
```
