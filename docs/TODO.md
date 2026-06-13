# CronoPet — Backlog técnico (follow-ups)

> Itens de dívida técnica registrados para próximas sprints. **Não são
> blockers de lançamento.** Cada item traz contexto, prioridade e os
> arquivos envolvidos para retomar sem reinvestigar.

---

## Aberto

### [P0] action_logs sync silent fail — observabilidade + outbox
**Origem:** Hotfix WeeklyReportCard (Bug 2 investigado, 2026-06-13).

**Problema:** `services/SyncService.ts:388-394` (`autoSyncActionLog`) tem 6
caminhos de falha silenciosa que perdem dados sem alertar Sentry e sem
retry:

1. Sessão Supabase expirou / null → `getSessionUser` retorna null → no-op
2. User sem `family_groups` link → no-op
3. Network error em `getSessionUser` → catch silencioso
4. `client()` init falha → captura mas não retenta
5. `pushActionLog` timeout 10s → captura warning, log fica só local
6. `pushActionLog` retorna error PostgREST (RLS/FK/etc) → captura mas
   não retenta

**Evidência (banco prod, 2026-06-13):**
- 9 users criaram conta, **3 têm action_logs** (33%)
- 6 users com conta SEM nenhum log no servidor
- Vinicius (CMO, 2 pets): Bobby tem 11 logs, **Nigga tem 0**
- Esses logs provavelmente existem no MMKV local dos friends mas o
  servidor nunca recebeu

**Mesmo padrão em:** `autoSyncPet`, `autoSyncDeleteActionLog`,
`autoSyncVaccine`, `autoSyncAppointment`, `autoSyncWeight`,
`autoSyncMedicalEvent` (todos `services/SyncService.ts:380-430`).

**Ação A (~30 min — observability ASAP):**
Substituir todos os `if (!ctx) return;` por `Sentry.captureMessage` +
substituir `.catch(() => {})` por `.catch((err) =>
Sentry.captureException(err))`. Não conserta o bug mas revela escala
real.

**Ação B (~1 dia — fix definitivo):**
Criar `lib/syncOutbox.ts` com fila persistida em MMKV. Mutações
falhadas (no-op OU error) caem na fila. Worker periódico (`useEffect`
no `_layout.tsx` a cada 30s + on session-restored event) drena.
Counter de attempts max 5 → deadletter. App offline → fila → push
quando volta online OU re-loga.

**Severidade:** P0. Bloqueia confiança em telemetria + perde dado de
beta. Sem isso, qualquer decisão baseada em logs do servidor é viesada.

**Arquivos:**
- `services/SyncService.ts:159-200` (push helpers)
- `services/SyncService.ts:370-430` (autoSync helpers, getSessionUser)
- `lib/syncOutbox.ts` (novo, Ação B)
- `app/_layout.tsx` (drain worker, Ação B)

---

### [P1] Investigar duplicação de `premium_purchase_completed`
**Origem:** Sprint Documentação Visual — Artefato 2 (Conversion Funnel, 2026-06-02).

**Problema:** evento `premium_purchase_completed` é trackeado em 3 lugares:
`services/purchases.ts:245` (stub DEV), `services/purchases.ts:264` (compra
real após `Purchases.purchasePackage`), e `store/usePetStore.ts:1136`
(callback de `customerInfoUpdateListener`). Em compra real, o evento pode
ser disparado 2× — `purchases.ts:264` durante o handler de compra, e
`usePetStore.ts:1136` quando o listener de customerInfo dispara em
sequência. **Impacto:** métrica de receita inflada em PostHog, decisões
de growth baseadas em volume errado.

**Ação:** confirmar via PostHog (filtrar `event_type=premium_purchase_completed`
agrupado por `distinct_id` + janela de 1 min — se aparecer 2 events por
user, está duplicado). Remover o redundante. Sugestão: manter no listener
de customerInfo (mais confiável, captura também restauros) e remover do
handler imperativo.

**Arquivos:** `services/purchases.ts:245,264`, `store/usePetStore.ts:1136`.

---

### [P2] Resiliência do `trial_converted` server-side
**Origem:** Sprint Documentação Visual — Artefato 2 (Conversion Funnel, 2026-06-02).

**Problema:** `supabase/functions/revenuecat-webhook/index.ts:387` emite
`trial_converted` para o PostHog via fetch direto com timeout 2s, em modo
fire-and-forget (sem await). Se o PostHog ingest estiver lento ou indisponível,
o evento é perdido silenciosamente. **Impacto:** subestima a métrica mais
importante do funil (conversão final de trial → pago), comprometendo análise
de ROI.

**Ação:** opções (escolher 1):
- Adicionar retry com backoff exponencial (3 tentativas, 1s/3s/9s)
- Encolar em tabela Postgres (ex: `analytics_outbox`) com cron de drain
- Ao falhar, emitir `Sentry.captureMessage('posthog_emit_failed', { event, extra })`
  pra ter alerta visível em vez de silent miss

**Arquivos:** `supabase/functions/revenuecat-webhook/index.ts:100-145` (helper `emitPosthog`).

---

### [P3] Type drift em `onboarding_completed`
**Origem:** Sprint Documentação Visual — Artefato 2 (Conversion Funnel, 2026-06-02).

**Problema:** `store/usePetStore.ts:997` chama:
```ts
track({ name: 'onboarding_completed', props: { petType: get().pet.tipo, viaHydration: true } as any });
```
O `as any` mata o type-check porque `viaHydration` não está declarada no
TypeScript type do evento (`services/analytics.ts:32`). Risco: prop pode
sumir num refactor sem aviso do compilador.

**Ação:** ou (a) adicionar `viaHydration?: boolean` ao type do evento em
`services/analytics.ts`, ou (b) remover do chamador se a prop não tiver
mais sentido. Recomendação: (a) — `viaHydration` distingue completion
manual vs vindo de cloud sync, é útil pra analytics.

**Arquivos:** `services/analytics.ts:32`, `store/usePetStore.ts:997`.

---

### [P3] Instrumentar 10 eventos enum dead
**Origem:** Sprint Documentação Visual — Artefato 2 (Conversion Funnel, 2026-06-02).

**Problema:** 10 eventos existem no `AnalyticsEvent` enum mas nunca são
disparados em lugar nenhum (nem cliente, nem servidor). Telemetria
secundária comprometida.

**Categorias por prioridade:**

**Grupo A — CRÍTICOS pós-launch (Family Sharing):**
- `family_invite_created` — `app/invite.tsx` (ATENÇÃO: rota órfã, ver Artefato 1; depende de destravar a rota)
- `family_invite_accepted` — `app/premium.tsx:313` (no `joinFamilyGroup`)

**Grupo B — HIGIENE de telemetria (Médico):**
- `vaccine_added` — `app/(tabs)/medical.tsx` (save de vacina)
- `appointment_added` — `app/(tabs)/medical.tsx` (save de consulta)
- `weight_logged` — `app/(tabs)/medical.tsx` (save de peso)

**Grupo C — OBSERVABILIDADE:**
- `error_shown` — `components/ui/ToastRenderer` (no path de `type === 'error'`)
- `sync_failed` — `services/SyncService` (catch blocks)
- `notifications_enabled` — `components/ui/NotificationAskSheet` (aceite)
- `notifications_disabled` — `app/settings.tsx` (toggle off)
- `account_deleted` — `app/settings.tsx:118` (após `deleteRemoteAccount` OK)

**Esforço:** ~30 min cada evento (track call + props). Total ~5h.

---

### [P2] Implementar sincronização cloud de fotos
**Origem:** Sprint Documentação Visual — Artefato 3 (C4 Container, 2026-06-03).

**Problema:** fotos dos pets e das ações são persistidas APENAS em
`Paths.document.uri` (Expo FileSystem, sandbox local do app) via
`persistAndStripPhoto` em `store/usePetStore.ts:210`. Supabase Storage
NÃO é usado (confirmado por triangulação no Artefato 3: zero
ocorrências de `supabase.storage.from` em todo o codebase). Backup via
iCloud do iOS pode mitigar mas não está garantido — depende de
configuração e do path estar incluído no backup.

**Impacto:** se o usuário trocar de celular, reinstalar o app, ou
limpar dados, **perde TODAS as fotos do pet e das ações**. UX crítica
em app de pet care (foto do pet é elemento emocional central).

**Ação:** avaliar 3 caminhos:
- (a) Supabase Storage com bucket por user_id + RLS (mesma policy
  pattern das outras tabelas; custo: $0.021/GB/mês)
- (b) Compactar e armazenar base64 em coluna Postgres (limita
  resolução; simples; reaproveita backup nativo do DB)
- (c) Solução third-party (Cloudinary free tier, Bunny CDN, ImageKit)

Decisão precisa pesar: custo Storage vs UX de perda de dados vs
complexidade de migração (toda foto existente já em FileSystem
local precisa ser uploadada na primeira execução pós-feature).

**Arquivos:** `store/usePetStore.ts:210` (`persistAndStripPhoto`),
`lib/photoPath.ts`, qualquer caller que lê URI de foto (Home, edit-pet,
weekly card).

---

### [P2] Customizar templates de e-mail Supabase pra pt-BR
**Origem:** Pré-Launch Sprint (Frente 4 audit, 2026-06-01).

**Problema:** todos os templates do GoTrue (`mailer_subjects_*`,
`mailer_templates_*`) estão em inglês padrão Supabase ("Confirm Your
Signup", "Reset Your Password"). Como o app é exclusivamente pt-BR, os
e-mails contrastam com a experiência do app e parecem genéricos.

**Templates afetados:**
- `confirmation` (e-mail de confirmação de cadastro)
- `recovery` (e-mail de "Esqueci a senha")
- `magic_link` (não usamos hoje, mas configurar pra coerência)
- `email_change` (confirmação ao trocar e-mail)
- `reauthentication` (OTP de reauth — ativada com `require_reauthentication`)
- `password_changed_notification` (aviso de senha alterada — habilitada
  agora, sai em inglês)
- `email_changed_notification` (idem)

**O que fazer:** CMO (Vinicius) entrega copy pt-BR amigável-brasileira
("Confirme sua conta no CronoPet 🐾", etc), aplicar via Management API
PATCH em `mailer_subjects_*` e `mailer_templates_*_content`. Tom: como o
resto do app fala, sem corporativês.

**Arquivos:** Supabase Dashboard → Authentication → Email Templates
(ou via `curl PATCH /v1/projects/{ref}/config/auth`).

---

### [P3] Habilitar `password_hibp_enabled` (proteção HaveIBeenPwned)
**Origem:** Pré-Launch Sprint (Frente 4 audit, 2026-06-01).

**Problema:** ao configurar os toggles de hardening do Supabase auth, o
PATCH `password_hibp_enabled: true` retornou **HTTP 402** — feature gated
no plano Pro. App fica sem checagem se a senha que o user escolheu já
vazou em breaches conhecidos.

**O que fazer:** quando upgradar pro plano Pro do Supabase (ou se
decidirmos pagar logo no soft launch), reaplicar o PATCH:
```
PATCH /v1/projects/qhbsmvuwuiupdqdrrdov/config/auth
{ "password_hibp_enabled": true }
```

---

### [P3] "Sair de todos os dispositivos" em Settings
**Origem:** Pré-Launch Sprint (Frente 4 audit, item #39).

**Problema:** o `signOut` atual chama `supabase.auth.signOut()` com scope
default (= 'local'), invalidando só o JWT deste device. Em conta
comprometida, atacante logado em outro device mantém sessão até refresh.

**O que fazer:** adicionar opção em Settings → Conta → "Sair de todos os
dispositivos" que chama `supabase.auth.signOut({ scope: 'global' })`.
Risco: low-priority pra soft launch (volume baixo, sem alvo de ataque
direcionado), mas crítico antes de PR/scale.

**Arquivos:** `app/settings.tsx`, `services/AuthService.ts`.

---

### [P3] Investigar cor `#FFFEF8` (7 usos)
**Origem:** Pré-Launch Sprint UX (audit visual F3, 2026-06-02).

**Problema:** cor hardcoded em 7 lugares, não documentada na paleta brand
do CLAUDE.md (que define apenas Celadon `#9BE4C6`, Verdigris `#04A29B`,
Beige `#E9F1CF`, Ash Brown `#5C493D`, Graphite `#2C2B27`, status colors).

**O que fazer:** grep `#FFFEF8` no repo, identificar origem (provavelmente
WeeklyReportCard ou social card background). Decidir: adicionar como
token de paleta (justificar o porquê) OU substituir por token existente
(provavelmente `colors.bgScreen` = `#fafaf9`).

**Arquivos:** todos com `#FFFEF8` literal. Esforço: ~30 min.

---

### [P3] Unificar escala de vermelhos em tokens
**Origem:** Pré-Launch Sprint UX (audit visual F3, 2026-06-02).

**Problema:** ~30 usos hardcoded de tons de vermelho (`#fca5a5`, `#fef2f2`,
`#fecaca`, `#b91c1c`, `#991b1b`, `#ef4444`, `#f87171`) em error states
espalhados — todos da escala red-300/500/700/900 do Tailwind. Deveriam
vir de tokens consistentes.

**O que fazer:** criar em `hooks/useThemeColors`:
- `colors.errorBg` (background suave) — substitui `#fef2f2`
- `colors.errorBorder` (borda) — substitui `#fecaca`/`#fca5a5`
- `colors.errorText` (texto) — já existe parcialmente
- `colors.errorTextStrong` — substitui `#b91c1c`/`#991b1b`
Migrar callsites. Esforço: ~1h.

---

### [P3] Padronizar `padding: 14` pra múltiplos de 4
**Origem:** Pré-Launch Sprint UX (audit visual F3, 2026-06-02).

**Problema:** `padding: 14` aparece em **85 lugares** no app — é o valor
mais usado. Quebra a base-unit de 4px definida no CLAUDE.md. Vem do
`inputStyle` padrão herdado (`paddingHorizontal: 14, paddingVertical: 12`).
Outros valores quebra-base detectados: `10` (28×), `18` (7×), `28` (7×).

**O que fazer:** padronizar pra `16` (próximo múltiplo de 4 acima). Faz
diff visual sutil — testar com smoke real antes de mergear. Esforço: ~2h
(grep + replace + revisão visual em iOS e Android).

---

### [P3] WeeklyReportCard.tsx em 573 linhas (3.8x o limite de 150 do CLAUDE.md)
**Origem:** Sprint share visual refresh — 2026-06-03, atualizado 2026-06-13.

**Problema:** o componente `components/ui/WeeklyReportCard.tsx` está em
573 linhas após o hotfix 2026-06-13 (decisão CTO #5 removeu streak hero
+ 7-day grid + delta — reduziu de 751 → 573 linhas). Ainda está 3.8×
acima do limite de 150 linhas que o CLAUDE.md define como teto saudável
de componente.

**Ação:** split em sub-components numa sprint dedicada de refactor.
Candidatos:
- `StreakHero` (streak number + flame + label)
- `WeekGrid` (7 dias Dom→Sáb com dot ✓/·)
- `StatCard` (já existe inline; promover pra arquivo próprio)
- `HighlightCard` (estrela + label + valor do destaque)
- `ShareFooter` (logo + cronopet.com.br)

Após split, cada pedaço fica em `components/share/` (nova pasta) com
testes visuais no Sandbox. WeeklyReportCard vira orquestrador < 150
linhas.

**Arquivos:** `components/ui/WeeklyReportCard.tsx` (split alvo).

---

### [BAIXO] Catalogar DateTimeField no Sandbox
**Origem:** Fix Sprint P1 (commit `80cd47b`) — Bug 2 (Date picker).

**Problema:** o componente novo `components/ui/DateTimeField.tsx` não foi
adicionado ao catálogo do Sandbox. O CLAUDE.md exige que todo componente
novo em `components/` entre em `app/(dev)/sandbox.tsx` com suas variações
(default, com valor, dark mode, modo `date` e modo `time`).

**O que fazer:** adicionar uma seção do `DateTimeField` ao Sandbox cobrindo
`mode="date"` (com `minimumDate`/`maximumDate`) e `mode="time"`, estados
vazio/preenchido e `clearable`.

**Arquivos:** `app/(dev)/sandbox.tsx`, `components/ui/DateTimeField.tsx`.
