# 🚀 CronoPet — Guia de Lançamento

Documento-mestre pra ir ao ar. Dividido em 3 partes: **ASO** (conteúdo da App Store), **Estratégia** (onde divulgar) e **Checklist técnico** (o que falta fazer).

---

## 1. App Store Optimization (ASO) — pt-BR

### Título (30 caracteres max)
```
CronoPet: Rotina do Pet
```
**23 chars** ✅ · inclui keyword principal ("rotina pet")

### Subtítulo (30 caracteres max)
```
Cuidados, vacinas e saúde
```
**25 chars** ✅ · reforça 3 use cases

### Promotional Text (170 caracteres — atualizável sem revisão)
```
🔥 Novo: Plano nutricional com 22 rações reais e custo mensal estimado. Seu veterinário vai amar o PDF que o CronoPet gera.
```

### Descrição (4000 chars) — primeiros 250 chars são os mais importantes

```
O CronoPet é o jeito mais fácil de cuidar do seu pet com método — sem planilha, sem caderninho, sem depender da memória.

Registre em 3 segundos: comida, água, passeio, xixi, cocô e banho. O app constrói um histórico completo que pode ser compartilhado com o veterinário em um PDF profissional.

━━ O QUE VOCÊ GANHA ━━

🍖 REGISTRO RÁPIDO
Toque em um botão e pronto. Opcionalmente, salve quantidade (gramas), duração do passeio, consistência das fezes e notas clínicas.

🔥 STREAK DE CUIDADOS
Veja quantos dias seguidos seu pet teve a rotina completa. Celebre marcos especiais (7, 30, 100 dias) com cards prontos pra compartilhar no Instagram.

🥗 PLANO NUTRICIONAL INTELIGENTE
Baseado em peso, raça, idade, castração e atividade do seu pet, o CronoPet calcula quantas calorias ele precisa por dia — para manter peso, emagrecer ou engordar. Recomenda 3 rações reais do mercado brasileiro (Royal Canin, Hill's, Premier, Pro Plan e outras) com porção em gramas e custo mensal estimado em reais.

📊 HISTÓRICO VISUAL
Timeline cronológica com todos os registros. Filtre por tipo de ação. Gráfico de peso com tendência automática.

🩺 SAÚDE EM UM LUGAR SÓ
Consultas, vacinas, peso e ocorrências (vômito, diarreia, mancando...). Gere um PDF completo pra levar ao veterinário — ele vai agradecer.

📷 GALERIA DE FOTOS
Toda foto registrada com uma ação vira parte de uma linha do tempo visual. Nunca mais perca um momento.

🎉 MOMENTOS ESPECIAIS
Contagem regressiva pro aniversário do pet, celebração de 100 passeios, 500 refeições, 1 mês com você.

📱 CARD COMPARTILHÁVEL
Resumo semanal e marcos viram cards 9:16 perfeitos pra stories. Viralize a rotina do seu pet.

━━ PREMIUM ━━

🎁 7 dias grátis. Sem cartão.

Depois disso:
• Família compartilhada — todos acompanham em tempo real
• Backup em nuvem — tranquilidade se trocar de celular
• Múltiplos pets — cada um com dashboard próprio
• Histórico ilimitado — nunca perde dado
• Exportação JSON — integra com sistemas veterinários

━━ FEITO POR TUTORES, PRA TUTORES ━━

Desenvolvido no Brasil, pensado pra rotina brasileira. Rações do mercado nacional, disclaimer veterinário, português em tudo.

━━ PRIVACIDADE ━━

Seus dados ficam no seu celular (local). Fotos têm EXIF removido antes de salvar. Backup na nuvem só com Premium e seu consentimento.
```

### Keywords (100 chars, separadas por vírgula, sem espaços)
```
rotina pet,cuidado cachorro,app pet,vacina,ração,peso ideal,veterinario,gato,passeio,streak,lembrete
```

### Categorias
- Primária: **Lifestyle**
- Secundária: **Utilidades**

### Classificação Etária: **4+**

---

## 2. Screenshots (6.9" — iPhone 16 Pro Max)

**5 screenshots obrigatórios + 1 opcional:**

1. **Dashboard hero** — PetHero com foto bonita + "🔥 15 dias" + action buttons. Overlay: "A rotina do seu pet no seu bolso"

2. **Plano Nutricional** — tela com 3 cards calóricos + 3 rações recomendadas com preço. Overlay: "Calcula calorias + recomenda ração (com preço!)"

3. **Modal de comida com quick chips** — captura do modal. Overlay: "Registro em 3 segundos"

4. **Timeline do histórico** — com várias entradas. Overlay: "Histórico visual completo"

5. **Card social de milestone (100 dias)** — o SocialCardView renderizado. Overlay: "Compartilhe as conquistas"

6. **(Opcional)** Saúde com PDF. Overlay: "Relatório veterinário profissional"

**Ferramentas sugeridas:** [Screenshot.rocks](https://screenshot.rocks) ou Figma com mockup de iPhone.

---

## 3. App Preview (vídeo 30s) — ROTEIRO

### Estrutura (30 segundos)

```
0-3s   | Logo CronoPet apareceindo + som de pata 🐾
         Overlay: "A rotina do seu Pet"

4-8s   | Tap no botão de Comida → modal abre → chip "100g" → "Comeu tudo" → Registrar
         Overlay: "Registre em 3 segundos"

9-14s  | Scroll do dashboard mostrando streak "15 dias" + quick stats
         Overlay: "Veja o progresso"

15-20s | Abrir /nutrition → calorias calculadas → rações recomendadas com preço R$
         Overlay: "Plano nutricional com ração REAL"

21-25s | Botão "Resumo Semanal" → card 9:16 aparece → share para Instagram
         Overlay: "Compartilhe as conquistas"

26-30s | Logo + CTA "Baixe grátis" + "cronopet.app"
```

### Trilha sonora
Música instrumental leve, sem letra. Loop de 30s. Sugestão: Epidemic Sound tag "lifestyle" ou "uplifting".

### Formato
- .mov, .mp4 ou .m4v
- Até 30 segundos
- Portrait (1080×1920)
- 30 fps

---

## 4. Estratégia de lançamento

### Dia -7 a -1 (teaser)
- [ ] Instagram/TikTok da sua conta pessoal: "Tô terminando um app pra tutores de pet 🐾 Beta em breve"
- [ ] Grupo de WhatsApp com 10-15 amigos com pet
- [ ] Convite pra beta testar via TestFlight

### Dia 0 (launch)
- [ ] **Product Hunt** (lançar 00:01 PT, terça ou quarta): vira top-5 com boa rede, ~2000 downloads
- [ ] **Hacker News**: "Show HN: CronoPet — track your pet's routine with nutrition planning"
- [ ] **Reddit**:
  - r/dogs (3.8M) — "I built an app to track my dog's routine"
  - r/cats (4.5M) — mesma
  - r/brasil (700k) — "Criei um app pra tutores brasileiros"
- [ ] **Grupos FB** de tutores BR (grupos com 100k+ cada):
  - "Cachorros e Gatos - SOS veterinário"
  - "Tutores de Pets Brasil"
  - Grupos regionais de raça específica

### Semana 1 (momentum)
- [ ] **TikTok**: 3-5 vídeos curtos (15-30s):
  - "Meu pet e o CronoPet" (POV)
  - Demo rápido do plano nutricional
  - Antes/Depois do cartão semanal
- [ ] **Instagram Reels**: igual ao TikTok, cross-posting
- [ ] **Influencers nano** (3-5 perfis com 10-50k): pet + estilo de vida. Pagar R$ 100-300 por post orgânico

### Semana 2-4 (iteração)
- [ ] Analytics de funil: onboarding → 1º log → D7 → conversão Premium
- [ ] A/B test do paywall (2 variantes: pricing em destaque vs benefícios em destaque)
- [ ] Resposta a reviews da App Store (todos, em até 24h)
- [ ] Release de patches baseados em feedback

---

## 5. Checklist técnico PRÉ-LANÇAMENTO

### Conta Apple Developer
- [ ] Apple Developer Program ($99/ano) ativo
- [ ] App record criado no App Store Connect (Bundle ID `com.cronopet.app`)
- [ ] Certificado de distribuição gerado
- [ ] Profile de distribuição configurado

### Integração StoreKit (se for lançar pago)
- [ ] Produtos criados no App Store Connect:
  - `cronopet_annual` — Auto-renewable subscription — R$ 99/ano
  - `cronopet_monthly` — Auto-renewable subscription — R$ 14,90/mês
  - Trial de 7 dias configurado nos dois
- [ ] Preencher informações bancárias + tax forms
- [ ] SDK instalado: `react-native-purchases` (RevenueCat) ou `expo-in-app-purchases`
- [ ] Sandbox testing com sandbox user
- [ ] Lógica conectada ao `setPremiumStatus` do store (já existe)

### Compliance
- [ ] **Privacy Policy** publicada em cronopet.app/privacy (ou link Notion)
- [ ] **Terms of Service** publicados em cronopet.app/termos
- [ ] **App Privacy** preenchido no App Store Connect (quais dados coleta)
- [ ] **LGPD compliance**: Brasil exige texto claro sobre armazenamento local

### Técnico
- [ ] `.env` com chaves de produção (rotacionar OWM, Supabase, Sentry)
- [ ] Build de produção via EAS: `eas build --platform ios --profile production`
- [ ] Upload pra TestFlight: `eas submit --platform ios`
- [ ] Internal testing: convidar os betatesters
- [ ] External testing: 100 pessoas max, 24-48h pra Apple aprovar

### Assets
- [ ] Ícone do app 1024×1024 (sem transparência, sem arredondamento)
- [ ] Splash screen testada em iPhone e Android
- [ ] 5 screenshots em 6.9" (iPhone 16 Pro Max — 1290×2796)
- [ ] 3 screenshots em 6.5" (iPhone 11 Pro Max — 1242×2688)
- [ ] Adaptive icon no Android

### Analytics
- [ ] Mixpanel ou Amplitude configurado (eventos: signup, first_log, paywall_view, subscription_started, subscription_cancelled)
- [ ] Sentry error tracking ativo (já configurado)
- [ ] Crash-free rate monitorado

### Marketing
- [ ] Landing page em cronopet.app (básica, com botão de download)
- [ ] @cronopet criado: Instagram, TikTok, Twitter
- [ ] E-mail de suporte: contato@cronopet.app
- [ ] FAQ básico (10 perguntas): como funciona, como cancelar Premium, como exportar dados, etc.

---

## 6. Preços e modelo

### Freemium (recomendado)

**FREE** tem acesso a:
- Todas as 6 ações diárias
- Histórico de 30 dias
- Plano nutricional completo (calorias + rações)
- PDF veterinário
- Streaks e milestones
- Cards compartilháveis
- 1 pet

**PREMIUM (R$ 14,90/mês ou R$ 99/ano)** adiciona:
- Múltiplos pets
- Compartilhamento familiar
- Backup em nuvem
- Histórico ilimitado
- Exportação JSON
- Vários planos nutricionais salvos

### Modelo alternativo: Launch sem pagamento

Premium gratuito pros primeiros 100 usuários (loading no app via query string ou código especial). Pega feedback primeiro, monetiza depois. Reduz fricção, acelera product-market fit.

### Projeções conservadoras (mês 1)

Assumindo 1.000 downloads orgânicos no primeiro mês:
- 500 (50%) fazem onboarding completo
- 300 (30%) abrem o app em D7
- 80 (8%) visitam a tela Premium
- 10 (1%) convertem em Premium anual = **R$ 990/mês de MRR**

Conservador. Com Product Hunt + TikTok viral = 5-10× isso.

---

## 7. Próximas 72 horas (roadmap)

### Sexta
- Criar app record no App Store Connect
- Decidir: launch gratuito ou com Premium

### Sábado
- Publicar Privacy Policy + Terms em cronopet.app
- Gerar screenshots (5) usando `npx react-native-screen-capture`
- Gravar App Preview (30s)

### Domingo
- Upload via EAS para TestFlight
- Convidar 15 betatesters (amigos com pet)
- Criar contas @cronopet em IG/TikTok

### Segunda
- App Store submission (Apple review 24-48h)
- Post teaser nos grupos de WhatsApp

### Terça/Quarta
- Lançamento oficial: Product Hunt 00:01 PT
- Posts simultâneos em Reddit, IG, TikTok
- Estar online o dia inteiro pra responder dúvidas

---

**Vamos? 🚀**
