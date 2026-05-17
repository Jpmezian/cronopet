# Maestro E2E Tests — CronoPet

Testes end-to-end mínimos cobrindo os caminhos críticos do app.

## Setup

```bash
# Instalar Maestro (uma vez)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"

# Verificar instalação
maestro --version
```

## Rodar todos os testes

```bash
# iOS Simulator (precisa ter um simulator booted)
npm run test:e2e

# ou diretamente
maestro test .maestro/

# Rodar um teste específico
maestro test .maestro/01_onboarding.yaml
```

## Pré-requisitos pra rodar

- App buildado e instalado no simulador (rode `npm run ios:dev` antes)
- Bundle ID em `.maestro/config.yaml` deve bater com o do `app.config.js`
  (variant `development` usa `com.cronopet.app.dev`)

## Suite atual

| # | Arquivo | O que cobre | Status |
|---|---|---|---|
| 01 | `01_onboarding.yaml` | Criação de pet do zero | ✅ |
| 02 | `02_log_action.yaml` | Registrar comida + água, streak | ✅ |
| 03 | `03_navigation_tabs.yaml` | Tab bar Home/Histórico/Saúde | ✅ |
| 04 | `04_paywall.yaml` | Abrir paywall, voltar sem comprar | ✅ |
| 05 | `05_settings_lock.yaml` | Bloqueio biométrico | ✅ |
| 06 | `06_premium_purchase.yaml` | Stub DEV de compra → badge Premium | 🆕 |
| 07 | `07_pdf_export.yaml` | Médico → Exportar PDF → share sheet | 🆕 |
| 08 | `08_account_deletion.yaml` | Apagar conta com dialog (sem confirmar) | 🆕 |
| 09 | `09_multi_pet_switch.yaml` | 2º pet + switch sem vazar dados | 🆕 |
| 10 | `10_insight_dismiss.yaml` | Dismiss persiste após restart (regressão) | 🆕 |

Flows 🆕 estão escritos com selectors flexíveis (regex) mas precisam de
1ª passada num simulator iOS dev pra confirmar que os matchers batem
nos textos reais. Rodar individualmente:

```bash
maestro test .maestro/06_premium_purchase.yaml
```

Selectors que falharem ajustam-se editando o YAML — não precisa mexer
no app.

## Quando criar mais testes

- Cada bug que voltou (regression test)
- Cada fluxo que vira step de monetização (premium upgrade, family invite)
- Antes de cada release importante: rodar a suite inteira no CI ou local

## Limitações conhecidas

- Maestro não consegue intercept biometric prompt — testes de Face ID precisam do
  simulador configurado com "Enrolled = Yes" e usar atalho ⌘ + Shift + M.
- Compras (StoreKit) requerem Sandbox account em DEV — testes 04 só testam UI, não compra real.
