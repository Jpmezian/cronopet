# Prompt: Deep Research Jurídica — CronoPet

> Copia o bloco abaixo e cola num Claude novo (de preferência usando
> Research/Deep Search se disponível, ou Sonnet/Opus mais recente). Ele
> contém TODO o contexto técnico, de produto e de negócio necessário
> pra uma análise jurídica completa.

---

```
Você é um advogado especialista em direito digital, com profundo conhecimento
de LGPD (Lei 13.709/2018), GDPR, CCPA, regulamentos de subscription do
Apple App Store e Google Play, e jurisprudência brasileira sobre aplicativos
mobile freemium.

Preciso que você FAÇA UMA PESQUISA APROFUNDADA e me entregue:

1. Lista completa de documentos jurídicos que o app CronoPet precisa
   antes de lançar no público (App Store + Google Play, mercado Brasil).
2. Para cada documento, os pontos críticos que NÃO PODEM faltar.
3. Cláusulas específicas obrigatórias dado o modelo de negócio e dados
   coletados (descrito abaixo).
4. Benchmarks de 3-5 apps similares (sugiro: Rover, Wag, MyFitnessPal,
   Strava, Petlove) — o que esses têm de bom/ruim nos T&C/Privacy?
5. Riscos jurídicos específicos do nicho (cuidado animal — disclaimer
   veterinário, responsabilidade civil, etc.).
6. O que muda entre Apple App Store Review Guidelines e Google Play
   Developer Policy em relação aos textos jurídicos.
7. Templates ou estruturas-base prontas pra adaptar (links de
   ferramentas tipo iubenda, Termly, ou modelos de cliente Brasil).
8. Dúvidas que devo levar a um advogado caso queira blindagem completa
   (o que dá pra resolver com template vs o que exige consultoria).

═══════════════════════════════════════════════════════════════════════════
CONTEXTO DO APP — CronoPet
═══════════════════════════════════════════════════════════════════════════

## 1. O que é o app

CronoPet é um aplicativo mobile (iOS + Android) de cuidados com pets
domésticos (cachorros e gatos, principalmente). Permite ao tutor:
- Registrar a rotina diária do pet (comida, água, passeio, xixi, cocô,
  banho, tosa) com foto e observações
- Acompanhar saúde: vacinas, consultas, peso, ocorrências médicas
- Receber lembretes de horários
- Detectar padrões anormais via heurística local (queda de apetite,
  deficit de exercício, etc.) — chamado "Health Insights"
- Gerar relatório PDF pra levar ao veterinário
- Ver plano nutricional personalizado (cálculo calórico baseado em
  fórmula NRC 2006) e recomendações de rações comerciais
- Compartilhar card visual semanal pra Instagram Stories
- Opcional: análise por IA (Claude/Anthropic via Edge Function própria)
- Opcional: grupo familiar pra múltiplos tutores acompanharem o mesmo pet
- Opcional: trava biométrica do app (Face/Touch ID)

## 2. Modelo de negócio

**Freemium com subscription auto-renewable:**
- Free: rotina básica, histórico 30d, plano nutricional, PDF, card semanal
- Pro (R$ 14,90/mês ou R$ 99/ano com 7 dias de trial grátis):
  - Histórico ilimitado
  - Múltiplos pets
  - Família compartilhada (sync via cloud)
  - Backup em nuvem
  - Avisos automáticos de saúde (heurística + IA opt-in)
  - Exportação completa de dados

Cobrança via:
- iOS: StoreKit 2 (Apple — recebe 15-30%)
- Android: Google Play Billing (Google — recebe 15-30%)
- Wrapper: RevenueCat (não cobra de vez, só agrega)

NÃO há venda de produtos físicos, NÃO há marketplace, NÃO há ads,
NÃO há comissão de venda de rações (apenas mostra preços de referência
informativos sem links de afiliado).

## 3. Dados coletados (importante pra Privacy Policy)

### 3.1 Dados pessoais do tutor (PII):
- Email (auth via Supabase — opt-in, só quando ativa Pro/família)
- Nome (livre, escolhido pelo user)
- ID de usuário interno (UUID v4, gerado pelo Supabase Auth)
- IP da requisição (no servidor Supabase, log retido por logs próprios
  do Supabase — não acessamos diretamente)

### 3.2 Dados do pet:
- Nome, espécie (cachorro/gato/outro), raça, foto, data de nascimento
- Peso, condição corporal, atividade base, castrado?, porte
- Anotações livres ("Notas gerais" — texto livre escrito pelo tutor,
  pode mencionar alergias, medicações)

### 3.3 Dados de comportamento / saúde do pet:
- Logs de cada ação (timestamp, quantidade, foto opcional, nota)
- Eventos médicos (sintomas, vômitos, anormalidades)
- Vacinas aplicadas
- Consultas agendadas
- Histórico de peso

### 3.4 Dados técnicos:
- Crash reports via Sentry (com PII scrubbing — emails/IPs removidos
  via `beforeSend`)
- Eventos de produto via PostHog (opt-in, anônimos por padrão)
- Geolocalização (when-in-use) APENAS pra clima local — não armazenamos,
  só consultamos OpenWeatherMap pra mostrar "asfalto quente"
- Status do device (versão iOS/Android) via Sentry/PostHog
- Fotos do pet/registros — armazenadas LOCAL no device (com EXIF/GPS
  removido automaticamente); só vão pra cloud se user ativar família

### 3.5 Dados de IA (Edge Function própria):
- Quando Pro ativa "análise por IA", enviamos payload ANONIMIZADO
  (sem nome do pet, sem foto, sem email, sem user_id) pra nossa Edge
  Function que chama a API Anthropic
- Payload contém apenas: tipo do animal, raça, idade, peso, sexo, e
  agregados de comportamento (médias, contagens dos últimos N dias)
- A Anthropic recebe esses dados — sua privacy policy deve cobrir isso
- NÃO persistimos nada na nossa Edge Function (request → API → response)

## 4. Onde os dados ficam

### 4.1 No device (default — 100% offline):
- MMKV (banco de dados key-value criptografado AES-256 com chave no
  iOS Keychain / Android Keystore)
- Fotos em `Documents/cronopet_photo_*.jpg` (com EXIF removido)

### 4.2 Em servidor (OPCIONAL — só se user ativa Pro com família):
- Supabase Postgres hospedado em AWS (região us-east-1) — projeto
  `qhbsmvuwuiupdqdrrdov.supabase.co`
- Tabelas: profiles, family_groups, family_members, pets, action_logs,
  vaccines, appointments, weight_entries, subscriptions, audit_log
- Row-Level Security (RLS) em todas — user só lê/escreve linhas onde
  é membro do grupo

### 4.3 Em terceiros:
- **Sentry** (crash reports + performance) — dados com PII scrubbing
- **PostHog** (analytics opcional) — eventos anônimos por padrão
- **RevenueCat** (gateway de IAP) — apenas user_id + entitlement +
  status de assinatura
- **OpenWeatherMap** (clima) — coordenadas aproximadas, sem armazenar
- **Apple/Google** (subscription processing) — recebem dados de pagamento
  diretamente, não passam pelo nosso servidor

## 5. Jurisdição e mercado

- **Mercado inicial:** Brasil (pt-BR)
- **Idiomas:** Português brasileiro apenas (v1)
- **Empresa:** João Pedro Oliva — Pessoa Física por enquanto, vai
  evoluir pra MEI ou LTDA conforme escala
- **Domínio:** cronopet.com.br (já adquirido)
- **Email de contato:** contato@cronopet.com.br
- **Apple Team ID:** 7RSGWY462K (Individual)
- **Bundle ID:** com.cronopet.app
- **App Store Connect App ID:** 6770387252

## 6. Disclaimers que JÁ estão no app

Já temos no UI:
- "Este app NÃO substitui consulta veterinária. Sempre confirme com
  profissional." (no relatório PDF + na tela de nutrição + em Settings)
- "Estimativas calóricas baseadas em fórmula NRC 2006 (National Research
  Council). Cada pet é único. Antes de mudar a dieta, consulte um vet."
- "Sugestões de rações são INFORMATIVAS. CronoPet não tem parceria
  comercial com nenhuma marca, não recebe comissão. Preços aproximados
  variam por região."
- "Health Insights detectam padrões automaticamente cruzando os
  registros do tutor com regras clínicas. NÃO são diagnóstico."
- "CronoPet não se responsabiliza pela saúde do seu animal."

## 7. Stack técnica resumida (pra você entender o que vai pra cloud)

- React Native + Expo SDK 54 (managed workflow)
- Zustand + persist (MMKV criptografado)
- Supabase (Postgres + Auth + Edge Functions)
- RevenueCat (IAP)
- Sentry com PII scrubbing
- PostHog (opcional)
- expo-image-manipulator (remove EXIF de fotos automaticamente)
- expo-secure-store (Keychain/Keystore pra chave de encryption)
- expo-local-authentication (Face/Touch ID opt-in)
- Open source: nenhum copyleft (GPL), apenas MIT/Apache 2.0
- Sem código de terceiros não-confiável (todas deps de npm/pypi)

## 8. Pontos específicos a abordar na pesquisa

Por favor cubra explicitamente:

### LGPD (Brasil — prioridade máxima):
- Bases legais aplicáveis (consentimento? legítimo interesse? execução
  de contrato?)
- Direitos do titular (acesso, correção, eliminação, portabilidade)
  — como devemos implementar via app?
- Encarregado de dados (DPO) — pessoa física precisa designar?
- Notificação de incidente (ANPD em até 2 dias úteis se grave)
- Transferência internacional (Supabase em AWS us-east-1, Anthropic
  US, Apple/Google US) — exige cláusulas específicas

### Apple App Store:
- Subscription Terms: Apple exige texto específico antes do paywall.
  O que precisa exatamente?
- App Privacy ("nutrition labels") — categorias que precisamos marcar
- Restoring Purchases — Apple exige botão "Restaurar Compras" visível
- Cancellation — explicar como cancelar nas Settings da Apple
- Acesso a fotos/câmera — precisa string de uso em pt-BR (já temos)

### Google Play (futuro):
- Data Safety form — análogo ao App Privacy da Apple
- Family Apps Policy se classificar pra menores
- Subscription cancellation pelo Google Play Settings

### IAP recorrente:
- Lei do consumidor brasileiro vs auto-renewal
- Período de reflexão (7 dias) — colide com trial de 7 dias?
- Como cobrar IPI/ICMS — Apple/Google já cobram, ou precisamos?
- Nota fiscal — emissão automática via Apple? Ou precisamos integrar
  com SEFAZ?

### Cuidado animal específico:
- Há regulação CFMV (Conselho Federal de Medicina Veterinária)
  sobre apps que dão "orientação"? Mesmo com disclaimer?
- Recomendar rações específicas (mesmo sem comissão) pode ser
  considerado prática veterinária irregular?
- Health Insights heurísticos sugerindo "consulte veterinário" tem
  algum risco se errar?

### Família compartilhada:
- Quando user A compartilha grupo com user B, B vê dados do pet de A.
  Precisa termos específicos sobre compartilhamento entre usuários?
- E se A registra evento médico sensível e B é minor de idade?

### Termos quanto a:
- Idade mínima do user (13 anos? 18? Apple/Google têm requisitos)
- Conteúdo gerado pelo usuário (notas, fotos) — direito de moderação?
- Exclusão de conta — como, em quanto tempo, o que sobrevive?
- Backup em nuvem — termo claro sobre retenção quando user cancela Pro
- Mudança de termos — pode ser unilateral?

## 9. Output esperado

Quero um documento estruturado em:

1. **Lista de documentos jurídicos** (priorizada pelo que é
   release-blocker pra App Store/Play vs nice-to-have)

2. **Para cada doc:**
   - Cláusulas obrigatórias (com texto-base sugerido em pt-BR)
   - Cláusulas recomendadas
   - Cláusulas a discutir com advogado

3. **Riscos jurídicos** classificados por severidade
   (crítico/médio/baixo) com mitigação sugerida

4. **Próximos passos práticos**:
   - O que dá pra usar templates (iubenda, Termly, etc.) — quais
     planos suprem o nosso caso?
   - O que exige advogado especializado em direito digital
   - Ordem de prioridade: o que fazer essa semana vs próximo mês

5. **Benchmarks**: como Rover, Wag, MyFitnessPal, Strava, Petlove,
   DogHero estruturam seus T&C e Privacy. O que copiar, o que evitar.

6. **Links úteis**: ANPD (Brasil), CFMV (veterinário), Apple
   Developer Legal, Google Play Policy, modelos gratuitos confiáveis.

Faça a pesquisa COM PROFUNDIDADE (search múltiplas fontes, compare
versões, identifique padrões). NÃO me dê uma resposta superficial
de uma página — quero o máximo de detalhe possível. Vou ler tudo.

Obrigado!
```

---

## Notas de uso

- **Onde colar:** Claude.ai com modelo Opus, ou Claude Code com
  research/deep search habilitado, ou via API com `thinking` ativado
  e max_tokens alto (16k+).
- **Tempo esperado de resposta:** 5-15 min se for research profundo.
- **Output esperado:** documento longo (~3000-5000 palavras) que você
  vai aproveitar pra:
  1. Discutir com advogado (ele revisa o que o Claude levantou)
  2. Contratar template iubenda/Termly cobrindo os pontos críticos
  3. Hospedar em cronopet.com.br/privacy e /termos
  4. Linkar no app (Settings → Sobre + ASC App Privacy + paywall)

## Pós-pesquisa

Quando tiver o resultado, me passa o output. Eu posso:
- Implementar os links pros docs no app (Settings + paywall + ASC)
- Adicionar tela "Termos" / "Privacidade" se quiser inline
- Atualizar `APP_STORE_SUBMISSION.md` com as categorias certas do
  App Privacy questionnaire
- Plugar consent banner se necessário (PostHog, cookies, etc.)
