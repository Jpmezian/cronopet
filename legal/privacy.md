# Política de Privacidade — CronoPet

**Última atualização:** 28 de abril de 2026

Esta Política de Privacidade explica, em linguagem clara, como o **CronoPet** coleta, utiliza, armazena, compartilha e protege os dados das pessoas que usam nosso aplicativo. Levamos a sua privacidade — e a do seu pet — muito a sério.

Este documento foi elaborado em conformidade com a **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)** e, para usuários localizados na União Europeia, com o **Regulamento Geral de Proteção de Dados (GDPR — Regulamento UE 2016/679)**.

---

## 1. Quem somos

O CronoPet é um aplicativo móvel para iOS e Android desenvolvido para ajudar tutores a acompanhar a rotina de cuidados dos seus pets (alimentação, hidratação, passeios, saúde, vacinas, entre outros).

- **Nome do controlador:** CronoPet
- **CNPJ:** *a ser preenchido após registro do MEI/empresa*
- **Endereço:** *a ser preenchido*
- **E-mail de contato:** contato@cronopet.app
- **Encarregado de Dados (DPO):** *a ser indicado pelo controlador*

Sempre que esta política mencionar "nós", "nosso" ou "CronoPet", está se referindo ao controlador acima.

---

## 2. Quais dados coletamos

Coletamos apenas os dados estritamente necessários para o app funcionar bem. Abaixo a lista completa.

### 2.1 Dados que você fornece

- **Informações sobre o seu pet:** nome, espécie (cachorro, gato, etc.), raça, data de nascimento, peso, foto e demais notas médicas que você opcionalmente cadastrar (vacinas, medicamentos, peso histórico, ocorrências veterinárias).
- **Registros de rotina:** logs diários de alimentação, água, passeios, banho, xixi, cocô e outras ações que você registrar manualmente.
- **Fotos:** quando você adiciona uma foto do pet, removemos automaticamente os metadados EXIF (incluindo localização GPS embutida) **antes** de salvar a imagem. Você pode escolher entre câmera ou galeria.
- **Conta (apenas Premium):** e-mail e senha. A senha é armazenada em hash seguro pelo nosso provedor de autenticação (Supabase) — nunca temos acesso à senha em texto puro.
- **Mensagens enviadas a nós:** quando você nos contata por e-mail ou pelo formulário de suporte.

### 2.2 Dados coletados automaticamente

- **Informações técnicas do dispositivo:** modelo, sistema operacional e versão, idioma do sistema, fuso horário, identificador anônimo de instalação.
- **Logs de erro (crash reports):** quando o app trava, enviamos automaticamente um relatório técnico ao Sentry para entendermos o problema. Esses relatórios **não contêm dados pessoais identificáveis** — apenas informações técnicas sobre o erro (linha de código, stack trace, modelo do dispositivo).
- **Métricas de uso anônimas:** estatísticas agregadas (ex.: quantos usuários abriram o app no dia) sem qualquer identificador pessoal.

### 2.3 Dados de localização (opcional)

- **Localização aproximada via GPS:** usada **exclusivamente** para mostrar a previsão do tempo na sua região, de modo a sugerir o melhor horário para passear com o pet.
- A localização **não é armazenada** nos nossos servidores nem é compartilhada com terceiros para fins de marketing.
- Você pode revogar a permissão de localização a qualquer momento nas configurações do seu dispositivo. O app continuará funcionando normalmente, apenas sem a função de clima.

### 2.4 Dados de pagamento

- **Não temos acesso aos dados do seu cartão de crédito ou meio de pagamento.**
- Todas as assinaturas Premium são processadas pela **Apple (App Store / StoreKit)** ou pelo **Google (Play Store / Google Play Billing)**, sob as políticas de privacidade dessas empresas.
- Recebemos apenas a confirmação de que a assinatura está ativa, junto a um identificador opaco da transação.

---

## 3. Por que coletamos esses dados (finalidades)

Em conformidade com o **Art. 7º da LGPD**, tratamos seus dados com base nas seguintes finalidades e bases legais:

| Finalidade | Base legal |
|---|---|
| Prestar a funcionalidade básica do app (registrar e exibir os dados do pet) | Execução de contrato com o usuário |
| Sincronizar dados entre dispositivos (Premium) | Execução de contrato |
| Personalizar o plano nutricional e sugestões com base nos dados do pet | Execução de contrato |
| Detectar e corrigir falhas técnicas (crash detection) | Legítimo interesse |
| Mostrar previsão do tempo localizada | Consentimento explícito do usuário |
| Enviar comunicações de marketing (novidades, dicas) | Consentimento — você pode recusar a qualquer momento |
| Cumprir obrigações legais e regulatórias | Cumprimento de obrigação legal |

Você pode revogar o consentimento para localização e marketing a qualquer momento nas configurações do app, sem prejuízo das demais funcionalidades.

---

## 4. Com quem compartilhamos seus dados

**Nós não vendemos seus dados pessoais a terceiros.** Nunca.

Compartilhamos dados apenas com os seguintes operadores, e somente o necessário para o serviço funcionar:

- **Supabase Inc.** — fornece a infraestrutura de banco de dados e autenticação para usuários Premium. Os dados são armazenados em servidores com criptografia em repouso e em trânsito. Política: https://supabase.com/privacy
- **Sentry (Functional Software, Inc.)** — recebe os relatórios de erro técnico para diagnóstico. Não envia dados pessoais identificáveis. Política: https://sentry.io/privacy/
- **OpenWeatherMap** — recebe apenas as **coordenadas aproximadas** (cidade, não o endereço exato) quando você usa a função de clima. Política: https://openweather.co.uk/privacy-policy
- **Apple Inc. e Google LLC** — processam pagamentos de assinaturas Premium pelas respectivas lojas de aplicativos. Não temos acesso a dados financeiros.

Em nenhuma hipótese seus dados são utilizados por esses parceiros para finalidades alheias à operação do CronoPet.

### Transferência internacional de dados

Alguns desses parceiros (Supabase, Sentry, OpenWeatherMap, Apple, Google) podem armazenar dados em servidores localizados fora do Brasil — incluindo Estados Unidos e União Europeia. Esses países adotam padrões de proteção compatíveis com a LGPD, e mantemos contratos com cláusulas contratuais padrão (Standard Contractual Clauses) com cada operador.

---

## 5. Por quanto tempo guardamos seus dados

| Tipo de dado | Tempo de retenção |
|---|---|
| Dados da conta (e-mail, perfil) | Enquanto a conta estiver ativa |
| Dados do pet e logs de rotina | Enquanto a conta estiver ativa, ou conforme o histórico contratado (30 dias no plano Free, ilimitado no Premium) |
| Após exclusão da conta | 30 dias para fins de backup, seguidos da exclusão definitiva |
| Crash logs (Sentry) | Até 90 dias |
| Comunicações de suporte | Até 2 anos após o último contato |
| Dados fiscais de assinatura | Conforme a legislação tributária (até 5 anos) |

Você pode solicitar a exclusão antecipada a qualquer momento — veja a próxima seção.

---

## 6. Seus direitos como titular dos dados

A LGPD (Art. 18) garante a você uma série de direitos sobre seus dados pessoais. Listamos abaixo, com o que cada um significa na prática:

- **Acesso:** saber quais dados temos sobre você.
- **Correção:** pedir que corrijamos dados incompletos, inexatos ou desatualizados.
- **Exclusão (direito ao esquecimento):** solicitar que apaguemos seus dados, salvo quando obrigados a guardá-los por lei.
- **Portabilidade:** receber seus dados em um formato aberto e estruturado (JSON), para usar em outro serviço.
- **Oposição:** se opor a tratamentos baseados em legítimo interesse.
- **Revogação de consentimento:** retirar a autorização para usos baseados em consentimento (ex.: localização, marketing).
- **Informação sobre compartilhamento:** saber com quais operadores compartilhamos seus dados.
- **Anonimização ou bloqueio:** solicitar que seus dados sejam anonimizados ou bloqueados, quando aplicável.

### Como exercer seus direitos

Envie um e-mail para **contato@cronopet.app** com o assunto "Direitos do Titular" e descreva o que deseja. Responderemos em até **15 dias** corridos, conforme exigido pela LGPD.

Se você for usuário Premium, também pode exportar seus dados diretamente em **Configurações → Conta → Exportar dados (JSON)** e excluir sua conta em **Configurações → Conta → Excluir conta**.

Caso entenda que algum direito não foi atendido, você pode reclamar à **Autoridade Nacional de Proteção de Dados (ANPD)**: https://www.gov.br/anpd/

---

## 7. Como protegemos seus dados (segurança)

Usamos práticas modernas de segurança da informação para manter seus dados seguros:

- **Criptografia em repouso:** dados armazenados localmente no dispositivo são protegidos via **AES-256**, com chaves geridas pelo **iOS Keychain** ou **Android Keystore**.
- **Criptografia em trânsito:** todas as comunicações com nossos servidores usam **HTTPS/TLS 1.3**.
- **Row Level Security (RLS):** no Supabase, cada usuário só tem acesso aos seus próprios registros. Esta política é auditada continuamente.
- **Acesso restrito:** apenas membros estritamente autorizados da equipe têm acesso aos sistemas, e todos assinam termo de confidencialidade.
- **Atualizações de segurança:** aplicamos patches críticos prontamente em todas as nossas dependências.
- **Notificação de incidente:** em caso de incidente de segurança que exponha dados pessoais, notificaremos a ANPD e os titulares afetados em até **72 horas**, conforme o Art. 48 da LGPD.

Apesar de todos os cuidados, nenhum sistema de segurança é absoluto. Se você suspeitar de uso indevido, entre em contato imediatamente.

---

## 8. Crianças e adolescentes

O CronoPet **não é direcionado a menores de 13 anos**. Não coletamos intencionalmente dados de crianças. Caso você seja pai, mãe ou responsável e identifique que uma criança forneceu dados ao app, entre em contato pelo e-mail acima e excluiremos os dados imediatamente.

Adolescentes entre 13 e 18 anos só podem usar o app com consentimento dos responsáveis.

---

## 9. Cookies, tracking e publicidade

- **Não usamos cookies de marketing nem tracking de comportamento entre apps.**
- Não vendemos nem compartilhamos dados para anunciantes.
- Não usamos SDKs de redes sociais (Facebook, TikTok etc.) para rastreamento.
- O Sentry (crash reports) pode ser desativado em **Configurações → Privacidade → Diagnósticos**. Ao desativar, o app não enviará mais relatórios técnicos quando ocorrer um erro.

Em conformidade com o **App Tracking Transparency (ATT)** da Apple, o CronoPet **não solicita permissão de tracking** porque simplesmente não rastreamos.

---

## 10. Mudanças nesta política

Podemos atualizar esta Política de Privacidade conforme o app evolui ou para refletir mudanças regulatórias.

Sempre que houver mudanças relevantes:

- Notificaremos você por **dentro do app** (banner ou tela de onboarding atualizada);
- Enviaremos um e-mail (se você for usuário Premium e tiver e-mail cadastrado);
- A nova versão estará sempre disponível em https://cronopet.app/privacidade.

A data da última atualização aparece no topo deste documento.

---

## 11. Contato

Para qualquer dúvida, solicitação relacionada aos seus dados ou exercício de direitos:

- **E-mail:** contato@cronopet.app
- **Endereço postal:** *a ser indicado*
- **Encarregado de Dados (DPO):** *a ser indicado*

Sempre respondemos em até 15 dias corridos.

---

## TODO para o titular (não publicar esta seção)

Antes de publicar este documento na App Store, Play Store e site, o titular precisa preencher:

- [ ] **Razão social e CNPJ** da empresa/MEI (Seção 1)
- [ ] **Endereço completo** da sede ou caixa postal (Seções 1 e 11)
- [ ] **Nome e contato do Encarregado de Dados (DPO)** — pode ser o próprio fundador inicialmente (Seções 1 e 11)
- [ ] Confirmar que o domínio **cronopet.app** está registrado e o e-mail **contato@cronopet.app** está funcional
- [ ] Publicar a versão final em **https://cronopet.app/privacidade** (URL referenciada na App Store)
- [ ] Verificar se as políticas dos parceiros (Supabase, Sentry, OpenWeather) ainda estão nas URLs citadas — atualizar se mudarem
- [ ] Validar com advogado especializado em LGPD antes da publicação oficial
- [ ] Adicionar link da política no fluxo de onboarding e em Configurações → Privacidade
- [ ] Implementar fluxo de **exportação JSON** e **exclusão de conta** mencionados na Seção 6
- [ ] Implementar toggle de **opt-out do Sentry** mencionado na Seção 9
