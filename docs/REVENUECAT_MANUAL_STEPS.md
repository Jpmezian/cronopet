# RevenueCat — Passos manuais (dashboard)

> Tudo o que precisa de cliques no dashboard RevenueCat depois que os
> produtos forem criados via App Store Connect API (`scripts/asc_api.py`).
> Os passos abaixo NÃO podem ser automatizados via RC API porque alguns
> são one-time setup (offerings) e outros dependem de UI customizada.

---

## Pré-requisitos

- [ ] Conta RevenueCat criada (https://app.revenuecat.com/)
- [ ] App CronoPet criado no projeto RC (bundle `com.cronopet.app`)
- [ ] Entitlement `pro` criado (Project Settings → Entitlements)
- [ ] App Store Connect API key configurada no RC (Project Settings →
      Integrations → App Store Connect — RC precisa pra importar produtos
      automaticamente)
- [ ] Produtos IAP criados via `python scripts/asc_api.py create-products`
      e visíveis em App Store Connect com status "Ready to Submit"

---

## Passo 1 — Importar produtos do App Store

1. Abra o projeto CronoPet no RC dashboard
2. Vá em **Products** (sidebar esquerda)
3. Clique em **"+ New"** → **"Import from App Store"**
4. Selecione os 2 produtos:
   - `com.cronopet.app.premium.monthly`
   - `com.cronopet.app.premium.annual`
5. Confirme. RC vai pullar metadata (preço, trial, etc) da ASC API.

---

## Passo 2 — Ligar produtos ao entitlement `pro`

Para cada produto importado:

1. Clique no produto na lista
2. Em **Attached Entitlements**, clique **"+ Attach"**
3. Selecione **`pro`**
4. Save

Resultado: quando user comprar qualquer um dos 2 produtos, RC marca
`entitlements.active.pro` no `CustomerInfo`. O SDK no app reconhece e
`mapCustomerInfo` em `services/purchases.ts` retorna `isPremium: true`.

---

## Passo 3 — Configurar default offering

1. Sidebar → **Offerings**
2. Se ainda não existe um "default", clique **"+ New Offering"**:
   - Identifier: `default`
   - Description: `CronoPet Premium`
   - Mark as default: ✅
3. Dentro do offering, adicionar 2 packages:
   - Package 1:
     - Identifier: **`$rc_monthly`** (RC usa esse magic string pra reconhecer "monthly")
     - Product: `com.cronopet.app.premium.monthly`
   - Package 2:
     - Identifier: **`$rc_annual`**
     - Product: `com.cronopet.app.premium.annual`
4. Save

Resultado: `Purchases.getOfferings()` no app retorna esse offering como
`current`. O paywall em `app/premium.tsx` consome via
`current.availablePackages` ou `current.monthly` / `current.annual`.

---

## Passo 4 — Configurar webhook URL

1. Sidebar → **Project Settings** → **Integrations** → **Webhooks**
2. Clique **"+ New Webhook"** ou edita o existente
3. **URL**:
   ```
   https://qhbsmvuwuiupdqdrrdov.supabase.co/functions/v1/revenuecat-webhook
   ```
4. **Authorization Header**:
   - Header name: `Authorization`
   - Header value: `Bearer <TOKEN>` onde `<TOKEN>` está em:
     ```
     ~/cronopet-credentials/revenuecat-webhook-token.txt
     ```
     Conteúdo (64 hex chars). Não comitar.
5. **Events**: marcar TODOS:
   - INITIAL_PURCHASE
   - RENEWAL
   - NON_RENEWING_PURCHASE
   - TRIAL_STARTED
   - TRIAL_CONVERTED
   - TRIAL_CANCELLED
   - CANCELLATION
   - UNCANCELLATION
   - EXPIRATION
   - BILLING_ISSUE
   - PRODUCT_CHANGE
   - SUBSCRIBER_ALIAS *(log apenas mas não custa receber)*
   - TRANSFER *(idem)*
6. **Environments**: SANDBOX **e** PRODUCTION (queremos testar em sandbox antes)
7. Save. RC vai mandar um evento `TEST` quando salvar — deve retornar
   200 OK no log do RC.

### Setar token na Edge Function (Supabase)

Antes do passo 4 funcionar, precisa setar a env var na função:

```bash
# Pegar token gerado
TOKEN=$(cat ~/cronopet-credentials/revenuecat-webhook-token.txt)

# Setar como secret no projeto Supabase
supabase secrets set REVENUECAT_WEBHOOK_AUTH_TOKEN="$TOKEN" \
  --project-ref qhbsmvuwuiupdqdrrdov
```

Ou via dashboard: **Project Settings → Edge Functions → Secrets** →
adicionar `REVENUECAT_WEBHOOK_AUTH_TOKEN` com o valor do arquivo.

---

## Passo 5 — Pegar API keys de produção

1. Sidebar → **Project Settings** → **API Keys**
2. **Não use** as `test_xxx` keys (são pra sandbox)
3. Copie:
   - **Apple App Store (iOS)**: key começa com `appl_`
   - **Google Play Store (Android)**: key começa com `goog_`

---

## Passo 6 — Adicionar keys ao app

### Local (.env.prod)

```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
```

### EAS Build (production builds)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_xxx"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_xxx"
```

Próxima build EAS Production vai injetar via `process.env.EXPO_PUBLIC_*`
e `services/purchases.ts` detecta presença das keys e vira modo `live`
em vez de `stub`.

---

## Validação end-to-end

Depois de tudo acima:

1. Cria conta sandbox no App Store Connect (Users and Access → Sandbox Testers)
2. No iPhone real (não simulador): Settings → App Store → Sign Out (Apple ID
   de prod) → faz signIn com sandbox account
3. Build TestFlight ou build local (`eas build --platform ios --profile production`)
4. Instala, faz signUp no app, vai pra paywall, clica em "Premium Mensal"
5. Confirma compra com Touch/Face ID (sandbox aceita pagamento fake)
6. Verifica no DB Supabase:
   ```sql
   SELECT * FROM public.subscriptions ORDER BY purchased_at DESC LIMIT 5;
   ```
   Deve mostrar uma row com status='active', is_trial=true, expires_at ~7
   dias no futuro (trial).
7. Verifica `is_pro()`:
   ```sql
   SELECT public.is_pro('<seu-user-id>');
   -- deve retornar true
   ```
8. Cancela via Settings iOS → App Store → Subscriptions → CronoPet → Cancel
9. RC envia `CANCELLATION` evento → webhook atualiza row pra status='cancelled'
10. Aguarda expiração simulada (sandbox usa períodos curtos: 1 mês = 5min,
    1 ano = 1 hora) → RC envia `EXPIRATION` → status='expired',
    `is_pro` volta a false

---

## Troubleshooting

### Webhook retorna 401 mesmo com token correto
- Confirma que o token NÃO tem espaço/quebra de linha no final (`cat -A` no arquivo)
- Confirma que RC dashboard salvou o header com prefixo `Bearer ` (RC adiciona
  o `Bearer ` automaticamente em algumas configs, em outras não — testar)

### Webhook retorna 500
- Logs em **Supabase Dashboard → Edge Functions → revenuecat-webhook → Logs**
- Erro mais comum: `app_user_id` no payload não bate com nenhum `auth.users.id`.
  Confirma que `services/purchases.ts:124` está passando `userId` (não email).

### Produto não aparece no paywall do app
- `Purchases.getOfferings()` retorna `null` se RC SDK ainda não configurou.
  Aguarda 1-2s após `Purchases.configure()`.
- Confirma que o offering `default` está marcado como current no RC dashboard.
- Confirma que os 2 packages têm os identifiers exatos `$rc_monthly` e `$rc_annual`.
