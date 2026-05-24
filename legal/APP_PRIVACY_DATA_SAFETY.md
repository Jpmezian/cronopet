# App Privacy (Apple) + Data Safety (Google) — CronoPet

> Planilha pronta pra copiar/colar nos painéis do App Store Connect e Google Play Console. Baseada no parecer jurídico e no inventário real de dados que o CronoPet coleta.

---

## Parte 1: APPLE — App Store Connect (App Privacy / Nutrition Labels)

**Onde preencher:** App Store Connect → App CronoPet → App Privacy → "Get Started".

Apple pergunta sobre cada categoria: **Collected? Linked to user? Used for tracking?** Para CronoPet, marcar conforme abaixo:

### Categoria 1: Contact Info → Email Address
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Sim (linked)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality
  - ✅ Customer Support

> Coletamos email apenas se o user ativa plano Pro ou família compartilhada.

### Categoria 2: Contact Info → Name
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Sim
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

### Categoria 3: User Content → Photos or Videos
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Sim (apenas quando há backup nuvem; default é local-only)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

### Categoria 4: User Content → Other User Content
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Sim
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

> Notas livres do tutor, observações em registros.

### Categoria 5: Identifiers → User ID
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Sim
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality
  - ✅ Analytics (apenas se PostHog ativado)

> UUID interno gerado pelo Supabase Auth.

### Categoria 6: Identifiers → Device ID
- ✅ **Collected:** Sim (apenas via Sentry e PostHog opt-in)
- ❌ **Linked to user:** Não (anônimo)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ Analytics
  - ✅ App Functionality (crash recovery via Sentry)

### Categoria 7: Usage Data → Product Interaction
- ✅ **Collected:** Sim (apenas via PostHog opt-in)
- ❌ **Linked to user:** Não
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ Analytics

### Categoria 8: Diagnostics → Crash Data
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Não (PII scrubbing client-side: `sendDefaultPii: false` + `beforeSend` redact email/auth headers)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality (estabilidade do app)

> **Nota Sentry server-side IP:** mesmo com `sendDefaultPii: false`, o
> Sentry SDK anexa IP do request server-side no event antes de processar.
> O cliente NÃO envia IP intencionalmente — vem do edge da Sentry Cloud.
> Conta como "Crash Data" da Apple/Google (escopo de Diagnostics), não
> como "Contact Info → IP Address". Declaração permanece Diagnostics.

### Categoria 9: Diagnostics → Performance Data
- ✅ **Collected:** Sim
- ❌ **Linked to user:** Não (mesmo PII scrub do crash data)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

### Categoria 10: Purchases → Purchase History
- ✅ **Collected:** Sim (via RevenueCat)
- ❌ **Linked to user:** Sim
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

### Categoria 11: Location → Coarse Location
- ✅ **Collected:** Sim (apenas em tempo de uso, NÃO persistida)
- ❌ **Linked to user:** Não (anônima, só pra clima)
- ❌ **Used for tracking:** Não
- **Purposes:**
  - ✅ App Functionality

### NÃO marcar:
- ❌ Health & Fitness (Apple = humano, não pet)
- ❌ Financial Info (pagamento direto via Apple/Google)
- ❌ Browsing History
- ❌ Search History
- ❌ Sensitive Info
- ❌ Contacts
- ❌ Other Data Types não listados

### Tracking (questionnaire ATT)
- **Does this app collect data used to track users?** ❌ NO
- App Tracking Transparency (ATT) prompt: **não exibido** (não usamos)

### Privacy Policy URL
- **URL:** `https://cronopet.com.br/privacidade`

---

## Parte 2: GOOGLE — Play Console (Data Safety form)

**Onde preencher:** Play Console → App CronoPet → App content → Data safety.

### Section 1: Data collection and security

#### 1.1 Encryption in transit
- ✅ **Sim:** "All data is encrypted in transit"

#### 1.2 Data deletion request
- ✅ **Sim:** "Users can request that their data is deleted"
- **URL:** `https://cronopet.com.br/excluir-conta`

#### 1.3 Complies with Play Families Policy
- ❌ **Não:** "This app does not comply with Play Families Policy"
> CronoPet é direcionado a adultos. Sem cadastro de menores.

#### 1.4 Independently security reviewed
- ❌ **Não:** "App has not been independently reviewed against a global security standard"

### Section 2: Data types

Para cada categoria abaixo, marcar **Collected** / **Shared**:

#### Personal info → Name
- ✅ Collected · ❌ Not shared
- **Optional or required:** Optional
- **Purpose:** App functionality

#### Personal info → Email address
- ✅ Collected · ❌ Not shared
- **Optional or required:** Optional (só Pro/família)
- **Purpose:** App functionality, Communications

#### Personal info → User IDs
- ✅ Collected · ❌ Not shared
- **Optional or required:** Required (auth interno)
- **Purpose:** App functionality

#### Photos and videos → Photos
- ✅ Collected · ❌ Not shared
- **Optional or required:** Optional (user decide adicionar)
- **Purpose:** App functionality
- **Processed ephemerally:** ❌ No (armazenado local; em nuvem se Pro)

#### App activity → App interactions
- ✅ Collected · ✅ Shared with PostHog
- **Optional or required:** Optional (opt-in)
- **Purpose:** Analytics

#### App info and performance → Crash logs
- ✅ Collected · ✅ Shared with Sentry
- **Optional or required:** Required
- **Purpose:** App functionality, Diagnostics
- **Processed ephemerally:** ❌ No

#### App info and performance → Diagnostics
- ✅ Collected · ✅ Shared with Sentry
- **Optional or required:** Required
- **Purpose:** Diagnostics

#### Location → Approximate location
- ✅ Collected · ❌ Not shared
- **Optional or required:** Optional
- **Purpose:** App functionality (clima local)
- **Processed ephemerally:** ✅ Yes (não persistida)

#### Financial info → Purchase history
- ✅ Collected · ✅ Shared with RevenueCat
- **Optional or required:** Required (pra Pro)
- **Purpose:** App functionality

### NÃO marcar:
- ❌ Financial info → Credit card info (não temos acesso)
- ❌ Personal info → Address, phone number, race, political/religious
- ❌ Health and fitness
- ❌ Messages (não enviamos/recebemos)
- ❌ Contacts
- ❌ Browsing history, search history
- ❌ Calendar, files, audio, web history
- ❌ Device or other IDs (Sentry/PostHog tratam anonimamente)

### Section 3: Privacy Policy
- **URL:** `https://cronopet.com.br/privacidade`

### Section 4: Account creation
- ✅ **Required:** Optional (pra Pro/família apenas)

---

## Parte 3: Checklist final pra você

Após preencher os 2 painéis:

### Apple App Store Connect
- [ ] App Privacy preenchido com categorias acima
- [ ] Tracking question respondida (NO)
- [ ] Privacy Policy URL: cronopet.com.br/privacidade
- [ ] Submetido pra review (Publish)

### Google Play Console
- [ ] Data Safety form preenchido
- [ ] Account Deletion URL: cronopet.com.br/excluir-conta
- [ ] Privacy Policy URL: cronopet.com.br/privacidade
- [ ] Form salvo e enviado pra review

### Antes de submeter o app pro review:
- [ ] cronopet.com.br/privacidade publicado e acessível
- [ ] cronopet.com.br/termos publicado e acessível
- [ ] cronopet.com.br/excluir-conta publicado e acessível
- [ ] privacidade@cronopet.com.br criado e funcionando
- [ ] contato@cronopet.com.br criado e funcionando

---

**Em caso de mudança nos dados coletados** (ex.: adicionar nova integração third-party), atualizar:
1. Política de Privacidade (seção 5)
2. App Privacy (Apple)
3. Data Safety (Google)
4. Este documento

Dúvida em alguma categoria? Apple e Google têm tooltips detalhados em cada item dos painéis.
