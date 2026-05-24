# Runbook de Incidente de Segurança — CronoPet

> Procedimento padrão pra detectar, conter, comunicar e documentar incidentes de segurança envolvendo dados pessoais. Cumpre **Resolução CD/ANPD nº 15/2024** + **LGPD art. 48**.

---

## ⏱️ Prazos críticos

| Tipo de agente | Prazo de comunicação à ANPD | Base legal |
|---|---|---|
| Padrão | **3 dias úteis** após conhecimento | Res. CD/ANPD 15/2024 art. 6º |
| **Pequeno porte** (CronoPet) | **6 dias úteis** | Res. CD/ANPD 2/2022 art. 14 + Res. 15/2024 §6º |
| Titulares afetados | Mesmo prazo, simultaneamente | Res. 15/2024 art. 7º |

**Retenção do registro:** 5 anos mínimo (Res. 15/2024 art. 10).

---

## 🚨 O que conta como "incidente" (gatilhos)

Conforme Res. 15/2024 art. 3º, incidente é evento que envolve dados pessoais e pode acarretar **risco ou dano relevante** aos titulares. Exemplos no CronoPet:

| Cenário | É incidente? |
|---|---|
| Vazamento de tabela `auth.users` (emails de tutores) | ✅ SIM |
| Vazamento de tabela `pets` (nome, raça, foto) | ✅ SIM — dados sensíveis veterinários |
| Vazamento de `action_logs` (rotina detalhada do pet/tutor) | ✅ SIM |
| Exposição da Edge Function `health-analysis` que recebe payload com dados clínicos | ✅ SIM |
| Acesso não-autorizado a `premium_grants` (lista de emails) | ✅ SIM (LGPD art. 5º, X) |
| Crash de produção sem vazamento de dados | ❌ NÃO (só observabilidade) |
| Tentativa de brute-force em `redeem_invite_code` rate-limitada | ❌ NÃO (defesa funcionou) |
| Token JWT vazado por user (descuido próprio) | ⚠️ AVALIAR — se afeta só o titular, não tem comunicação à ANPD, mas reset de session |
| Acesso indevido por funcionário (não temos) | ✅ SIM |

**Em dúvida:** trate como SIM e documente. Mais barato comunicar desnecessariamente do que perder prazo.

---

## 🩺 Fluxo passo a passo

### Fase 1 — DETECÇÃO (T+0)

**Origens possíveis:**
- Alerta do Sentry (crash com payload suspeito, query SQL falha em massa)
- Email de pesquisador de segurança ou bug bounty externo
- Notificação do Supabase (security advisor, suspicious activity)
- Suspeita interna (você viu algo estranho nos logs)
- Mídia (raro)

**Ação imediata:**
- [ ] Anotar timestamp UTC exato em `legal/incidents/YYYY-MM-DD-slug.md`
- [ ] Capturar evidência (screenshot, log dump, email)
- [ ] **NÃO apague nada** — preserve evidência pra análise

### Fase 2 — CONTENÇÃO (T+0 a T+2h)

**Objetivo:** parar o sangramento. Não esperar análise completa.

- [ ] Se vazamento por endpoint exposto → rotacionar `SUPABASE_SERVICE_ROLE_KEY` no dashboard
- [ ] Se Edge Function comprometida → desativar via Supabase dashboard (`functions/<name>` → toggle off)
- [ ] Se conta admin invadida → revogar todas as sessões em Supabase → Auth → Users → "Sign out all sessions"
- [ ] Se RLS bypass → publicar policy temporária `USING (false)` na tabela afetada
- [ ] Se vazamento de dados publicado em paste/Pastebin/Telegram → DMCA + takedown

### Fase 3 — ANÁLISE (T+2h a T+24h)

Documente em `legal/incidents/YYYY-MM-DD-slug.md`:

```markdown
## Incidente YYYY-MM-DD-<slug>

**Detectado em:** 2026-XX-XX HH:MM UTC
**Detectado por:** [sentry/pesquisador/interno]
**Status:** [contido/em-investigação/escalado]

### O que aconteceu
[descrição factual, 1-2 parágrafos]

### Dados afetados
- Categorias: [emails, nomes de pet, fotos, etc]
- Volume estimado: [N registros / N usuários]
- Sensibilidade: [básica/sensível/financeira]

### Causa raiz
[falha técnica/humana específica]

### Contenção aplicada
- [ações + timestamps]

### Risco aos titulares
- [análise qualitativa: o que atacante pode fazer com esses dados]

### Comunicação à ANPD
- [ ] Necessária (risco/dano relevante)
- [ ] Não necessária (apenas técnico, sem afetar titulares)
- Data prevista: 2026-XX-XX (T+6 dias úteis)

### Comunicação aos titulares
- [ ] Necessária — via email cadastrado (privacidade@cronopet.com.br)
- [ ] Não necessária

### Lições aprendidas
[o que mudar pra não acontecer de novo]
```

### Fase 4 — COMUNICAÇÃO (até T+6 dias úteis)

#### À ANPD

**Canal oficial:**
- Formulário web: <https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis>
- Email backup: incidentes@anpd.gov.br
- Processo SEI: criar via gov.br

**Conteúdo mínimo (Res. 15/2024 art. 5º):**
- Descrição do incidente e dados afetados
- Número de titulares (estimado ou confirmado)
- Medidas técnicas e administrativas adotadas
- Riscos aos titulares
- Comunicação aos titulares (se feita ou justificativa de não fazer)
- Identificação do encarregado (canal `privacidade@cronopet.com.br`)

**Template em `legal/incidents/_template-anpd.md`** (a criar quando primeiro incidente acontecer — não vale construir teoricamente sem caso real).

#### Aos titulares afetados

Email pra `privacidade@cronopet.com.br` → forward pra lista de afetados:

```
Assunto: CronoPet — Comunicado de incidente de segurança

[Nome do titular],

Em [data] identificamos um incidente envolvendo dados pessoais do seu
cadastro no CronoPet. Os dados afetados foram: [lista].

Adotamos as seguintes medidas: [lista]. O risco avaliado é [baixo/médio/alto].

Recomendamos que você [ação específica — trocar senha, monitorar conta, etc].

Para exercer seus direitos (LGPD art. 18), responda este email.

Atenciosamente,
Equipe CronoPet
privacidade@cronopet.com.br
```

### Fase 5 — REMEDIAÇÃO + RETENÇÃO (T+6d a T+30d)

- [ ] Implementar fix técnico permanente (commit, migration, etc)
- [ ] Atualizar `SECURITY.md` com lição aprendida
- [ ] Adicionar teste de regressão se aplicável
- [ ] Arquivar `legal/incidents/YYYY-MM-DD-slug.md` com status FINAL
- [ ] **Reter por 5 anos** (Res. 15/2024 art. 10) — git history conta como retenção formal

---

## 📞 Contatos de emergência

| Quem | Quando contatar | Como |
|---|---|---|
| Supabase Support | Acesso comprometido, RLS bypass, function down | Dashboard → Support |
| Sentry Support | Crashes não chegando, suspeita de dados sensíveis em events | support@sentry.io |
| Anthropic | Suspeita de payload com PII chegando à API | trust@anthropic.com |
| RevenueCat | Compras suspeitas, refunds em massa | support@revenuecat.com |
| ANPD (titulares + você) | Comunicação formal | incidentes@anpd.gov.br |
| Procon (se titular brasileiro entrar em contato) | Recebimento de notificação | <https://www.consumidor.gov.br> |

---

## 🧠 Coisas que ajudam ANTES de ter um incidente

- [ ] Backup automatizado do Supabase (Pro plan) — mínimo recovery point
- [ ] Sentry com `tracesSampleRate < 0.1` (não consumir o cap durante incidente quando precisar do dado)
- [ ] Documentar arquitetura em `PRODUCT_OVERVIEW.md` (alvo correto pra contenção rápida)
- [ ] Rodar Supabase Security Advisor a cada migration nova
- [ ] Ter este runbook bookmarked no celular

---

## 📚 Referências legais

- LGPD: <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>
- Res. CD/ANPD nº 15/2024 (comunicação de incidente): <https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-novo-regulamento-de-comunicacao-de-incidentes-de-seguranca>
- Res. CD/ANPD nº 2/2022 (agente de pequeno porte): <https://www.gov.br/anpd/pt-br/assuntos/noticias/aprovado-regulamento-para-agente-de-pequeno-porte>
- Res. CD/ANPD nº 4/2023 (dosimetria sanção): <https://www.gov.br/anpd/pt-br/assuntos/noticias/sancoes-administrativas-da-anpd-resolucao>

---

*Última atualização: 2026-05-24 · Versão 1.0 · Auditoria adversarial finding #22*
