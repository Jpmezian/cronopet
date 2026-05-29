# CronoPet — Backlog técnico (follow-ups)

> Itens de dívida técnica registrados para próximas sprints. **Não são
> blockers de lançamento.** Cada item traz contexto, prioridade e os
> arquivos envolvidos para retomar sem reinvestigar.

---

## Aberto

### [P2] Tela de set-password (completar fluxo "Esqueci senha")
**Origem:** Fix Sprint P1 (commit `80cd47b`) — Bug 1 (Login UX).

**Problema:** o botão "Esqueci a senha" em `StepAuth` chama
`sendPasswordReset()` (`services/AuthService.ts`), que envia o e-mail de
recuperação com redirect via deep link `cronopet://auth/confirmed`. Esse
handler (`app/auth/confirmed.tsx`) só faz `getSession()` e roteia — **não
existe tela para definir uma nova senha**. Resultado: o usuário volta
logado via sessão de recovery, mas sem efetivamente trocar a senha.

**O que fazer (próxima sprint):**
- Criar tela de set-password (input nova senha + confirmação, validação
  via `checkPasswordStrength` de `@/lib/security`).
- Rotear o deep link de recovery para essa tela em vez de cair direto nas
  tabs. O Supabase entrega o evento `PASSWORD_RECOVERY` no `onAuthStateChange`
  — usar esse sinal para distinguir recovery de confirmação normal.
- Aplicar a nova senha com `supabase.auth.updateUser({ password })`.

**Arquivos:** `app/auth/confirmed.tsx`, `components/onboarding/StepAuth.tsx`,
`services/AuthService.ts`, `services/supabase.ts` (onAuthStateChange).

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
