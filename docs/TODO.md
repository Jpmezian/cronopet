# CronoPet — Backlog técnico (follow-ups)

> Itens de dívida técnica registrados para próximas sprints. **Não são
> blockers de lançamento.** Cada item traz contexto, prioridade e os
> arquivos envolvidos para retomar sem reinvestigar.

---

## Aberto

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
