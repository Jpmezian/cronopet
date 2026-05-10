# CronoPet — Diagramas do Projeto

---

## 1. MER — Modelo Entidade-Relacionamento (Conceitual)

> Visão de alto nível: entidades do domínio e suas relações, sem se preocupar com tipos ou chaves.

```mermaid
erDiagram
    USUARIO {
        id          "identificador único"
        email       "e-mail de autenticação"
        nome        "nome de exibição"
    }

    GRUPO_FAMILIAR {
        id          "identificador único"
        nome        "nome do grupo"
        invite_code "código de convite (8 chars)"
    }

    PET {
        nome        "nome do animal"
        tipo        "cachorro / gato / outro"
        raca        "raça (opcional)"
        foto        "URI da foto"
        nascimento  "data de nascimento"
    }

    REGISTRO_ACAO {
        id        "identificador único"
        chave     "comida/agua/passeio/xixi/coco/banho"
        timestamp "momento do registro"
        nota      "observação livre"
    }

    EVENTO_MEDICO {
        id        "identificador único"
        tipo      "vomito/febre/mancando/..."
        timestamp "momento do evento"
        nota      "observação livre"
    }

    VACINA {
        id          "identificador único"
        nome        "nome da vacina"
        data        "data de aplicação"
        proxima     "data da próxima dose"
        veterinario "nome do veterinário"
        lote        "número do lote"
    }

    CONSULTA {
        id          "identificador único"
        titulo      "título da consulta"
        data        "data"
        hora        "horário"
        veterinario "nome do veterinário"
    }

    HISTORICO_PESO {
        id   "identificador único"
        peso "peso em kg"
        data "data da pesagem"
    }

    USUARIO            ||--||    USUARIO           : "tem perfil próprio"
    USUARIO            }o--o{    GRUPO_FAMILIAR     : "é membro de"
    GRUPO_FAMILIAR     ||--o{    USUARIO            : "tem membros"
    GRUPO_FAMILIAR     ||--||    PET                : "possui exatamente 1 pet"
    GRUPO_FAMILIAR     ||--o{    REGISTRO_ACAO      : "agrupa registros de"
    GRUPO_FAMILIAR     ||--o{    EVENTO_MEDICO      : "agrupa eventos de"
    GRUPO_FAMILIAR     ||--o{    VACINA             : "armazena vacinas de"
    GRUPO_FAMILIAR     ||--o{    CONSULTA           : "agenda consultas de"
    GRUPO_FAMILIAR     ||--o{    HISTORICO_PESO     : "registra peso de"
    USUARIO            ||--o{    REGISTRO_ACAO      : "autor de"
    USUARIO            ||--o{    EVENTO_MEDICO      : "autor de"
```

---

## 2. DER — Diagrama Entidade-Relacionamento (Físico/Lógico)

> Mapeamento 1:1 com o schema Supabase: todas as colunas, tipos, PKs e FKs.

```mermaid
erDiagram

    AUTH_USERS {
        uuid        id          PK
        text        email
        timestamptz created_at
    }

    PROFILES {
        uuid        id          PK  "FK → auth.users.id"
        text        email       "NOT NULL"
        text        nome
        timestamptz created_at
    }

    FAMILY_GROUPS {
        uuid        id          PK  "gen_random_uuid()"
        text        nome        "NOT NULL"
        text        invite_code "UNIQUE, auto-gerado (trigger)"
        uuid        owner_id    FK  "→ profiles.id"
        timestamptz created_at
    }

    FAMILY_MEMBERS {
        uuid        group_id    PK,FK "→ family_groups.id"
        uuid        user_id     PK,FK "→ profiles.id"
        text        role        "owner | member"
        timestamptz joined_at
    }

    PETS {
        uuid        group_id    PK,FK "→ family_groups.id  (1 pet por grupo)"
        text        nome        "NOT NULL"
        text        tipo        "cachorro | gato | outro"
        text        raca
        text        foto_url
        date        nascimento
        timestamptz updated_at
    }

    ACTION_LOGS {
        text        id          PK  "timestamp-random"
        uuid        group_id    FK  "→ family_groups.id"
        uuid        user_id     FK  "→ profiles.id"
        text        key         "NOT NULL  (comida/agua/...)"
        bigint      timestamp   "NOT NULL  (epoch ms)"
        text        note
        timestamptz synced_at
    }

    MEDICAL_EVENTS {
        text        id          PK
        uuid        group_id    FK  "→ family_groups.id"
        uuid        user_id     FK  "→ profiles.id"
        text        type        "NOT NULL"
        bigint      timestamp   "NOT NULL"
        text        note
        timestamptz synced_at
    }

    VACCINES {
        text        id          PK
        uuid        group_id    FK  "→ family_groups.id"
        text        nome        "NOT NULL"
        date        data        "NOT NULL"
        date        proxima
        text        veterinario
        text        lote
        text        nota
        timestamptz synced_at
    }

    APPOINTMENTS {
        text        id          PK
        uuid        group_id    FK  "→ family_groups.id"
        text        titulo      "NOT NULL"
        date        data        "NOT NULL"
        time        hora
        text        veterinario
        text        nota
        timestamptz synced_at
    }

    WEIGHT_ENTRIES {
        text        id          PK
        uuid        group_id    FK  "→ family_groups.id"
        numeric     peso        "NOT NULL  (5,2)"
        date        data        "NOT NULL"
        text        nota
        timestamptz synced_at
    }

    AUTH_USERS         ||--||    PROFILES        : "id (cascade delete)"
    PROFILES           ||--o{    FAMILY_GROUPS   : "owner_id"
    PROFILES           }o--o{    FAMILY_MEMBERS  : "user_id"
    FAMILY_GROUPS      ||--o{    FAMILY_MEMBERS  : "group_id"
    FAMILY_GROUPS      ||--||    PETS            : "group_id (1-to-1)"
    FAMILY_GROUPS      ||--o{    ACTION_LOGS     : "group_id"
    FAMILY_GROUPS      ||--o{    MEDICAL_EVENTS  : "group_id"
    FAMILY_GROUPS      ||--o{    VACCINES        : "group_id"
    FAMILY_GROUPS      ||--o{    APPOINTMENTS    : "group_id"
    FAMILY_GROUPS      ||--o{    WEIGHT_ENTRIES  : "group_id"
    PROFILES           ||--o{    ACTION_LOGS     : "user_id"
    PROFILES           ||--o{    MEDICAL_EVENTS  : "user_id"
```

---

## 3. Fluxograma — Navegação e Fluxo de Dados

### 3a. Inicialização e Roteamento

```mermaid
flowchart TD
    A([App Inicia]) --> B{Fontes carregadas?\nMMKV hidratado?}
    B -->|Não| B
    B -->|Sim| C{hasOnboarded?}
    C -->|Não| D[/Onboarding/]
    C -->|Sim| E[/Tabs — Home/]

    D --> D1[Step 1: foto do pet\nnome, tipo, raça]
    D1 --> D2[Step 2: nascimento\ndata de aniversário]
    D2 --> D3[completeOnboarding\npersist MMKV]
    D3 --> E

    style A fill:#1c1917,color:#fff
    style E fill:#16a34a,color:#fff
    style D fill:#2563eb,color:#fff
```

### 3b. Fluxo Principal — Tabs

```mermaid
flowchart TD
    TABS([Tabs]) --> HOME & HIST & MED

    HOME[🏠 Home\nindex.tsx] --> H1{isDayComplete?}
    H1 -->|Sim| H2[🎉 Celebration Card\nStreak +1]
    H1 -->|Não| H3{streakAtRisk?\nhora ≥ 18h}
    H3 -->|Sim| H4[⚠️ Banner Streak em risco]
    H3 -->|Não| H5[Botões de ação diária]
    H5 --> H6[addActionLog\npersistAndStripPhoto\nMMKV]
    H6 --> H7{isDayComplete\nnovamente?}
    H7 -->|Sim| H8[cancelAllReminders]
    H7 -->|Não| H9[scheduleDailyReminder\nscheduleStreakAtRiskReminder]

    HOME --> SETTINGS[⚙️ Settings Modal]
    SETTINGS --> S1[Ajustar hora notificação]
    SETTINGS --> S2[Ver streak / shields]
    SETTINGS --> S3[Apagar todos os dados\nresetStore → Onboarding]

    HOME --> PREMIUM[⭐ Premium Modal]

    HIST[📋 Histórico\nhistory.tsx] --> HT1[Lista ActionLogs\nagrupados por dia]
    HT1 --> HT2[generateVetReport\nPDF com todos os dados]

    MED[🩺 Médico\nmedical.tsx] --> ME[Eventos Médicos] & VA[Vacinas] & CO[Consultas] & PE[Peso]
    ME --> ME1[addMedicalEvent\nMMKV]
    VA --> VA1[addVaccine / updateVaccine\nMMKV]
    CO --> CO1[addAppointment\nscheduleAppointmentReminder\nMMKV]
    PE --> PE1[addWeightEntry\nMMKV]

    style TABS fill:#1c1917,color:#fff
    style HOME fill:#f5f5f4
    style HIST fill:#f5f5f4
    style MED  fill:#f5f5f4
    style PREMIUM fill:#fbbf24
    style SETTINGS fill:#f5f5f4
```

### 3c. Fluxo Premium — Compartilhamento Familiar

```mermaid
flowchart TD
    P([Abre Premium]) --> P1{Sessão ativa?\ngetSession}

    P1 -->|Não| AUTH[🔐 Tela de Auth]
    AUTH --> A1{Tab selecionada}
    A1 -->|Entrar| A2[signIn → Supabase Auth]
    A1 -->|Criar conta| A3[signUp → Supabase Auth\n+ upsert profiles]
    A2 & A3 --> A4{já tem grupo?}

    P1 -->|Sim| A4

    A4 -->|Não| SETUP[🏗️ Setup]
    A4 -->|Sim| DASH

    SETUP --> S1[Criar grupo familiar]
    SETUP --> S2[Entrar com código]

    S1 --> S1a[createFamilyGroup\ninsert family_groups\ninsert family_members owner\ninsert pets]
    S1a --> S1b[initialFullSync\nbulk upsert action_logs\nvaccines, appointments\nweight_entries]
    S1b --> DASH

    S2 --> S2a[joinFamilyGroup\nfind by invite_code\nupsert family_members member]
    S2a --> DASH

    DASH[📊 Dashboard] --> D1[Exibe grupo + membros\nFamilyGroup / FamilyMember]
    DASH --> D2[Código de convite\ncopiar para clipboard]
    DASH --> D3[⚡ Realtime ativo\nsubscribeToFamilyLogs\npostgres_changes → action_logs]
    D3 --> D4{Novo INSERT\nde outro membro?}
    D4 -->|Sim| D5[addActionLog local\natualiza Home em tempo real]
    DASH --> D6[Sair da conta\nsignOut + reset store]
    D6 --> AUTH

    style P fill:#1c1917,color:#fff
    style AUTH fill:#2563eb,color:#fff
    style SETUP fill:#7c3aed,color:#fff
    style DASH  fill:#16a34a,color:#fff
```

### 3d. Fluxo de Notificações

```mermaid
flowchart LR
    N1([Usuário acorda]) --> N2[checkAndResetDay]
    N2 --> N3{Virada de dia?}
    N3 -->|Não| N4[Nada]
    N3 -->|Sim| N5{diff = 1 dia?}
    N5 -->|Sim + completo| N6[Mantém streak]
    N5 -->|Sim + incompleto\n+ tem shield| N7[Usa shield\nMantém streak]
    N5 -->|Qualquer outro| N8[Zera streak 💔]

    NA([Registra ação]) --> NB{isDayComplete?}
    NB -->|Sim| NC[cancelAllReminders]
    NB -->|Não| ND[cancelAllReminders\n→ scheduleDailyReminder\nCALENDAR trigger HH:MM\n→ scheduleStreakAtRiskReminder\nDATE trigger 21:00]

    style N1 fill:#f5f5f4
    style NA fill:#f5f5f4
    style NC fill:#16a34a,color:#fff
    style N8 fill:#dc2626,color:#fff
```

---

## Resumo da Arquitetura

```mermaid
flowchart TB
    subgraph UI["📱 UI (Expo Router)"]
        direction LR
        TABS["(tabs)\nHome / Histórico / Médico"]
        MODALS["Modais\nSettings / Premium\nEdit-Profile / Onboarding"]
    end

    subgraph STATE["🗃️ Estado (Zustand + MMKV)"]
        STORE["usePetStore\nPetState + Auth + Sync"]
        MMKV["MMKV Storage\ncronopet-pet-store\ncronopet-auth"]
    end

    subgraph SERVICES["⚙️ Serviços"]
        NOTIF["NotificationService\nexpo-notifications"]
        PDF["PdfReportService\nexpo-print"]
        AUTH["AuthService\nSupabase Auth"]
        SYNC["SyncService\nSupabase DB + Realtime"]
        SUPA["supabase.ts\ncreatClient + MMKV adapter"]
    end

    subgraph CLOUD["☁️ Supabase (qhbsmvuwuiupdqdrrdov)"]
        PGDB["PostgreSQL 17\n9 tabelas + RLS"]
        RT["Realtime\naction_logs channel"]
    end

    UI --> STATE
    STATE --> SERVICES
    AUTH --> SUPA
    SYNC --> SUPA
    SUPA --> CLOUD
    RT --> SYNC
    NOTIF --> UI
    PDF --> UI
    STATE --> MMKV

    style UI    fill:#1c1917,color:#fff
    style STATE fill:#2563eb,color:#fff
    style SERVICES fill:#7c3aed,color:#fff
    style CLOUD fill:#059669,color:#fff
```
