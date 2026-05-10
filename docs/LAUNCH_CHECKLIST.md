# CronoPet — Launch Checklist

Tudo o que precisa estar feito antes de submeter para App Store / Play Store.
Itens marcados ✅ já estão implementados em código. Itens marcados 🟡 dependem
de você (TI / contas / dashboards externos).

---

## 1. Infra & Ambientes

| Item | Status | Onde |
|---|---|---|
| Separar dev/prod (`.env.dev`, `.env.prod`) | ✅ | `.env.dev.example`, `.env.prod.example` |
| Scripts npm `start:dev`/`start:prod` etc | ✅ | `package.json` |
| `app.config.js` com APP_VARIANT (bundle id por env) | ✅ | `app.config.js` |
| `eas.json` com profiles dev/preview/production | ✅ | `eas.json` |
| Criar projeto Supabase **separado** para dev | 🟡 | https://app.supabase.com |
| Copiar `.env.dev.example` → `.env.dev` e preencher | 🟡 | terminal |
| Copiar `.env.prod.example` → `.env.prod` e preencher | 🟡 | terminal |
| Configurar EAS Secrets para production build | 🟡 | `eas secret:create --scope project` |
| Instalar `dotenv-cli`: `npm install` | 🟡 | terminal (já no package.json) |

---

## 2. Segurança

| Item | Status | Onde |
|---|---|---|
| MMKV criptografado com chave no Keychain | ✅ | `store/storage.ts` |
| BiometricLock opt-in | ✅ | `components/security/BiometricLock.tsx` |
| Input sanitization (escapeHtml, sanitizeName, etc) | ✅ | `lib/security.ts` |
| Rate limit auth (5/60s + 5min lockout) | ✅ | `lib/security.ts` |
| Invite codes crypto-random | ✅ | `lib/security.ts` |
| EXIF stripping universal | ✅ | `store/usePetStore.ts` |
| Sentry PII-free | ✅ | breadcrumbs sem valores |
| **Rodar SQL de RLS no Supabase** | 🟡 | Dashboard → SQL Editor → colar `supabase/migrations/001_rls_policies.sql` |
| **Rotacionar todas as keys do `.env` antigo** | 🟡 | Supabase + OpenWeatherMap + Sentry |
| **Verificar git history pra service_role_key** | 🟡 | `git log --all -p -- .env \| grep -i service_role` |

---

## 3. Legal & Compliance (LGPD/GDPR)

| Item | Status | Onde |
|---|---|---|
| Política de Privacidade em pt-BR | ✅ | `legal/privacy.md` |
| Termos de Uso em pt-BR | ✅ | `legal/terms.md` |
| **Preencher placeholders** (CNPJ, endereço, DPO) | 🟡 | `legal/privacy.md` + `terms.md` (procurar `TODO`) |
| **Validar com advogado especializado em LGPD** | 🟡 | recomendado antes de público |
| **Publicar privacy/terms em URL pública** | 🟡 | `cronopet.app/privacy` + `/terms` |
| Apple App Privacy declarations | 🟡 | App Store Connect → App Privacy |
| Removidos depoimentos/números mockados | ✅ | `app/premium.tsx` |

---

## 4. Monetização

| Item | Status | Onde |
|---|---|---|
| Wrapper `services/purchases.ts` (RevenueCat-ready) | ✅ | stub com TODO marcado |
| **Criar conta RevenueCat** | 🟡 | https://app.revenuecat.com |
| **Criar produtos no App Store Connect**: `cronopet_premium_monthly`, `cronopet_premium_yearly` | 🟡 | App Store Connect |
| **Criar produtos no Play Console** | 🟡 | Google Play Console |
| **Linkar produtos em RevenueCat → Offerings → "default"** | 🟡 | RC dashboard |
| **Configurar trial 7 dias** nos dois lados | 🟡 | App Store Connect + Play Console |
| **Copiar API keys** do RC pro `.env.prod` | 🟡 | `EXPO_PUBLIC_REVENUECAT_*` |
| **Instalar SDK**: `npx expo install react-native-purchases` | 🟡 | terminal |
| **Substituir TODOs em `services/purchases.ts`** | 🟡 | comentários `TODO(produção)` |
| **Configurar webhook RC → Supabase** (validação server-side de premium) | 🟡 | Edge Function + RC webhook |

---

## 5. Analytics

| Item | Status | Onde |
|---|---|---|
| Wrapper `services/analytics.ts` (PostHog-ready) | ✅ | stub com eventos tipados |
| Eventos definidos: onboarding, action_logged, paywall, purchase | ✅ | `AnalyticsEvent` union type |
| Wire `app_opened` no `_layout.tsx` | ✅ | useEffect após storageReady |
| **Criar projeto PostHog** | 🟡 | https://posthog.com |
| **Instalar SDK**: `npx expo install posthog-react-native` | 🟡 | terminal |
| **Substituir backend stub por PostHog** | 🟡 | `services/analytics.ts` linha do `initAnalytics` |
| **Adicionar `track()` calls em pontos-chave** | 🟡 | `usePetStore`, paywall, settings |
| **Configurar funnels no PostHog**: onboarding, paywall→purchase | 🟡 | PostHog dashboard |

---

## 6. Testes

| Item | Status | Onde |
|---|---|---|
| 5 testes Maestro E2E | ✅ | `.maestro/0[1-5]_*.yaml` |
| README de Maestro | ✅ | `.maestro/README.md` |
| Script npm `test:e2e` | ✅ | `package.json` |
| TypeScript: 0 erros | ✅ | `npm run typecheck` |
| **Instalar Maestro CLI** | 🟡 | `curl -fsSL "https://get.maestro.mobile.dev" \| bash` |
| **Rodar suite no simulator** | 🟡 | `npm run test:e2e` |
| **Adicionar Maestro Cloud no CI** (opcional) | 🟡 | `.github/workflows/e2e.yml` |

---

## 7. Web & Suporte

| Item | Status | Onde |
|---|---|---|
| Landing page estática | ✅ | `web/index.html` |
| Setup de suporte documentado | ✅ | `docs/SUPPORT_SETUP.md` |
| **Comprar domínio `cronopet.app`** | 🟡 | Cloudflare Domains ou registro.br |
| **Configurar Cloudflare Email Routing** | 🟡 | `dpo@`, `security@`, `contato@` |
| **"Send mail as" no Gmail** | 🟡 | settings do Gmail pessoal |
| **Publicar landing**: `cronopet.app` | 🟡 | Cloudflare Pages / Vercel |
| **Criar `/privacy` e `/terms`** (HTML) | 🟡 | converter markdown via pandoc |
| **Criar `/faq`** | 🟡 | template em `docs/SUPPORT_SETUP.md` §4 |
| **Configurar autoresponder em `contato@`** | 🟡 | template em `docs/SUPPORT_SETUP.md` §3 |
| **Criar templates T1-T6 no Gmail** | 🟡 | `docs/SUPPORT_SETUP.md` §3 |

---

## 8. App Stores

### App Store (iOS)

| Item | Status |
|---|---|
| Apple Developer Account ativo ($99/ano) | 🟡 |
| App Store Connect: criar app `com.cronopet.app` | 🟡 |
| Screenshots 6.7", 6.5", 5.5" (iPhone 16/14/SE) | 🟡 |
| Ícone 1024×1024 sem alpha | 🟡 |
| Descrição em pt-BR + en (ASO) | 🟡 |
| Keywords (limit 100 chars) | 🟡 |
| Support URL: `cronopet.app/faq` | 🟡 |
| Marketing URL: `cronopet.app` | 🟡 |
| Privacy Policy URL: `cronopet.app/privacy` | 🟡 |
| App Privacy declarations preenchidas | 🟡 |
| In-App Purchases criados e em "Ready to Submit" | 🟡 |
| Build via `eas build --platform ios --profile production` | 🟡 |
| Submeter para review | 🟡 |

### Play Store (Android)

| Item | Status |
|---|---|
| Google Play Console ativo ($25 one-time) | 🟡 |
| Criar app `com.cronopet.app` | 🟡 |
| Screenshots phone + tablet | 🟡 |
| Feature graphic 1024×500 | 🟡 |
| Descrição em pt-BR | 🟡 |
| Data Safety form preenchido | 🟡 |
| Privacy Policy link | 🟡 |
| Subscription products criados | 🟡 |
| Build via `eas build --platform android --profile production` | 🟡 |
| Internal testing → Closed testing → Production | 🟡 |

---

## 9. Pré-lançamento — beta interno

Antes de mandar pra review:

- [ ] Rodar `npm run typecheck` — 0 erros
- [ ] Rodar `npm run test:e2e` — 5/5 passam
- [ ] TestFlight com 5-10 amigos por 3-7 dias
- [ ] Verificar Sentry sem nenhum unhandled exception em prod build
- [ ] Verificar PostHog recebendo eventos em prod
- [ ] Testar fluxo completo de compra com Sandbox account (iOS) e licensed tester (Android)
- [ ] Testar `Apagar todos os dados` → confirma que não sobra nada
- [ ] Testar troca de dispositivo (login Premium → restaurar dados)
- [ ] Testar offline-first: voar sem conexão, registrar ações, voltar online → sync

---

## 10. Pós-lançamento

- [ ] Configurar alerta no Sentry: erro novo em produção → email
- [ ] Configurar alerta no Supabase: spike de queries → email
- [ ] Reservar 30min/dia primeira semana para responder suporte
- [ ] Plano de incident response em `SECURITY.md` está pronto
- [ ] Revisar reviews da App Store / Play Store diariamente nas primeiras 2 semanas
- [ ] Funnel de onboarding no PostHog: meta de >70% completion
- [ ] Funnel paywall → purchase: meta inicial >2% conversion
- [ ] Retention D7 / D30: monitorar no PostHog

---

## TL;DR — ordem prioritária do que falta

1. **Hoje**: rodar SQL de RLS no Supabase + rotacionar keys antigas (segurança)
2. **Esta semana**: comprar domínio + Cloudflare Email + publicar landing
3. **Esta semana**: preencher CNPJ/endereço em privacy/terms + validar com advogado
4. **Próxima semana**: instalar `react-native-purchases` + `posthog-react-native`,
   substituir os TODOs nos wrappers, criar produtos nas lojas
5. **Quando estiver tudo ok**: TestFlight beta com 10 amigos
6. **Quando Maestro tests + Sentry estiver verde**: submeter para review
