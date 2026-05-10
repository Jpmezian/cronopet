# 🔒 CronoPet — Security Model

Documento central sobre as proteções de segurança do app, como manter as chaves seguras e o que fazer em caso de incidente.

---

## Modelo de Ameaças

O CronoPet armazena dados sensíveis (saúde do pet, medicações, fotos, sessão de auth). Os adversários considerados:

| Nível | Cenário | Mitigação |
|---|---|---|
| Roubo/perda do dispositivo | Desbloqueado | Biometric lock opcional |
| Roubo/perda do dispositivo | Bloqueado | MMKV encryption + Keychain |
| Backup iCloud comprometido | Dados no backup | Encryption key no Keychain `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (não sai do device) |
| Rede Wi-Fi pública MITM | Intercepção Supabase | HTTPS only + JWT token em memória cifrada |
| Brute-force de senha | Auth | Rate limit client-side (5/min, 5min lockout) + Supabase backend rate limit |
| Sessão roubada | Acesso remoto | Token rotation do Supabase + Face ID adicional opcional |
| Injeção XSS no PDF | Pet name malicioso | `escapeHtml()` aplicado em todos os fields (21 pontos) |

---

## Proteções implementadas (código)

### 1. Criptografia local (MMKV)

**Storage de dados** e **session de auth** são criptografados com AES-256.

- Chave AES gerada por `expo-crypto` (RNG do OS) na primeira execução
- Armazenada no **iOS Keychain** / **Android Keystore** via `expo-secure-store`
- Policy: `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (chave não sai do device, não vai pro iCloud)
- Se a chave for apagada, todos os dados locais ficam ilegíveis (efeito de "delete all")

**Arquivos:**
- `store/storage.ts` — MMKV principal (dados do pet)
- `services/supabase.ts` — MMKV separado para JWT / refresh token

### 2. Input sanitization

`lib/security.ts` expõe:
- `escapeHtml()` — prevenção de XSS em templates HTML (PDF)
- `sanitizeName()` — remove controle chars, espaços extras, trunca a max
- `sanitizeNote()` — mantém \n mas limita a 500 chars
- `checkPasswordStrength()` — score 0-4, bloqueia senhas fracas
- `isValidEmail()` — RFC 5322 simplificado

Aplicados em: `completeOnboarding`, `updatePetProfile`, `addActionLog`, PDF generation (21 fields wrapped).

### 3. Rate limiting (auth)

Client-side: 5 tentativas/60s → lockout de 5 minutos (por par `action:email`).

Protege contra:
- Teclado repetindo Enter (bug de input)
- Scripts locais que disparam submits em loop
- Ataques de brute-force local

Backend: Supabase tem rate limit próprio por IP (adicional).

### 4. Biometric lock (opt-in)

Face ID / Touch ID via `expo-local-authentication`. Settings → Privacidade → "Bloqueio biométrico".

Comportamento:
- Ao abrir o app: pede autenticação se habilitado
- Ao voltar do background: re-locka
- Fallback para código do aparelho se biometria falha
- Se device não tem biometria configurada, feature é graciosamente degradada (não bloqueia)

### 5. Fotos (EXIF stripping universal)

`persistAndStripPhoto()` em `store/usePetStore.ts`:
- SEMPRE reencodadas via `expo-image-manipulator` (remove EXIF incluindo GPS)
- Copiadas para `Paths.document` (escopo do app, não backup iCloud sem opt-in)
- Inclusive URLs remotas são processadas (Unsplash default pode ter metadata)

### 6. Sentry — PII-free

Breadcrumbs só logam **metadados estruturais**, nunca valores sensíveis:
- ✅ `{ hasQuantity: true, dayCompleted: false }`
- ❌ ~~`{ quantity: 150, consistency: 'soft' }`~~ (removido)

Sentry desabilitado em dev (`enabled: !__DEV__`). Em prod, `tracesSampleRate: 0.2`.

### 7. Invite codes cryptographically random

`generateSecureInviteCode()` usa `expo-crypto.getRandomBytes()`:
- 8 chars (alfabeto sem 0/O/1/I pra evitar confusão)
- ~40 bits de entropia — impraticável brute-forçar
- Substitui o hash determinístico antigo (vulnerável a enumeration)

### 8. Account deletion (LGPD/GDPR)

Settings → "Apagar todos os dados" executa:
1. `signOut()` — invalida session no Supabase
2. `resetStore()` — zera MMKV local (dados do pet)
3. `clearSupabaseAuthStorage()` — limpa JWT / refresh token
4. `SecureStore.deleteItemAsync(encryption-key)` — apaga chave de cripto
5. `router.replace('/onboarding')` — fluxo do zero

Efeito: device fica em estado inicial, sem resíduo de dados do usuário anterior.

### 9. Sync timeouts

Operações de rede (Supabase) com timeout de 10s:
- `pushActionLog` — alerta Sentry se timeout
- Previne UI hanging em rede ruim

### 10. Dev Sandbox gated

`app/(dev)/sandbox.tsx` checa `__DEV__` — em prod, redireciona pra home. Impede exposição de "Simular Premium" para usuários finais.

---

## Proteções que dependem de TI (você precisa configurar)

### A. ROTAÇÃO DE CHAVES — AÇÃO IMEDIATA

O `.env` do repo contém chaves ativas. Rotacione TODAS antes do lançamento público:

1. **Supabase**
   - Dashboard → Settings → API → Reset Service Role Key
   - Dashboard → Settings → API → Reset Anon Key (e rebuild app)
   - ⚠️ Service role key **foi removida** do .env (2026-04-21) — verifique git history pra confirmar que nunca foi commitada

2. **OpenWeatherMap**
   - [openweathermap.org](https://openweathermap.org) → My API keys → Regenerate
   - Atualize `EXPO_PUBLIC_OWM_KEY` no .env local + em EAS Secrets para production build

3. **Sentry**
   - DSN é público por design (safe no bundle)
   - `SENTRY_AUTH_TOKEN` — sentry.io → Settings → Auth Tokens → revoke old / create new

### B. SUPABASE RLS (Row Level Security)

Precisa configurar no Supabase Dashboard:

```sql
-- action_logs: só próprio grupo pode ler/escrever
create policy "group_read" on action_logs
  for select using (
    group_id in (
      select family_group_id from profiles where id = auth.uid()
    )
  );

create policy "group_insert" on action_logs
  for insert with check (
    user_id = auth.uid() AND
    group_id in (
      select family_group_id from profiles where id = auth.uid()
    )
  );
```

Repita para `vaccines`, `appointments`, `weight_entries`, `pets`, `family_members`.

### C. App Store Connect — Privacy

Ao submeter, declare no "App Privacy":
- **Health & Fitness** (peso, alimentação) — "Collected, Not linked to identity"
- **Photos** — "Collected, Linked to identity" (porque user-uploaded)
- **User ID** — "Collected, Linked to identity" (Supabase user_id)
- **Contact Info** (email) — "Collected, Linked to identity"

Todos "Not used for tracking".

### D. StoreKit / RevenueCat

Premium NUNCA deve ser validado só client-side. Ao integrar:
- `isPremium` no store é **espelho** do receipt válido do StoreKit
- Backend deve verificar receipt (server-side) antes de permitir operações premium (ex: criar grupo familiar)

---

## Auditoria de vulnerabilidades (2026-04-21)

| Severidade | Achado | Status |
|---|---|---|
| CRITICAL | Service role key no .env | ✅ Removida |
| CRITICAL | MMKV sem encryption | ✅ Encryption via Keychain |
| HIGH | XSS no PDF generator | ✅ escapeHtml em 21 fields |
| HIGH | Senha fraca aceita (6 chars) | ✅ min 8 chars + complexity |
| HIGH | Empty catch blocks | ✅ Sentry.captureException |
| HIGH | Invite codes determinísticos | ✅ crypto-random 8 chars |
| HIGH | Sentry breadcrumbs com PII | ✅ só metadados estruturais |
| HIGH | EXIF não removido em URLs remotas | ✅ universal strip |
| HIGH | Sem rate limit auth | ✅ 5/min + 5min lockout |
| HIGH | Sem input validation | ✅ sanitizeName/Note + limits |
| MEDIUM | Account deletion incompleta | ✅ auth + MMKV + keychain + onboarding |
| MEDIUM | Sync sem timeout | ✅ 10s + Sentry alert |
| LOW | Sandbox acessível em prod | ✅ __DEV__ guard |
| BONUS | Sem 2FA local | ✅ Biometric lock opt-in |

---

## Incident Response

### Suspeita de comprometimento de chave API

1. Rotacione a chave imediatamente no dashboard do provedor
2. Atualize o `.env` local + EAS Secrets
3. Force rebuild do app (`eas build --platform ios --profile production --clear-cache`)
4. Publique update via TestFlight / App Store
5. Notifique usuários SE envolveu Supabase anon key (dados podem ter sido acessados)

### Usuário reporta "perdi acesso à conta"

1. Não temos recovery de senha implementado ainda — TODO backend
2. Mitigação temporária: suporte manual via Supabase Dashboard (Auth → Users → magic link)

### Usuário reporta "meu pet sumiu"

1. Provavelmente MMKV foi apagado (reset manual ou reinstall)
2. Se era Premium com sync ativo: dados estão no Supabase, basta login
3. Se era Free: dados eram só locais — perdidos. (Por isso Premium é importante!)

### Device perdido / roubado

- Se biometric lock estava ativo: dados protegidos
- Se não estava: dados no MMKV criptografado são ilegíveis sem a chave do Keychain (que só existe no device)
- Se o ladrão tinha acesso desbloqueado ao device: dados visíveis. Recomendar: Settings → Apagar tudo via Remote (feature futura)

---

## Contato

- Questões de segurança: `security@cronopet.app` (TODO: criar)
- Bug bounty: nenhum programa ativo (ainda)
- Responsible disclosure: envie email, prometemos fix em até 7 dias para issues críticos
