# Política de Privacidade — CronoPet

**Última atualização:** 24 de maio de 2026 · **Versão:** 2.0

> Esta política substitui qualquer versão anterior. Em caso de conflito, prevalece esta.

---

Esta Política descreve como o aplicativo móvel **CronoPet** ("aplicativo", "app", "nós") coleta, usa, armazena, compartilha e protege seus dados pessoais. Foi elaborada em conformidade com a **Lei nº 13.709/2018 (LGPD)** e com as políticas vigentes da Apple App Store e Google Play.

---

## 1. Identificação do Controlador

O CronoPet é operado por **João Pedro Oliva**, pessoa física, domiciliado no Brasil. Para fins da LGPD, atuamos como **controlador** dos dados pessoais.

- **Canal de privacidade:** privacidade@cronopet.com.br
- **Contato geral:** contato@cronopet.com.br
- **Site:** cronopet.com.br

Esta identificação será atualizada quando da constituição da pessoa jurídica.

---

## 2. Encarregado pelo Tratamento de Dados (DPO)

Atuamos como **agente de tratamento de pequeno porte** nos termos da **Resolução CD/ANPD nº 2/2022**, dispensados da nomeação formal de Encarregado. Disponibilizamos canal exclusivo de comunicação:

**privacidade@cronopet.com.br** — respondemos em até **15 dias úteis** conforme art. 19 da LGPD.

---

## 3. Dados que tratamos

### 3.1 Identificação do tutor
- Nome (livre, escolhido por você)
- E-mail — apenas se ativar plano Pro ou função de família compartilhada
- Identificador único interno (UUID v4)
- Endereço IP (registrado nos logs do Supabase, não acessamos diretamente)

### 3.2 Dados do animal
- Nome, espécie, raça, foto, data de nascimento
- Peso, condição corporal, atividade, castração, porte
- Anotações livres do tutor (alergias, medicações, particularidades)

### 3.3 Comportamento e saúde do animal
- Registros de rotina (comida, água, passeio, xixi, cocô, banho, tosa) com data/hora, quantidade, foto e nota
- Eventos médicos, sintomas, ocorrências
- Vacinas aplicadas e próximas doses
- Consultas agendadas e passadas
- Histórico de peso

### 3.4 Dados técnicos
- Crash reports via **Sentry** — com PII scrubbing automático (e-mails, IPs, tokens redacted)
- Métricas anônimas de uso via **PostHog** — somente mediante consentimento opt-in
- Versão do sistema operacional, modelo do device
- Geolocalização aproximada para consulta de clima — **não persistida**

### 3.5 Dados financeiros
O pagamento é processado **integralmente** pela Apple (StoreKit) ou Google (Play Billing). **Não temos acesso** a número de cartão, CVV ou dados bancários. Recebemos apenas o identificador da transação via **RevenueCat** para validar seu status de assinatura.

---

## 4. Bases legais (LGPD art. 7º)

| Atividade | Base legal |
|---|---|
| Conta (Pro/família), registro de rotina, backup nuvem | Execução de contrato (V) |
| Compartilhamento familiar | Consentimento bilateral (I) |
| Análise por IA opcional | Consentimento específico (I) |
| Crash reports com PII scrubbing | Legítimo interesse (IX) |
| Analytics anônimo | Consentimento opt-in (I) |
| Geolocalização para clima | Execução de contrato (V) — não persistida |
| Cobrança via Apple/Google | Execução de contrato (V) |

---

## 5. Operadores (subprocessadores)

| Operador | Finalidade | País | Mecanismo |
|---|---|---|---|
| Supabase (AWS) | Backend, autenticação | EUA (us-east-1) | Cláusulas-Padrão ANPD (Res. 19/2024) |
| Sentry | Crash reports | EUA | Cláusulas-Padrão ANPD |
| PostHog | Analytics anônimo (opt-in) | EUA | Cláusulas-Padrão ANPD |
| RevenueCat | Gestão de assinaturas | EUA | Cláusulas-Padrão ANPD |
| Anthropic | IA opcional (Claude) | EUA | Cláusulas-Padrão ANPD |
| OpenWeatherMap | Clima local | Reino Unido | Cláusulas-Padrão ANPD |
| Apple / Google | Distribuição e pagamento | EUA | Cláusulas-Padrão ANPD |

**Não vendemos dados. Não usamos pra publicidade. Não compartilhamos pra marketing de terceiros.**

---

## 6. Onde seus dados ficam

### 6.1 Localmente no dispositivo (padrão)
**Por padrão, todos os dados ficam apenas no seu celular**, em banco MMKV criptografado **AES-256** com chave no Keychain (iOS) ou Keystore (Android). Fotos têm metadados EXIF removidos automaticamente.

### 6.2 Em nuvem (opcional — apenas Pro)
Se você ativar **compartilhamento familiar** ou **backup em nuvem**, os dados são sincronizados com nossos servidores no **Supabase (AWS us-east-1, EUA)**, mantidos pelo período de assinatura ativa + **30 dias** para reativação. Após esse prazo, eliminação em até **60 dias**.

---

## 7. Análise por IA (opt-in)

Quando você ativa **"Análise por IA"**, enviamos dados **anonimizados** (sem nome, foto, e-mail ou identificadores diretos) para o serviço **Claude**, da **Anthropic, PBC** (EUA), exclusivamente para gerar insights educativos.

- Chamada via Edge Function própria (Supabase) com **retenção zero** na Anthropic
- Você pode revogar o consentimento a qualquer momento em **Ajustes &gt; Privacidade**
- Direito a **revisão humana** da análise (LGPD art. 20) via privacidade@cronopet.com.br

---

## 8. Seus direitos (LGPD art. 18)

Você pode solicitar gratuitamente:

1. **Confirmação** da existência de tratamento
2. **Acesso** aos dados
3. **Correção** de dados incompletos/inexatos
4. **Anonimização/eliminação** de dados desnecessários ou tratados em desconformidade
5. **Portabilidade** a outro fornecedor
6. **Eliminação** dos dados tratados com base no consentimento
7. **Informação** sobre compartilhamento
8. **Revogação** do consentimento

**Como exercer:**
- Pelo app: Ajustes &gt; Privacidade e Dados (correção, exclusão)
- Por e-mail: privacidade@cronopet.com.br (qualquer direito)

Respondemos em até **15 dias úteis**.

---

## 9. Retenção e eliminação

- **Dados locais:** sob seu controle exclusivo. Apague em **Ajustes &gt; Excluir minha conta**
- **Dados em nuvem (Pro):** assinatura ativa + 30 dias + eliminação em 60 dias
- **Logs servidor:** 30 dias (segurança/auditoria)
- **Dados fiscais:** prazo legal mínimo (Receita Federal/ANPD)

---

## 10. Segurança

- **Criptografia em repouso:** AES-256 com chave no Keychain/Keystore
- **Criptografia em trânsito:** HTTPS/TLS obrigatório
- **EXIF removido:** automático em todas as fotos
- **PII scrubbing:** e-mails/IPs/tokens redacted nos logs Sentry
- **Row-Level Security:** ativo em todas as tabelas servidor
- **Autenticação biométrica:** opcional (Face ID / Touch ID)
- **Permissões mínimas:** solicitamos apenas o estritamente necessário

---

## 11. Incidentes de segurança

Caso ocorra incidente com risco ou dano relevante, comunicaremos à **ANPD em até 6 dias úteis** (agente de pequeno porte, Res. CD/ANPD 15/2024) e aos titulares afetados o quanto antes.

---

## 12. Crianças e adolescentes

O CronoPet **não é destinado a menores de 18 anos**. Não permitimos cadastro de menores. Caso identifiquemos tratamento de dados de menor sem consentimento adequado, excluiremos imediatamente.

---

## 13. Cookies, tracking e publicidade

- **Não usamos cookies de marketing** nem tracking entre apps
- **Não vendemos** dados pra anunciantes
- **Não usamos SDKs de redes sociais** (Facebook, TikTok) pra rastreio
- Sentry (crash reports) pode ser desativado em Ajustes
- **App Tracking Transparency (ATT) Apple:** não solicitamos permissão pois não rastreamos

---

## 14. Alterações nesta política

Mudanças relevantes serão comunicadas dentro do app e por e-mail (quando aplicável) com antecedência mínima de **30 dias**. Versão atual sempre em **cronopet.com.br/privacidade**.

---

## 15. Foro e legislação aplicável

Esta Política é regida pela legislação brasileira. Para qualquer questão relacionada ao tratamento de seus dados, o foro é o do seu domicílio (CDC art. 101, I). Caso entenda que algum direito não foi atendido, você pode reclamar à **Autoridade Nacional de Proteção de Dados (ANPD)**: gov.br/anpd

---

**Dúvidas, solicitações ou exercício de direitos:** privacidade@cronopet.com.br
