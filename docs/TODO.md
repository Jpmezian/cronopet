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
