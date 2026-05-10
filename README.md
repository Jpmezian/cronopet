# CronoPet 🐾

> App mobile (iOS + Android) que vira **ponte entre o tutor e o veterinário**.
> Tutor registra a rotina do pet em um toque, o app detecta padrões de saúde
> e gera relatório PDF pronto pra consulta.

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-RLS_enabled-3FCF8E?logo=supabase)](https://supabase.com/)

---

## Por que existe

A maioria dos apps de pet são planilha disfarçada — você anota e fica por isso mesmo. O CronoPet faz diferente: cruza os registros do dia a dia com regras clínicas pra **avisar quando algo merece atenção** e gera um **relatório organizado** pra você levar no veterinário sem ter que lembrar de nada de cabeça.

## O que ele faz

- **Registro em 1 toque** — comida, água, passeio, peso, xixi, cocô, banho
- **Detecção heurística de padrões** — variação de peso, queda de apetite, possível diarreia, hidratação baixa, sintomas recorrentes
- **Relatório PDF pronto pra consulta** — histórico, gráficos, vacinas, peso
- **Família compartilhada em tempo real** — vários tutores no mesmo pet, sem perguntar "ele já comeu?"
- **Plano nutricional personalizado** — calorias adaptadas por raça, idade, peso, castração e nível de atividade
- **Bloqueio biométrico opcional** — Face ID / Touch ID
- **Funciona offline** — registrar não depende de internet; sync acontece em background

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native 0.81 + Expo SDK 54 + TypeScript |
| State | Zustand + MMKV (criptografia AES-256, chave no Keychain) |
| Backend | Supabase (Postgres + Auth + Realtime) com Row Level Security em todas as tabelas |
| Observabilidade | Sentry (PII-free, breadcrumbs com metadados) |
| Build / CI | EAS Build com profiles dev / preview / production |
| E2E | Maestro |
| Estilo | NativeWind (Tailwind RN) + design system próprio |

## Decisões técnicas que valem destacar

**Local-first**
O app funciona 100% sem internet. MMKV criptografado guarda tudo localmente; sync para o Supabase é fire-and-forget e nunca bloqueia o usuário.

**Privacidade levada a sério**
- AES-256 com chave guardada no iOS Keychain / Android Keystore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`)
- EXIF stripping universal em todas as fotos (sem GPS vazando)
- Sentry breadcrumbs só com metadados estruturais — nunca valores sensíveis
- Privacy Policy e ToS LGPD-compliant escritos do zero

**Segurança server-side**
- Row Level Security em 100% das tabelas (multi-tenant via `family_group_id`)
- Auth com rate-limit client-side (5 tentativas / 60s, lockout 5min)
- Invite codes cryptographically random via `expo-crypto`
- Subscriptions e audit_log: write apenas via Edge Function com `service_role`

**Detecção heurística de padrões clínicos**
9 detectores rodando local sem dependência de IA — variação de peso, tendência sustentada, queda de apetite, hidratação, diarreia, constipação, aparência alterada, eventos recorrentes. Toda mensagem fecha com "consulte o veterinário" — nunca diagnostica.

**Wrappers agnósticos para integrações externas**
Analytics (PostHog), Purchases (RevenueCat) e AI Insights (Claude/GPT/Gemini) implementados como wrappers desacoplados — fácil trocar de provider sem refatorar call-sites espalhados.

**Acessibilidade**
- Paleta WCAG 2.2 AA auditada (≥ 4.5:1 em todos os tokens)
- Reduced Motion fallback em todas as animações
- Labels e roles em todos os elementos interativos

## Estrutura

```
app/                  # Rotas (Expo Router) — 16 telas
  (tabs)/             # Home, Histórico, Médico
  (dev)/              # Sandbox interno (Storybook nativo)
components/           # 28 componentes reutilizáveis
  home/               # Cards do dashboard
  medical/            # Vacinas, consultas, peso
  security/           # BiometricLock
  ui/                 # ScalePress, Skeleton, Toast
services/             # 9 serviços (Auth, Sync, Analytics, Purchases, etc.)
store/                # Zustand + MMKV criptografado
data/                 # Calorias, raças, alimentos
hooks/                # useThemeColors, useMotion, useWeather
lib/                  # Security helpers (sanitize, rate limit, crypto)
supabase/migrations/  # SQL de schema + RLS policies
.maestro/             # Testes E2E
docs/                 # Setup de suporte, checklist de lançamento
legal/                # Privacy Policy + Terms (pt-BR, LGPD)
web/                  # Landing page estática
```

## Como rodar

Pré-requisitos: Node 20+, Xcode (iOS) ou Android Studio, conta Expo.

```bash
# Instalar dependências
npm install

# Copiar template de ambiente e preencher com suas chaves
cp .env.dev.example .env.dev

# Rodar no iOS
npm run ios:dev

# Rodar no Android
npm run android:dev

# Rodar typecheck
npm run typecheck

# Rodar testes E2E (precisa do Maestro CLI)
npm run test:e2e
```

## Status

Pré-lançamento. RLS em produção, segurança auditada (14 vulnerabilidades fechadas), TypeScript zerado, suite E2E pronta. Próximos passos: TestFlight, App Store, Google Play.

## Ainda em construção

- Edge Function pra IA de análise de sintomas (wrapper já pronto, falta endpoint)
- Integração StoreKit/Google Billing via RevenueCat (wrapper pronto, falta criar produtos nas lojas)
- Landing page (HTML pronto, falta deploy)

## Sobre

Construído por [@jpmezian](https://github.com/jpmezian) — produto, design, código, infra e parte legal feitos do zero.

Tem interesse em discutir o projeto, oportunidades em mobile, ou só quer mandar uma foto do seu pet? Manda DM.

## Licença

[MIT](LICENSE)
