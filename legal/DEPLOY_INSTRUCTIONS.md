# Deploy gratuito do site jurídico CronoPet — Step-by-step

> Você não precisa contratar hospedagem nem ferramenta paga. As 4 páginas HTML em `legal/website/` (index, privacidade, termos, excluir-conta) podem ir pro ar em **15 minutos** com domínio próprio, gratuito pra sempre. Escolha entre 3 caminhos.

---

## 🎯 Caminho 1 (RECOMENDADO): Vercel + domínio próprio

**Custo:** R$ 0/mês. **Tempo:** 15 min. **Manutenção:** zero.

### Passo a passo

1. **Criar conta Vercel** (grátis, conecta com seu GitHub):
   - Vai em https://vercel.com/signup
   - "Continue with GitHub" — usa o mesmo do CronoPet

2. **Subir as páginas pra um repo separado:**
   ```bash
   cd ~/CronoPet/legal/website
   git init
   git add .
   git commit -m "initial: cronopet.com.br site"
   gh repo create cronopet-site --public --source=. --push
   ```
   *(precisa do GitHub CLI `gh` — se não tem, cria o repo manualmente em github.com/new e dá `git push`)*

3. **Importar no Vercel:**
   - Dashboard Vercel → "Add New" → "Project"
   - Selecionar `cronopet-site` da lista
   - Framework Preset: **Other** (são HTMLs estáticos puros)
   - Deploy → pronto, em 30s o site sobe num domínio tipo `cronopet-site.vercel.app`

4. **Conectar `cronopet.com.br`:**
   - Vercel project → Settings → Domains
   - Add `cronopet.com.br` e `www.cronopet.com.br`
   - Vercel mostra registros DNS:
     - `A @ 76.76.21.21`
     - `CNAME www cname.vercel-dns.com`
   - No painel do seu registrador (registro.br, GoDaddy, etc.), adicionar esses 2 registros

5. **HTTPS automático:**
   - Vercel emite Let's Encrypt em ~10 min após DNS propagar
   - `https://cronopet.com.br/privacidade` funciona

### Como funciona o roteamento das páginas

Vercel serve arquivos estáticos automático:
- `https://cronopet.com.br/` → `index.html`
- `https://cronopet.com.br/privacidade` → `privacidade.html`
- `https://cronopet.com.br/termos` → `termos.html`
- `https://cronopet.com.br/excluir-conta` → `excluir-conta.html`

✅ Tudo já está pronto pra esse roteamento — os HTMLs apontam pra `/privacidade`, `/termos`, `/excluir-conta`.

### Atualizar conteúdo depois

Edita o HTML local, `git push` → Vercel re-deploya automático em 30s.

---

## 🎯 Caminho 2: GitHub Pages (sem login Vercel)

**Custo:** R$ 0. **Limitação:** domínio fica `<user>.github.io/cronopet-site` por padrão; pra usar `cronopet.com.br` é igual ao Vercel mas configuração mais chata.

1. **Criar repo público** `cronopet-site` no GitHub
2. Subir os HTMLs em `legal/website/` (copy ou git push como acima)
3. Repo → Settings → Pages → Branch `main` / folder `/root` → Save
4. Em ~2 min site fica em `https://<seu-user>.github.io/cronopet-site/`
5. **Pra domínio próprio:** Settings → Pages → Custom domain `cronopet.com.br`, ativa "Enforce HTTPS"
6. No DNS do registrador, criar:
   - `A @ 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153`
   - `CNAME www <seu-user>.github.io`

> Vantagem: gratuito sem nenhum SaaS terceiro.  
> Desvantagem: deploy mais lento (~minutos), interface mais técnica.

---

## 🎯 Caminho 3: Cloudflare Pages (alternativa)

Igual ao Vercel, com vantagem de Cloudflare também cuidar do DNS:

1. https://pages.cloudflare.com → Connect GitHub
2. Importar `cronopet-site`
3. Build settings: deixa em branco (HTML puro)
4. Domain → adicionar `cronopet.com.br`
5. Cloudflare resolve DNS sozinho se você mover o domínio pra eles

---

## 📧 Configurar emails `contato@` e `privacidade@cronopet.com.br`

Você precisa de 2 emails antes de ir ao ar (referenciados na Privacy Policy + Termos + Settings do app).

### Opção A: Google Workspace (R$ 30/mês)
- https://workspace.google.com → comprar pra `cronopet.com.br`
- Cria `contato@` e `privacidade@` como aliases (não precisa pagar 2 licenças)

### Opção B: Cloudflare Email Routing (GRÁTIS) — RECOMENDADO
- Se já moveu o domínio pra Cloudflare (Caminho 3):
- Dashboard → Email → Email Routing → Enable
- Adicionar:
  - `contato@cronopet.com.br` → encaminha pro seu Gmail pessoal
  - `privacidade@cronopet.com.br` → encaminha pro seu Gmail pessoal
- Recebe email no Gmail normal, mas remetente externo vê o endereço cronopet.com.br
- Resposta sai do seu Gmail (pra mostrar como cronopet.com.br precisa configurar SMTP — mais avançado)

### Opção C: Forwarding gratuito do registrador
- registro.br: oferece encaminhamento básico de email
- GoDaddy/Hostinger: incluem 1-2 forwarding na compra do domínio

> **Mínimo viável pra Apple/Google aceitarem:** que o email exista E receba mensagens. Se você responder de um Gmail pessoal está OK pra começar (vê assinatura "Atenciosamente, equipe CronoPet").

---

## ✅ Checklist final

Antes de submeter o app:

- [ ] **Domínio cronopet.com.br** registrado (registro.br ou similar)
- [ ] **Hospedagem** das 4 páginas (Vercel/GitHub/Cloudflare) → ar
- [ ] `https://cronopet.com.br/` abre
- [ ] `https://cronopet.com.br/privacidade` abre
- [ ] `https://cronopet.com.br/termos` abre
- [ ] `https://cronopet.com.br/excluir-conta` abre
- [ ] HTTPS funcionando (cadeado verde)
- [ ] Email `privacidade@cronopet.com.br` recebe → seu Gmail
- [ ] Email `contato@cronopet.com.br` recebe → seu Gmail
- [ ] App Privacy preenchido em ASC (ver `APP_PRIVACY_DATA_SAFETY.md`)
- [ ] Data Safety preenchido em Play Console (ver mesmo arquivo)

Tudo isso é **gratuito e 1× só**. Depois é só atualizar conteúdo conforme app evolui.

---

## 🤝 Manter atualizado

Sempre que adicionar nova integração third-party (ex.: novo SDK de analytics, novo provedor de pagamento):

1. Atualizar `legal/privacy.md` (e `privacidade.html`) — seção 5 (Operadores)
2. Atualizar App Privacy (ASC) — categorias afetadas
3. Atualizar Data Safety (Play) — mesma coisa
4. `git push` no `cronopet-site` → site atualiza automático
5. Bumpar "Última atualização" no topo

**Versionamento das políticas:** mantém histórico via git. Quando mudança for relevante, comunicar in-app com 30 dias de antecedência (já documentado nos Termos §10).
