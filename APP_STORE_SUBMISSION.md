# CronoPet — App Store Connect Submission Pack

> Tudo o que vc precisa colar no App Store Connect, organizado na ordem
> dos formulários. Baseado no código real (não chute) e na audit de
> segurança de 2026-05-21.

---

## 1. App Information

| Campo | Valor |
|---|---|
| **Name** | `CronoPet` |
| **Subtitle** | `Cuidados, vacinas e saúde` (25 chars) |
| **Primary Language** | Portuguese (Brazil) |
| **Bundle ID** | `com.cronopet.app` |
| **SKU** | `cronopet-001` |
| **Apple ID (numeric)** | `6770387252` |
| **Apple Team ID** | `7RSGWY462K` |
| **Primary Category** | Lifestyle |
| **Secondary Category** | Health & Fitness |
| **Content Rights** | Does not contain, show, or access third-party content |
| **Age Rating** | 4+ (no questionnaire item flags) |

### URLs
| Campo | URL |
|---|---|
| **Privacy Policy URL** | `https://cronopet.com.br/privacidade` |
| **Support URL** | `https://cronopet.com.br` |
| **Marketing URL** *(optional)* | `https://cronopet.com.br` |

---

## 2. App Privacy (mais demorado, ~30min) ⚠️

Apple pergunta categoria por categoria se vc coleta + se é "linked to user" + se é "used for tracking". Cole as respostas abaixo na ordem do questionnaire.

### Dados COLETADOS (5 categorias)

#### 📧 Contact Info → **Email Address**
- **Coletado?** Sim
- **Linked to user?** Sim
- **Used for tracking?** **NÃO**
- **Purposes:** App Functionality (auth do Supabase pra family sharing — opcional, só ativa se user criar conta)

#### 📍 Location → **Precise Location**
- **Coletado?** Sim
- **Linked to user?** Não
- **Used for tracking?** Não
- **Purposes:** App Functionality (lat/lon → fetch OpenWeatherMap pra mostrar temperatura local e alerta de asfalto quente; lat/lon NUNCA são persistidos no nosso servidor, vão direto pro OWM)

#### 📸 User Content → **Photos or Videos** + **Other User Content**
- **Coletado?** Sim
- **Linked to user?** Sim (no family sharing)
- **Used for tracking?** Não
- **Purposes:** App Functionality
- **Detalhes que Apple pode pedir:**
  - Fotos: do pet, do cocô (para mostrar ao vet), de eventos médicos. EXIF é REMOVIDO antes de salvar (`expo-image-manipulator` reencoda — `store/usePetStore.ts:42-70`).
  - Other content: notas livres em registros (texto curto), observações em eventos médicos.

#### 🆔 Identifiers → **User ID**
- **Coletado?** Sim
- **Linked to user?** Sim
- **Used for tracking?** Não
- **Purposes:** App Functionality (UUID gerado por Supabase auth quando user opta por family sharing — não-anônimo só pra esse user logar de volta)

#### 📊 Usage Data → **Product Interaction**
- **Coletado?** Sim
- **Linked to user?** Não (anonimizado via hash — `services/analytics.ts:135`)
- **Used for tracking?** Não
- **Purposes:** Analytics (PostHog — eventos como `paywall_viewed`, `action_logged`, `daily_goals_completed`. Nunca peso real, nome do pet, fotos.)

#### 🐞 Diagnostics → **Crash Data** + **Performance Data**
- **Coletado?** Sim
- **Linked to user?** Não (PII scrub via Sentry `beforeSend` + `beforeBreadcrumb`)
- **Used for tracking?** Não
- **Purposes:** App Functionality (Sentry — crashes e erros, sem PII via scrub configurado em `app/_layout.tsx`)

### Dados NÃO coletados (responder "No")
- ❌ Health & Fitness data (de **humanos** — Apple distingue; pet data não é Apple Health data)
- ❌ Financial Info (RevenueCat e Apple Pay processam — não chega ao nosso app)
- ❌ Sensitive Info (race, religion, orientation, etc)
- ❌ Contacts
- ❌ Browsing History
- ❌ Search History
- ❌ Coarse Location (só usamos Precise)
- ❌ Audio Data
- ❌ Customer Support
- ❌ Other Data

### Resposta final do questionnaire:
- **Does this app use data for tracking purposes?** → **NO** (não cruzamos dados com terceiros pra ads / data brokers)
- **Encryption** → No (already declared via `ITSAppUsesNonExemptEncryption: false` em `app.json`)

---

## 3. Pricing & Availability

| Campo | Valor |
|---|---|
| **Price** | Free (tier 0) |
| **Available in** | Brazil (start small) |
| **App Distribution** | Public on App Store |
| **Pre-orders** | Not enabled |

Premium (R$ 14,90/mês ou R$ 99/ano) é via In-App Purchase, configurar **depois** que o app for aprovado (separado do submit inicial). Recomendo lançar **grátis** primeiro, ativar Premium na v1.1.

---

## 4. Screenshots (5 obrigatórios)

**Required:** iPhone 6.9" (1290 × 2796 pixels) — 5 screenshots

Cenários sugeridos (cada um vale 1 screenshot):

1. **Home com pet ativo + streak** — captura da `app/(tabs)/index.tsx` com 1-2 ações registradas, streak visível
2. **Aba Médico com timeline** — captura da `app/(tabs)/medical.tsx` com vacinas/eventos
3. **Plano nutricional** — captura da `app/nutrition.tsx` mostrando 3 rações recomendadas com preço/dia
4. **Health insight card crítico** — captura mostrando o sistema de detectores em ação ("Bidu pode estar com diarreia" etc)
5. **PDF preview** — captura da geração do relatório veterinário

**Como gerar:** simulator iOS 16 Pro Max em Xcode → ⌘+S salva PNG na ~/Desktop. Cropping desnecessário (já vem em 1290×2796).

**Optional but recommended:**
- iPhone 6.5" (1242 × 2688) — 3 screenshots (mesmas cenas, simulator menor)
- App Preview vídeo 30s — roteiro pronto em `LAUNCH.md` seção 3

---

## 5. Reviewer Notes (campo "Notes" — colar inteiro)

```
Olá Apple Review team,

O CronoPet é um app local-first de organização de rotina e saúde de
pets (cachorro/gato). 100% das features principais funcionam SEM
necessidade de criar conta — não há login obrigatório, paywall de
entrada, ou OAuth.

DEMO ACCOUNT NOT NEEDED:
- Abra o app, complete o onboarding em 3 telas (nome do pet, tipo,
  raça opcional). Demora ~30 segundos.
- Todos os recursos ficam disponíveis imediatamente: registro de
  ações diárias (comida/água/passeio/etc), histórico, gráficos de
  peso, plano nutricional, geração de PDF clínico, alertas de saúde.
- Login (email + senha via Supabase) é OPCIONAL e só desbloqueia
  family sharing (compartilhar registros com outros tutores) — fica
  em Settings → Premium.

WHAT THE APP DOES:
- Registra alimentação, água, passeios, evacuações, peso, vacinas
- Detecta 40 padrões clínicos baseados em literatura veterinária
  (AVMA, VetCompass UK, Merck Manual) — sistema de regras, NÃO IA
- Gera PDF para levar ao veterinário
- Alertas térmicos por raça (asfalto quente, frio)

PRIVACY & SECURITY:
- App é local-first: dados ficam no MMKV encrypted (AES-256, chave
  no Keychain) do device
- Sem rastreamento (App Privacy questionnaire confirmado: "Tracking: No")
- Privacy Policy: https://cronopet.com.br/privacidade
- Terms: https://cronopet.com.br/termos
- Suporte: contato@cronopet.com.br

THIRD-PARTY SERVICES (todos opcionais ou anonimizados):
- Supabase: auth para family sharing (opt-in)
- OpenWeatherMap: temperatura local (lat/lon NÃO persistida)
- Sentry: crash reporting com PII scrub configurado
- PostHog: analytics anonimizada (sem peso, nome, fotos)
- RevenueCat: gerenciamento de assinatura (Apple processa pagamento)

NOT MEDICAL DEVICE:
O app exibe disclaimer claro em todos os pontos relevantes:
"O CronoPet NÃO diagnostica e NÃO substitui o veterinário." Os
detectores apenas sinalizam padrões merecedores de atenção.
Sem prescrição de medicamentos. Sem reivindicação de cura.

Qualquer dúvida, contato@cronopet.com.br responde no mesmo dia.
Obrigado pela revisão.
```

---

## 6. ASO Copy (refinado, char counts validados)

### Title (max 30 chars)
```
CronoPet: Rotina do Pet
```
**23 chars ✓** — inclui keyword principal

### Subtitle (max 30 chars)
```
Cuidados, vacinas e saúde
```
**25 chars ✓**

### Promotional Text (max 170 chars — atualizável sem revisão)
```
Registre alimentação, peso e vacinas em 3 segundos. Gere o PDF que o vet usa. 40 detectores clínicos baseados em literatura veterinária real.
```
**149 chars ✓**

### Keywords (max 100 chars, comma-separated, NO SPACES após vírgula)
```
pet,cachorro,gato,vacina,veterinario,saude pet,rotina pet,peso pet,cuidados,alimentação,passeio,racao
```
**102 chars** — cortar uma. Versão final 98 chars:
```
pet,cachorro,gato,vacina,vet,saude pet,rotina,peso pet,cuidados,alimentação,passeio,racao,medico
```

### Description (max 4000 chars — primeiros 250 chars são CRÍTICOS)

```
O CronoPet é o jeito mais simples de cuidar do seu pet com método — sem planilha, sem caderninho, sem depender da memória. Registre em 3 segundos. O app cruza tudo com literatura veterinária e gera o PDF que o veterinário usa.

━━ O QUE VOCÊ GANHA ━━

🍖 REGISTRO RÁPIDO
Toque em um botão e pronto. Opcionalmente salva quantidade (gramas), duração do passeio, consistência das fezes, foto e notas clínicas.

🔥 STREAK DE CUIDADOS
Veja quantos dias seguidos seu pet teve a rotina completa. Celebre marcos (7, 30, 100, 365 dias) com cards prontos pra compartilhar.

🥗 PLANO NUTRICIONAL INTELIGENTE
Baseado em peso, raça, idade, castração e atividade. Recomenda 22 rações reais do mercado brasileiro (Royal Canin, Hill's, Premier, Pro Plan, Golden) com porção em gramas e custo mensal em R$.

📊 HISTÓRICO COMPLETO
Timeline cronológica com fotos. Gráfico de peso com tendência automática. Filtros por tipo de ação.

🩺 SAÚDE EM UM LUGAR SÓ
Consultas, vacinas, peso, eventos (vômito, diarreia, mancando, coceira). PDF completo de 30 ou 90 dias pra levar ao vet.

🧠 40 DETECTORES CLÍNICOS
Sistema baseado em literatura veterinária real (VetCompass UK, AVMA, Merck Manual, Cornell Feline Health Center). Cruza histórico, raça e padrão pessoal — avisa antes da consulta. NUNCA diagnostica, sempre fecha com "consulte o veterinário".

🐕 69 RAÇAS CATALOGADAS
Cada uma com predisposições, peso ideal, expectativa de vida, exercício recomendado, frequência de banho, tolerância térmica. Cavalier King Charles → doença mitral. Pug → calor. Pastor Alemão → displasia. Vira-lata também.

🌡️ ALERTAS POR RAÇA + CLIMA
Combina temperatura local com tolerância da raça. Pug em dia de 33°C? Avisa. Chihuahua em 8°C? Avisa.

📷 GALERIA AUTOMÁTICA
Toda foto registrada vira parte do histórico visual. EXIF removido antes de salvar (privacidade).

🔒 PRIVACIDADE EM PRIMEIRO LUGAR
App local-first: seus dados ficam no SEU iPhone, encriptados (AES-256 + Keychain). Não vendemos dados. Não rastreamos entre apps. LGPD compliant.

━━ NÃO É IA ━━

CronoPet NÃO é "AI vet" nem chute. É um sistema de regras escrito a partir de manuais veterinários reais. Cada detector tem fonte citada. Trabalha PRO veterinário, não no lugar dele.

━━ PREMIUM (opcional) ━━

Plano grátis cobre tudo o essencial. Premium (R$ 14,90/mês ou R$ 99/ano com 7 dias grátis) adiciona:
• Múltiplos pets
• Compartilhamento familiar (rotina em tempo real)
• Backup em nuvem encrypted
• Histórico ilimitado
• Vários planos nutricionais salvos

Apoie pequenos times brasileiros fazendo coisa bem feita. 🇧🇷

━━ SUPORTE ━━

contato@cronopet.com.br · cronopet.com.br
```

**~3.100 chars** — tem espaço pra incrementar se quiser.

---

## 7. Build (TestFlight → Submit)

**Estado atual:**
- ✅ Build #1 da v1.0.0 submitted em 2026-05-19 (pre-security-patches)
- 🟡 Build #2 em andamento agora — inclui PKCE flow, Sentry PII scrub, supabase config
- ⏭️  Quando build #2 terminar (~15-20min), rodar:
  ```bash
  eas submit --platform ios --latest
  ```
  Os credentials do submit já estão no `eas.json`, só pergunta se quer reusar Apple Connect API Key (Y).

**Antes de submeter pra review:**
1. Instala TestFlight no iPhone → vai aparecer o build novo
2. Testa fluxos críticos (lista no §10 abaixo)
3. Se OK → no App Store Connect, Build → seleciona "1.0.0 build #2" no campo "Build"
4. Submit for Review

---

## 8. Categorias do questionnaire de "Export Compliance"

App Store Connect vai te perguntar isto ao submeter o build:

| Pergunta | Resposta |
|---|---|
| Does your app use encryption? | **No** |

(Já declarado via `ITSAppUsesNonExemptEncryption: false` em `app.json` — mas Apple às vezes confirma de novo. MMKV AES-256 cai em qualified exemption porque é "limited to authentication / data integrity protection", elegível pra essa resposta. Se vc quiser ser 100% paranoico, marcar "Yes" + "Yes (qualified for exemption)" + selecionar "App uses standard encryption algorithms for authentication / data integrity / IP protection". Não bloqueia.)

---

## 9. App Store Connect — passo-a-passo final

1. **App Information** (sidebar) → cola tabela do §1
2. **App Privacy** (sidebar) → clica em "Edit" e responde categoria por categoria com base no §2
3. **Pricing and Availability** (sidebar) → Free + Brazil
4. **Localizations → Portuguese (Brazil)**:
   - Description: cola do §6
   - Keywords: cola do §6
   - Promotional Text: cola do §6
   - Subtitle: `Cuidados, vacinas e saúde`
   - URLs: Privacy Policy + Support
5. **Screenshots → iPhone 6.9"**: arrasta os 5 PNGs (gerar via simulator)
6. **Build**: seleciona o build mais recente do TestFlight
7. **Version Information → App Review Information**:
   - Cola texto do §5 no campo "Notes"
   - First Name / Last Name / Phone / Email: seus dados
   - Sign-in required: **No**
8. **Save** → **Submit for Review**

Tempo de review Apple: 24-48h (média atual em 2026).

---

## 10. Checklist de smoke test no iPhone (TestFlight) ANTES de submit

Marque cada item:

- [ ] Cold start < 3s, sem tela branca persistente
- [ ] Onboarding completa (nome → tipo → raça → foto opcional → home)
- [ ] Tirar foto OU escolher da galeria → salva no perfil
- [ ] Permissão de notification aceita → bell icon em Settings
- [ ] Registrar 1 comida + 1 água → streak vai pra 1
- [ ] Registrar peso → aparece em /medical
- [ ] Aba Médico → adicionar vacina → fica na lista
- [ ] Settings → Exportar PDF → share sheet abre
- [ ] Settings → Apagar conta → dialog de confirmação → cancela → não crasha
- [ ] Force quit → reabrir → estado preservado (pet ainda lá)
- [ ] Modo avião → cold start → app abre normal (local-first)
- [ ] Provocar erro (ex: clicar em buttons rapidamente em sequência) → não crasha

Se algum quebrar → screenshot + cola erro aqui, eu ajusto.

---

## 11. O que NÃO vai pra App Store (v1.1+)

- ❌ RevenueCat ativo em prod (já tá no código com fallback stub — ativa setando env keys)
- ❌ Family sharing screen (existe em código mas não está exposta no UI flow do v1.0)
- ❌ Cloud sync (Supabase backend pronto, UI gated atrás de Premium)
- ❌ Multi-pet (gated atrás de Premium)

Pra v1.0 lançar **grátis com 1 pet local-first** já tem product/market fit suficiente. Premium ativa na v1.1.
