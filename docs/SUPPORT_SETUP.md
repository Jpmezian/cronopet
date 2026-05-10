# Suporte ao usuário — Setup completo

Este guia cobre TUDO que precisa ser feito antes do lançamento para que o usuário tenha um canal de suporte funcional.

---

## 1. Domínio + DNS (pré-requisito de tudo)

Compre `cronopet.app` (ou outro disponível) em registro.br ou Cloudflare Domains.
Recomendação: **Cloudflare** — DNS rápido, proxy gratuito, e Email Routing incluso.

```
A      cronopet.app           → IP do hosting (Cloudflare Pages auto-config)
CNAME  www.cronopet.app       → cronopet.app
MX     cronopet.app           → Cloudflare Email Routing (configurado abaixo)
TXT    cronopet.app           → SPF (Cloudflare gera)
TXT    _dmarc.cronopet.app    → "v=DMARC1; p=quarantine; rua=mailto:contato@cronopet.app"
```

---

## 2. Email de suporte (Cloudflare Email Routing — grátis)

### Passo a passo

1. Cloudflare Dashboard → seu domínio → **Email** → **Email Routing** → Get Started
2. Cloudflare adiciona MX/SPF/DKIM automaticamente
3. **Routes**:
   - `contato@cronopet.app` → encaminha pro seu Gmail/Outlook pessoal
   - `suporte@cronopet.app` → encaminha pro mesmo (alias até crescer)
   - `dpo@cronopet.app` → encaminha pro mesmo (LGPD — encarregado de dados)
   - `security@cronopet.app` → encaminha pro mesmo (vulnerability disclosure)
   - `*@cronopet.app` (catch-all) → desativado (evita spam target)

### Para enviar emails *como* `contato@cronopet.app`

Cloudflare Email Routing é **inbox-only**. Para responder com o domínio:
- **Opção A (grátis)**: configure "Send mail as" no Gmail (Settings → Accounts → "Send mail as")
  com um servidor SMTP gratuito (smtp2go grátis até 1000/mês)
- **Opção B (paga, profissional)**: Google Workspace Starter (R$ 35/mês/usuário) ou
  Zoho Mail (grátis até 5 usuários)
- **Opção C (intermediária)**: Resend (3000 emails/mês grátis) — bom pra emails transacionais
  do app também (welcome, recovery futuro)

**Recomendação**: comece com Gmail "Send mail as" + Cloudflare Routing. Move pra Workspace
quando tiver primeira receita.

---

## 3. Resposta automática (autoresponder)

Configure no Gmail para `contato@cronopet.app`:

```
Assunto: Recebemos sua mensagem — CronoPet

Olá!

Obrigado por entrar em contato com a gente. Recebemos sua mensagem e vamos
responder em até 48h úteis (geralmente bem antes).

Enquanto isso, talvez sua dúvida já esteja respondida em:
https://cronopet.app/faq

Se for um problema técnico, ajuda muito se você puder incluir:
- Modelo do celular (ex: iPhone 13, Galaxy S23)
- Versão do CronoPet (Configurações → Sobre)
- Print da tela ou descrição do que estava fazendo

Um abraço,
Equipe CronoPet 🐾
```

### Templates de resposta humana (snippets canned)

Configure como **Templates** no Gmail (Settings → Advanced → Templates). Lista mínima:

#### T1 — Bug confirmado
> Obrigado por reportar! Confirmamos o bug e ele já está na lista de correções.
> Vamos avisar você quando sair a versão com a correção. Tem alguma informação
> adicional que possa nos ajudar? (passos para reproduzir, frequência, etc.)

#### T2 — Premium não desbloqueou
> Pra investigar, preciso de duas coisas:
> 1. Print da tela "Compras" (App Store ou Play Store) mostrando a assinatura ativa
> 2. Tente "Restaurar compras" em Configurações → Premium → Restaurar
> Se não resolver, me avise que abro um ticket com Apple/Google.

#### T3 — LGPD: solicitação de exportação/deleção de dados
> Você tem o direito de pedir esses dados conforme a LGPD (Lei 13.709/2018).
> Para deleção: Configurações → Apagar todos os dados (executa imediatamente
> e remove tudo localmente + na nuvem se você for Premium).
> Para exportação: vou te enviar em até 15 dias um arquivo JSON com todos os
> dados associados ao seu email/conta. Confirma que posso prosseguir?

#### T4 — Reembolso
> O CronoPet não processa reembolsos diretamente — quem cobrou foi a Apple
> (App Store) ou o Google (Play Store). Para pedir reembolso:
> - **iOS**: https://reportaproblem.apple.com → busca CronoPet → "Solicitar reembolso"
> - **Android**: https://play.google.com/store/account/orders → "Reportar um problema"
> Se for um caso especial (cobrança duplicada, problema técnico), me avise que
> abro suporte com eles em paralelo.

#### T5 — Dúvida sobre veterinário / saúde
> O CronoPet ajuda você a registrar e organizar a rotina, mas a gente não
> dá conselhos médicos ou veterinários. Para dúvidas sobre saúde do seu pet,
> sempre consulte um veterinário de confiança. Se quiser, posso te ajudar a
> exportar um relatório PDF do histórico para levar pra ele!

#### T6 — Recuperação de senha (até implementar reset automático)
> Por enquanto a recuperação de senha é manual. Pra resetar a sua, preciso que
> me confirme:
> 1. O email que você usou para criar a conta
> 2. Algum detalhe que ajude a confirmar que é você (nome do pet, data aproximada
>    de criação da conta)
> Em até 24h te envio um link de reset.

---

## 4. Página de FAQ pública

Crie `web/faq.html` com perguntas comuns (esta lista cobre 80% dos casos):

- Como funciona a família compartilhada?
- Posso usar o CronoPet sem internet?
- Meus dados estão seguros?
- O que acontece quando o trial termina?
- Como cancelar a assinatura?
- Como apagar minha conta?
- Posso ter mais de um pet?
- Como exportar meu histórico?
- O CronoPet substitui o veterinário? (NÃO)
- Como reportar um bug?
- Esqueci minha senha — e agora?

Cada resposta: 1-3 parágrafos curtos. Tom: humano, sem juridiquês.

---

## 5. Triagem automática (recomendado a partir de ~50 emails/semana)

Use **filtros do Gmail** para organizar:

```
[Gmail filter] de:apple.com OU "App Store Connect" → label "🍎 Apple"
[Gmail filter] de:google.com "Google Play" → label "🤖 Google"
[Gmail filter] palavra:"reembolso" OU "refund" → label "💰 Refund"
[Gmail filter] palavra:"LGPD" OU "deletar dados" → label "🔒 LGPD" (responder em <15 dias!)
[Gmail filter] palavra:"bug" OU "erro" OU "crash" → label "🐛 Bug"
[Gmail filter] palavra:"vulnerabilidade" OU "security" → label "🚨 Security" + estrela
```

---

## 6. SLA público (publicar na FAQ)

> **Tempo de resposta esperado:**
> - Bug crítico (app não abre, dados perdidos): em até 24h
> - Bug normal: em até 48h úteis
> - Dúvida geral: em até 48h úteis
> - Solicitação LGPD (exportar/deletar dados): em até 15 dias (lei)
> - Vulnerabilidade de segurança: em até 7 dias para fix

---

## 7. Integração no app (deep links)

No `app/settings/*.tsx` (ou similar), adicione botões de contato com prefill:

```tsx
import { Linking } from 'react-native';
import Constants from 'expo-constants';

const supportEmail = () => {
  const subject = encodeURIComponent('Suporte CronoPet');
  const body = encodeURIComponent(
    `\n\n---\nApp version: ${Constants.expoConfig?.version}\nDevice: (preencher se relevante)\n`,
  );
  Linking.openURL(`mailto:contato@cronopet.app?subject=${subject}&body=${body}`);
};
```

Esse helper deveria existir em `lib/support.ts` para ficar centralizado.

---

## 8. Checklist final pré-lançamento

- [ ] Domínio comprado e DNS apontado
- [ ] Email Routing configurado (recebe em `contato@`, `dpo@`, `security@`)
- [ ] "Send mail as" configurado no Gmail (consegue enviar com `@cronopet.app`)
- [ ] Autoresponder ligado em `contato@`
- [ ] Templates T1-T6 salvos no Gmail
- [ ] FAQ publicado em `cronopet.app/faq`
- [ ] SLA visível na FAQ
- [ ] Botão "Falar com suporte" no app linkando pra `mailto:contato@cronopet.app`
- [ ] Política de privacidade declara `dpo@cronopet.app` como contato LGPD
- [ ] App Store Connect: campo "Support URL" preenchido com `cronopet.app/faq`
- [ ] App Store Connect: campo "Marketing URL" preenchido com `cronopet.app`
- [ ] Play Console: mesmas URLs configuradas
