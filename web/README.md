# CronoPet — Landing Page

Landing estática (HTML/CSS, zero JS) para o domínio público (`cronopet.app`).

## Stack

Sem framework. Um único `index.html` com CSS embutido. Razão:
- Carrega instantâneo (importante para mobile users em rede ruim)
- Hospedagem trivial (Cloudflare Pages, Vercel, Netlify, GitHub Pages — qualquer um serve)
- Zero build step, zero deploy complexo
- Respeita `prefers-color-scheme` (dark mode automático)

## Conteúdo necessário antes do go-live

- [ ] `og.png` (1200×630) para preview em redes sociais
- [ ] `apple-touch-icon.png` (180×180)
- [ ] `favicon.ico`
- [ ] Página `/privacy` (linkar `legal/privacy.md` convertida pra HTML)
- [ ] Página `/terms` (linkar `legal/terms.md` convertida pra HTML)
- [ ] Configurar email `contato@cronopet.app` (instruções em `docs/SUPPORT_SETUP.md`)
- [ ] Quando app estiver na loja: substituir CTAs por badges App Store / Google Play

## Deploy sugerido (Cloudflare Pages)

```bash
# 1. Criar projeto no Cloudflare Pages apontando para este repo
# 2. Build settings:
#    - Build command: (deixar vazio)
#    - Build output directory: web
# 3. Custom domain: cronopet.app
```

Ou Vercel:
```bash
cd web && vercel --prod
```

## Como converter Privacy/ToS markdown → HTML

```bash
# Opção rápida: pandoc
pandoc legal/privacy.md -s --css=/style.css -o web/privacy.html
pandoc legal/terms.md -s --css=/style.css -o web/terms.html
```
