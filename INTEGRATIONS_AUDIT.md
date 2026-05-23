# CronoPet — Audit de Integrações (pré-lançamento)

> Snapshot de 2026-05-23. Verifica TODAS as integrações externas e o que
> ainda precisa ser feito antes de soltar pro público na App Store.

**Legenda:**
- ✅ **OK** — pronto pra produção
- ⚠️ **ATENÇÃO** — funciona mas pode melhorar
- 🔴 **BLOQUEADOR** — release-blocking, não pode ir pro publico sem fix
- 📝 **AÇÃO MANUAL** — eu (claude) já fiz o que dá; falta passo seu

---

## 🔴 BLOQUEADORES (impedem release público)

### B-1: 🔴 RevenueCat NÃO está configurado em produção

**Estado atual:**
- `services/purchases.ts` está em **modo STUB** (não chama RC real).
- Razão: env var `EXPO_PUBLIC_REVENUECAT_IOS_KEY` não existe no EAS Production.
- Confirmado via `eas env:list production`.

**Consequência:**
- User clica "Assinar Premium" → stub finge premium localmente, Apple NÃO cobra
- Restore Purchases não funciona (não tem nada pra restaurar)
- Premium não sincroniza entre devices
- App Store reviewer vai rejeitar (botão de IAP que não cobra)

**Ação pendente (você):**
1. **App Store Connect:**
   - Criar 2 produtos auto-renewable em "Subscriptions":
     - `cronopet_premium_monthly` — R$ 14,90/mês — 7 dias trial
     - `cronopet_premium_yearly` — R$ 99,00/ano — 7 dias trial
   - Subscription Group: "CronoPet Premium"
   - Localizar pra pt-BR

2. **RevenueCat Dashboard** (https://app.revenuecat.com):
   - Criar projeto "CronoPet" se ainda não tem
   - App: `com.cronopet.app`
   - Entitlement: `premium` (ID literal — o código procura essa string)
   - Offering: "default" com 2 packages (`$rc_monthly` + `$rc_annual`)
   - Linkar com os produtos do ASC

3. **EAS env:**
   ```bash
   eas env:create production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --visibility sensitive
   ```
   (pegar key em RC > Project Settings > API Keys > Public iOS SDK)

4. Disparar nova build (`b6+`) e testar com TestFlight Sandbox.

### B-2: 🔴 Conta Apple Developer paga + agreements

**Estado:** Build #5 está no TestFlight (Internal) — significa que conta está paga e App Connect aceito.

**Pendente pra App Store público:**
- Paid Apps Agreement assinado (TestFlight Internal não exige; público exige)
- Tax forms preenchidos no ASC > Agreements, Tax, and Banking
- Bank account adicionado pra receber payout

**Verificar:** entre em https://appstoreconnect.apple.com/business e confirme "Active" pra Paid Apps. Se "Pending", IAP não vai ser aprovado pela Apple.

---

## ⚠️ ATENÇÃO (não bloqueia mas vale revisar)

### A-1: ⚠️ Domínio cronopet.com.br + email contato

**Atualmente declarado em `eas.json`:**
```json
"appleId": "contato@cronopet.com.br"
```

**Verificar:**
- Email contato@cronopet.com.br existe e recebe? (Apple manda confirmações pra cá)
- Domínio cronopet.com.br tem MX configurado?
- Privacy Policy + Terms hospedados em URL pública? Apple exige URL pra app com IAP

**Ação:** se ainda não tem, criar páginas em `cronopet.com.br/privacy` e `/terms`. Ferramenta rápida: Termly ou iubenda.

### A-2: ⚠️ App Privacy questionnaire no ASC

**Estado:** documentação em `APP_STORE_SUBMISSION.md` § "App Privacy" está pronta.

**Ação:** entre em ASC > App Information > App Privacy e preencha. Os dados coletados são:
- Diagnostics (Sentry) — não vinculado a identidade, opt-out
- Identifiers (PostHog/RC) — vinculado a user account, app functionality
- Health & Fitness — armazenado só localmente, NÃO enviado a servidor

Já temos `APP_STORE_SUBMISSION.md` com os toggles exatos.

### A-3: ⚠️ Apple Beta Review (External testing)

**Estado atual:** TestFlight Internal funciona (só você e seu sócio).

**Pra mais beta testers (familiares, friends):**
- Configurar External Testing no ASC
- Apple revisa o build (~24h) e libera link público compartilhável
- Cada external tester precisa aceitar via link, não vincula Apple Team

### A-4: ⚠️ Push Notifications — APNs

**Estado:** notificações **locais** funcionam (lembrete diário agendado pelo expo-notifications via CALENDAR trigger). Notificações **remotas** (server-side) NÃO estão configuradas.

**Não bloqueia v1** — feature é só lembrete local. Mas se quiser anúncio push do server (ex: "novo recurso", "promoção"), precisa:
- APNs key no Apple Developer
- Setar no EAS via `eas credentials -p ios`
- Backend trigger via expo-server-sdk ou direct APNs

### A-5: ⚠️ OpenWeatherMap (clima)

**Estado:** key `EXPO_PUBLIC_OWM_KEY` configurada no EAS Production ✅.

**Verificar:** plano free do OWM permite 1.000 calls/dia. Se o app passar de 500 users ativos, vai estourar quota. Considerar:
- Cache server-side via Edge Function (1 chamada/cidade/hora)
- Upgrade plano ($40/mês) — só vale com receita

Hoje cada user faz `useWeather` no mount do Home. Com 100 abertas/dia/user → 100k calls. Excederá em 10 users diários.

### A-6: ⚠️ Sentry — quota e PII scrubbing

**Estado:** init OK, `beforeSend` com PII scrub aplicado (M-4 da security audit).

**Verificar:**
- Quota plan free Sentry = 5k events/mês. Suficiente pra MVP.
- Confirmar via sentry.io > Settings > Subscription
- Se PostHog também tá logando, dobrar atenção pra não vazar PII em event properties (atributos custom)

---

## ✅ OK (não precisa fazer nada)

### O-1: ✅ Supabase (auth + DB + Edge Function)

- `EXPO_PUBLIC_SUPABASE_URL` ✅
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` ✅
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ✅
- Migration 004 aplicada em produção (SECURITY DEFINER hardening)
- Edge Function `health-analysis` deployada com `verify_jwt = true` (testado HTTP 401 ✓)
- RLS habilitado em todas as tabelas críticas (audit §3)
- PKCE flow no Supabase client (security H-2)

### O-2: ✅ Sentry

- DSN configurada em EAS Production
- `beforeSend` + `beforeBreadcrumb` removem email/IP/auth headers
- Source maps upload via `SENTRY_AUTH_TOKEN` (secret, só EAS builder)
- Plugin `@sentry/react-native/expo` registrado em app.json

### O-3: ✅ Encryption / Secure Storage

- MMKV criptografado com chave do Keychain (AES-256)
- `expo-secure-store` plugin no app.json
- `ITSAppUsesNonExemptEncryption: false` declarado (sem exigência de export compliance)

### O-4: ✅ Permissões iOS

- Camera + Photo Library com strings localizadas em pt-BR
- Notifications com config no plugin
- Location pra clima (when-in-use)
- Android: blocked legacy permissions (READ/WRITE_EXTERNAL_STORAGE — não usadas)

### O-5: ✅ Bundle ID / Team

- iOS bundle: `com.cronopet.app` ✓
- Apple Team: `7RSGWY462K` (João Pedro Oliva Individual) ✓
- ASC App ID: `6770387252` ✓

### O-6: ✅ App Store Connect API Key (submissions automáticas)

- API Key `542J5J58HZ` cadastrada no EAS
- Submissões build #2, #3, #4, #5 todas non-interactive OK

---

## 🚨 Sequência sugerida pra ir AO PÚBLICO

```
1. (HOJE)   Criar produtos IAP no App Store Connect
2. (HOJE)   Setup RevenueCat dashboard + key no EAS prod
3. (HOJE)   Trigger nova build EAS (b6) c/ RC ativo
4. (HOJE)   Testar fluxo de compra no TestFlight Sandbox
              ▸ Subscribe → recebe entitlement
              ▸ Restore Purchases → reativa
              ▸ Cancel via Settings iOS → expira no fim do período
5. (D+1)    Preencher App Privacy + ASC store listing completa
6. (D+1)    Publicar Privacy Policy + Terms em cronopet.com.br
7. (D+2)    Submit pra App Review (esperar ~1-3 dias)
8. (D+5)    Release manual quando aprovar
```

**Checklist de teste TestFlight Sandbox** (faça ANTES de submit):
- [ ] Comprar plano anual → tela /premium reflete "Pro ativo até DATA"
- [ ] Sair do app, voltar → continua Pro
- [ ] Settings iOS > Apple ID > Subscriptions → aparece "CronoPet Premium"
- [ ] Cancelar via Settings iOS → continua até fim do período
- [ ] Restore Purchases em outro device sandbox → reativa
- [ ] Tela /premium não trava se RC down (graceful fallback)

---

## Outros pequenos pontos descobertos

- **B-1 + B-2 são os únicos release-blockers absolutos.** Tudo o resto roda.
- **Premium dev por email** (`lib/devPremium.ts`) funciona ortogonal ao RC — você + sócio ganham Pro sem precisar comprar, independente de B-1 estar resolvido.
- **TestFlight Internal** continua usável pra você + sócio + até 100 testers Internal (Internal tier do Apple Team).
- O cardápio dev pra simular IAP sem RC live: `services/purchases.ts:194` tem `priceString: 'R$ 14,90'` hardcoded — UI mostra esses preços mesmo em stub.

---

_Atualizar este doc sempre que mexer em integração externa. Bom checkpoint a cada release minor._
