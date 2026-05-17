/**
 * Gold dataset — 50 cenários sintéticos curados pra validar os 40 detectores
 * de HealthInsights.ts.
 *
 * Princípios:
 *  - Cada caso descreve uma situação clínica realista (não é só fixture
 *    minimalista pra explodir o threshold)
 *  - `expectFires` lista *prefixos* de ID que DEVEM disparar
 *  - `expectMisses` lista prefixos que NÃO devem disparar (controle negativo)
 *  - O runner faz match por prefixo, ignorando o sufixo dayKey
 *  - Cada detector tem ≥1 caso positivo; detectores principais têm também
 *    um controle negativo subliminar (perto do threshold mas abaixo)
 *
 * Fonte da matemática dos thresholds: services/HealthInsights.ts (mesmo
 * arquivo testado — então cuidado: se o threshold mudar, os casos podem
 * passar a falhar mesmo quando o detector segue correto).
 */

import type { AnalyzeInputForTests, TestCase } from './run';
import {
  NOW, DAY, HOUR,
  dog, cat,
  food, water, walk, pee, poop, bath,
  repeat, action, medEvent, weight,
} from './helpers';

// ─── 50 casos ─────────────────────────────────────────────────────────

export const CASES: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════
  // BLOCO 1 — Detectores genéricos (1-9)
  // ═══════════════════════════════════════════════════════════════════

  {
    name: '01. Perda de peso ≥10% em 14d → alert',
    fixture: {
      pet: dog('Labrador Retriever', { idealWeightKg: 30, ageYears: 5 }),
      weightHistory: [weight(14, 30), weight(0, 26)],
      actionHistory: [],
      medicalEvents: [],
    },
    expectFires: ['weight_var_14d'],
  },
  {
    name: '02. Variação de peso 5-10% em 14d → warning',
    fixture: {
      pet: dog('Beagle', { idealWeightKg: 12, ageYears: 4 }),
      weightHistory: [weight(14, 12), weight(0, 11.2)],
      actionHistory: [],
      medicalEvents: [],
    },
    expectFires: ['weight_var_14d'],
  },
  {
    name: '03. Tendência de queda 3 pesagens consecutivas → info',
    fixture: {
      pet: cat('Persa', { idealWeightKg: 4.5, ageYears: 6 }),
      weightHistory: [weight(60, 4.5), weight(30, 4.3), weight(0, 4.1)],
      actionHistory: [],
      medicalEvents: [],
    },
    expectFires: ['weight_trend'],
  },
  {
    name: '04. Apetite caiu pra <40% do baseline → alert',
    fixture: {
      pet: dog('Golden Retriever', { idealWeightKg: 30, ageYears: 6 }),
      weightHistory: [],
      // Baseline: 2 refeições/dia por 14 dias. Recente: 0 nos últimos 3 dias
      actionHistory: [
        ...repeat('comida', 17, 3, 2),
      ],
      medicalEvents: [],
    },
    expectFires: ['appetite_drop'],
  },
  {
    name: '05. 3+ refeições não-totais nos últimos 5 dias → info partial',
    fixture: {
      pet: dog('Pinscher Miniatura', { idealWeightKg: 4, ageYears: 3 }),
      weightHistory: [],
      actionHistory: [
        food(0, { acceptance: 'partial' }),
        food(1, { acceptance: 'partial' }),
        food(2, { acceptance: 'partial' }),
        food(3, { acceptance: 'full' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['food_partial'],
  },
  {
    name: '06. 2+ recusas nos últimos 5 dias → warning',
    fixture: {
      pet: cat('Vira-lata gato', { idealWeightKg: 4 }),
      weightHistory: [],
      actionHistory: [
        food(0, { acceptance: 'refused' }),
        food(1, { acceptance: 'refused' }),
        food(2, { acceptance: 'full' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['food_refused'],
  },
  {
    name: '07. Sem registro de água há >24h → warning hydration_gap',
    fixture: {
      pet: dog('SRD', { idealWeightKg: 15 }),
      weightHistory: [],
      actionHistory: [water(2)], // último foi há 2 dias
      medicalEvents: [],
    },
    expectFires: ['hydration_gap'],
  },
  {
    name: '08. 2+ fezes líquidas em 3 dias → warning diarreia',
    fixture: {
      pet: dog('SRD', {}),
      weightHistory: [],
      actionHistory: [
        poop(0, { consistency: 'liquid' }),
        poop(1, { consistency: 'liquid' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['diarrhea'],
  },
  {
    name: '09. 3+ fezes amolecidas em 3 dias → info soft_stool',
    fixture: {
      pet: cat('Vira-lata gato', {}),
      weightHistory: [],
      actionHistory: [
        poop(0, { consistency: 'soft' }),
        poop(1, { consistency: 'soft' }),
        poop(2, { consistency: 'soft' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['soft_stool'],
  },
  {
    name: '10. Cão sem cocô há >36h → info no_stool',
    fixture: {
      pet: dog('SRD', {}),
      weightHistory: [],
      actionHistory: [poop(2, { consistency: 'normal' })],
      medicalEvents: [],
    },
    expectFires: ['no_stool'],
  },
  {
    name: '11. 3+ fezes duras em 5 dias → info hard_stool',
    fixture: {
      pet: dog('Shih Tzu', {}),
      weightHistory: [],
      actionHistory: [
        poop(0, { consistency: 'hard' }),
        poop(1, { consistency: 'hard' }),
        poop(2, { consistency: 'hard' }),
        // Garante que detectConstipation não fire no_stool antes
        poop(0.1, { consistency: 'normal' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['hard_stool'],
  },
  {
    name: '12. Xixi/cocô com aparência alterada → info abnormal_appearance',
    fixture: {
      pet: dog('SRD', {}),
      weightHistory: [],
      actionHistory: [
        pee(1, { appearance: 'abnormal' }),
        pee(3, { appearance: 'abnormal' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['abnormal_appearance'],
  },
  {
    name: '13. Vômito recorrente (2+ em 14d) → warning med_recur',
    fixture: {
      pet: cat('Persa', {}),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [
        medEvent('vomito', 1),
        medEvent('vomito', 5),
      ],
    },
    expectFires: ['med_recur_vomito'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BLOCO 2 — Detectores raça-específicos (10-13)
  // ═══════════════════════════════════════════════════════════════════

  {
    name: '14. Cavalier + sintoma cardíaco → breed_match',
    fixture: {
      pet: dog('Cavalier King Charles Spaniel', { ageYears: 7 }),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [
        medEvent('outro', 5, 'tosse seca à noite'),
      ],
    },
    expectFires: ['breed_match'],
  },
  {
    name: '15. Border Collie sedentário (15 min/dia) → exercise_deficit',
    fixture: {
      pet: dog('Border Collie', { ageYears: 3 }),
      weightHistory: [],
      actionHistory: [
        ...repeat('passeio', 7, 0, 1, { duration: 15 }),
      ],
      medicalEvents: [],
    },
    expectFires: ['exercise_deficit'],
  },
  {
    name: '16. Shih Tzu sem banho há 90 dias → warning bath_overdue',
    fixture: {
      pet: dog('Shih Tzu', { ageYears: 4 }),
      weightHistory: [],
      actionHistory: [bath(90)],
      medicalEvents: [],
    },
    expectFires: ['bath_overdue'],
  },
  {
    name: '17. Pug em dia de 33°C → alert heat_risk',
    fixture: {
      pet: dog('Pug', { ageYears: 4 }),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [],
      ambientTempC: 33,
    },
    expectFires: ['heat_risk'],
  },
  {
    name: '18. Chihuahua em dia de 8°C → info cold_risk',
    fixture: {
      pet: dog('Chihuahua', { ageYears: 4 }),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [],
      ambientTempC: 8,
    },
    expectFires: ['cold_risk'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BLOCO 3 — Detectores singulares Fase 2 (14-30)
  // ═══════════════════════════════════════════════════════════════════

  {
    // Baseline: 21d * 150ml * 2/dia = ~50ml/dia média (n=42). Não — média diária
    // do baseline = (sum / 21). Vamos garantir ratio recente / base ≥ 1.5.
    // Base: 21 dias, 2 registros/dia, 100ml cada → 200ml*21 / 21 = 200ml/dia
    // Recente: 7 dias, 3 registros/dia, 200ml cada → 600ml*7 / 7 = 600ml/dia
    // ratio = 3.0 → alert
    name: '19. Polidipsia: 200ml/dia → 600ml/dia (alert)',
    fixture: {
      pet: cat('Persa', { ageYears: 12 }),
      weightHistory: [],
      actionHistory: [
        ...repeat('agua', 28, 7, 2, { volumeMl: 100 }),
        ...repeat('agua', 7, 0, 3, { volumeMl: 200 }),
      ],
      medicalEvents: [],
    },
    expectFires: ['polydipsia'],
  },
  {
    // Base: 21d * 1 xixi/dia = 21 registros (1/dia)
    // Recente: 7d * 3 xixi/dia = 21 registros (3/dia)
    // ratio = 3.0 → alert
    name: '20. Poliúria: 1 xixi/dia → 3 xixi/dia (alert)',
    fixture: {
      pet: dog('Schnauzer', { ageYears: 10 }),
      weightHistory: [],
      actionHistory: [
        ...repeat('xixi', 28, 7, 1),
        ...repeat('xixi', 7, 0, 3),
      ],
      medicalEvents: [],
    },
    expectFires: ['polyuria'],
  },
  {
    // Polifagia (recente 14d ≥1.2x base 28d) + perda peso ≥3% em ~30d
    name: '21. Gato sênior: come mais + perde peso → polyphagia_weightloss',
    fixture: {
      pet: cat('Vira-lata gato', { ageYears: 12 }),
      // Polifagia mede DIAS COM REGISTRO POR DIA DE JANELA. Pra ratio ≥ 1.2,
      // base precisa ser esparsa (dias alternados) e recente densa (todo dia).
      weightHistory: [weight(35, 5.0), weight(0, 4.7)], // -6% em ~35d
      actionHistory: [
        // Base 28d: food em dias alternados (14 dias com food de 28 possíveis)
        ...Array.from({ length: 14 }, (_, i) => food(15 + i * 2)),
        // Recent 14d: food todo dia
        ...Array.from({ length: 14 }, (_, i) => food(i + 1)),
      ],
      medicalEvents: [],
    },
    expectFires: ['polyphagia_weightloss'],
  },
  {
    // Base 28d (dias [42, 14)): 40 min/dia médio
    // Recente 14d: 10 min/dia → ratio 0.25 + nota de letargia
    name: '22. Atividade caiu drasticamente + nota letargia → warning',
    fixture: {
      pet: dog('Labrador Retriever', { ageYears: 6 }),
      weightHistory: [],
      actionHistory: [
        ...repeat('passeio', 42, 14, 1, { duration: 40 }),
        ...repeat('passeio', 14, 0, 1, { duration: 10, note: 'apático, sem energia' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['lethargy_activity'],
  },
  {
    name: '23. Halitose persistente (3 notas em 30d) → info halitosis',
    fixture: {
      pet: dog('Yorkshire Terrier', { ageYears: 5 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'mau hálito forte hoje' }),
        food(10, { note: 'boca fedendo' }),
      ],
      medicalEvents: [
        medEvent('outro', 20, 'halitose persistente'),
      ],
    },
    expectFires: ['halitosis'],
  },
  {
    name: '24. Cocker coçando orelha 3x em 14d → warning ear_scratching',
    fixture: {
      pet: dog('Cocker Spaniel', { ageYears: 4 }),
      weightHistory: [],
      actionHistory: [
        action('comida', 1, { note: 'balançando cabeça muito' }),
        action('comida', 5, { note: 'orelha vermelha e quente' }),
        action('comida', 10, { note: 'cera escura na orelha' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['ear_scratching'],
  },
  {
    name: '25. Sinais periodontais 4x em 30d → warning periodontal',
    fixture: {
      pet: dog('Poodle', { ageYears: 7 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'tártaro visível' }),
        food(8, { note: 'gengiva sangrando ao escovar' }),
        food(15, { note: 'mastigando de lado' }),
        food(25, { note: 'salivando muito' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['periodontal'],
  },
  {
    name: '26. Arrastando bumbum → anal_sac',
    fixture: {
      pet: dog('SRD', { ageYears: 5 }),
      weightHistory: [],
      actionHistory: [
        walk(2, { note: 'arrastando o bumbum no tapete' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['anal_sac'],
  },
  {
    name: '27. Lambida focal repetida → local_licking',
    fixture: {
      pet: dog('Boxer', { ageYears: 6 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'lambendo a pata direita demais' }),
        food(7, { note: 'lambendo direto a mesma pata' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['local_licking'],
  },
  {
    name: '28. Buscando lugar fresco + ofegante (raça braqui) → thermal_intolerance',
    fixture: {
      pet: dog('Bulldog Francês', { ageYears: 4 }),
      weightHistory: [],
      actionHistory: [
        walk(2, { note: 'arfando muito mesmo no sofá' }),
        walk(6, { note: 'procurando lugar fresco o tempo todo' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['thermal_intolerance'],
  },
  {
    name: '29. Gato sênior miando muito → warning vocal_change',
    fixture: {
      pet: cat('Vira-lata gato', { ageYears: 14 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'miando muito de madrugada' }),
        food(10, { note: 'vocalizando alto sem motivo' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['vocal_change'],
  },
  {
    name: '30. Mudança no padrão de sono (3 notas) → warning sleep_change',
    fixture: {
      pet: dog('Labrador Retriever', { ageYears: 10 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'dormindo demais ultimamente' }),
        food(8, { note: 'dorme o dia todo' }),
        food(15, { note: 'mais sono que antes' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['sleep_change'],
  },
  {
    name: '31. Cavalier com dificuldade respiratória → alert (cardíaco)',
    fixture: {
      pet: dog('Cavalier King Charles Spaniel', { ageYears: 8 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'respirando rápido em repouso' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['breath_difficulty'],
  },
  {
    name: '32. Mancando (nota + evento) em raça com displasia → warning lameness',
    fixture: {
      pet: dog('Pastor Alemão', { ageYears: 5 }),
      weightHistory: [],
      actionHistory: [
        walk(3, { note: 'mancando da pata traseira' }),
      ],
      medicalEvents: [
        medEvent('mancando', 5),
      ],
    },
    expectFires: ['lameness'],
  },
  {
    name: '33. Vômito crônico (5 episódios em 14d) → warning chronic_vomiting',
    fixture: {
      pet: cat('Persa', { ageYears: 8 }),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [
        medEvent('vomito', 1),
        medEvent('vomito', 4),
        medEvent('vomito', 7),
        medEvent('vomito', 10),
        medEvent('vomito', 13),
      ],
    },
    expectFires: ['chronic_vomiting'],
  },
  {
    name: '34. Sangue nas fezes → alert bloody_diarrhea',
    fixture: {
      pet: dog('SRD', { ageYears: 3 }),
      weightHistory: [],
      actionHistory: [
        poop(1, { consistency: 'soft', note: 'sangue no cocô' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['bloody_diarrhea'],
  },
  {
    name: '35. Caroço novo registrado → warning new_lump',
    fixture: {
      pet: dog('Boxer', { ageYears: 8 }),
      weightHistory: [],
      actionHistory: [
        bath(5, { note: 'caroço novo na pele do pescoço' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['new_lump'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BLOCO 4 — Detectores compostos (31-40)
  // ═══════════════════════════════════════════════════════════════════

  {
    // Diabetes = polidipsia + poliúria + (polifagia OU perda peso)
    name: '36. Diabetes: PD + PU + perda de peso → diabetes_suspicion',
    fixture: {
      pet: dog('Schnauzer', { ageYears: 9, idealWeightKg: 7 }),
      weightHistory: [weight(35, 7.5), weight(0, 7.0)], // -6.7%
      actionHistory: [
        // Polidipsia: base 200ml, recente 600ml
        ...repeat('agua', 28, 7, 2, { volumeMl: 100 }),
        ...repeat('agua', 7, 0, 3, { volumeMl: 200 }),
        // Poliúria: base 1/dia, recente 3/dia
        ...repeat('xixi', 28, 7, 1),
        ...repeat('xixi', 7, 0, 3),
      ],
      medicalEvents: [],
    },
    expectFires: ['diabetes_suspicion', 'polydipsia', 'polyuria'],
  },
  {
    // CKD = sênior + ≥2 de {PD, halitose, perda peso 5%/60d}
    name: '37. CKD: gato sênior + PD + halitose + perda peso → alert',
    fixture: {
      pet: cat('Persa', { ageYears: 14, idealWeightKg: 4 }),
      weightHistory: [weight(65, 4.0), weight(0, 3.7)], // -7.5% em 65d
      actionHistory: [
        ...repeat('agua', 28, 7, 2, { volumeMl: 100 }),
        ...repeat('agua', 7, 0, 3, { volumeMl: 200 }),
        food(3, { note: 'mau hálito horrível, tipo amônia' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['ckd_suspicion'],
  },
  {
    // Hiper felino = gato + sênior + polifagia + perda peso (+ extras opcionais)
    name: '38. Hipertireoidismo felino: gato sênior + come mais + perde peso',
    fixture: {
      pet: cat('Vira-lata gato', { ageYears: 13, idealWeightKg: 5 }),
      weightHistory: [weight(65, 5.0), weight(0, 4.6)], // -8% em 65d
      actionHistory: [
        // Base esparsa (dias alternados) + recente densa pra polifagia ≥ 1.2
        ...Array.from({ length: 14 }, (_, i) => food(15 + i * 2)),
        ...Array.from({ length: 14 }, (_, i) => food(i + 1)),
        food(3, { note: 'miando muito de noite' }),
        food(10, { note: 'mais agitado que antes' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['hyperthyroid'],
  },
  {
    // Artrose = (mancada + nota OU evento ≥2) + (raça ortopédica OU senior)
    name: '39. Artrose: Pastor sênior + mancando 3x + queda de atividade',
    fixture: {
      pet: dog('Pastor Alemão', { ageYears: 9 }),
      weightHistory: [],
      actionHistory: [
        walk(2, { note: 'mancando, dificuldade levantar' }),
        walk(5, { note: 'rigidez ao acordar' }),
        food(10, { note: 'menos brincalhão, sem energia' }),
      ],
      medicalEvents: [
        medEvent('mancando', 7),
      ],
    },
    expectFires: ['arthritis_pattern'],
  },
  {
    // Otite por raça pendular = orelha pendular + ≥2 sinais em 21d
    name: '40. Otite por raça: Beagle + 2 sinais → otitis_by_breed',
    fixture: {
      pet: dog('Beagle', { ageYears: 5 }),
      weightHistory: [],
      actionHistory: [
        food(3, { note: 'balançando cabeça' }),
        food(10, { note: 'orelha fedendo, cera escura' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['otitis_by_breed'],
  },
  {
    // Atopia = raça com atopia + 3+ sinais de coceira/pele em 30d
    name: '41. Atopia: Bulldog Francês + coceira/pele 3x → atopy_pattern',
    fixture: {
      pet: dog('Bulldog Francês', { ageYears: 3 }),
      weightHistory: [],
      actionHistory: [
        food(3, { note: 'coçando muito as patas' }),
        food(10, { note: 'pele vermelha entre dedos' }),
        food(20, { note: 'lambendo pata o dia todo' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['atopy_pattern'],
  },
  {
    // GDV = raça grande peito profundo + ≥1 sinal
    name: '42. GDV: Gran Danês + tentou vomitar sem sair → alert',
    fixture: {
      // breedKey é 'gran danes' — usar 'Dogue Alemão' não bate no lookup
      pet: dog('Gran Danês', { ageYears: 5 }),
      weightHistory: [],
      actionHistory: [
        food(1, { note: 'tentando vomitar sem sair nada, abdomen inchado' }),
        food(3, { note: 'regurgitou logo após comer' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['gdv_risk'],
  },
  {
    // Pancreatite = score ≥2 com vômito amarelo + dor + dieta gordurosa
    name: '43. Pancreatite: vômito amarelo + dor barriga + churrasco → alert',
    fixture: {
      pet: dog('Schnauzer', { ageYears: 7 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'vomitou amarelo de manhã' }),
        food(3, { note: 'postura rezando, barriga dolorida' }),
        food(4, { note: 'comeu sobra de carne do churrasco' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['pancreatitis_pattern'],
  },
  {
    // Cardiomiopatia = raça cardíaca + ≥2 de {tosse, fadiga, dispneia}
    name: '44. Cardiomiopatia: Doberman + tosse + cansaço → alert',
    fixture: {
      pet: dog('Doberman', { ageYears: 7 }),
      weightHistory: [],
      actionHistory: [
        food(2, { note: 'tosse seca à noite, principalmente' }),
        food(8, { note: 'cansando rápido no passeio, parando muito' }),
        food(15, { note: 'tossindo depois de exercício' }),
      ],
      medicalEvents: [],
    },
    expectFires: ['cardiomyopathy'],
  },
  {
    // Emergência GI = vomito + diarreia em 48h + sem água em 12h
    name: '45. Emergência GI: vômito + diarreia + recusa água → alert',
    fixture: {
      pet: dog('SRD', { ageYears: 2 }),
      weightHistory: [],
      actionHistory: [
        water(1.5), // última água há 36h
      ],
      medicalEvents: [
        medEvent('vomito', 1),
        medEvent('diarreia', 1.2),
      ],
    },
    expectFires: ['gi_emergency'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BLOCO 5 — Controles negativos (5 casos)
  // ═══════════════════════════════════════════════════════════════════

  {
    name: '46. Pet saudável com rotina normal — nada deve disparar',
    fixture: {
      pet: dog('SRD', { ageYears: 4, idealWeightKg: 15 }),
      weightHistory: [weight(30, 15.0), weight(0, 15.1)],
      actionHistory: [
        // SRD recomenda 45 min/dia — uso 60 pra ficar bem acima do threshold de 0.7
        ...repeat('comida', 30, 0, 2, { acceptance: 'full' }),
        ...repeat('agua', 30, 0, 3, { volumeMl: 200 }),
        ...repeat('passeio', 30, 0, 1, { duration: 60 }),
        ...repeat('coco', 30, 0, 1, { consistency: 'normal' }),
        ...repeat('xixi', 30, 0, 2, { appearance: 'normal' }),
        // Água fresca hoje pra silenciar hydration_low (gap > 12h)
        action('agua', 0, { volumeMl: 200 }),
        bath(20),
      ],
      medicalEvents: [],
      ambientTempC: 22,
    },
    expectFires: [],
    expectMisses: [
      'weight_var', 'weight_trend', 'appetite_drop', 'food_refused',
      'food_partial', 'hydration_gap', 'hydration_low', 'diarrhea',
      'soft_stool', 'no_stool', 'hard_stool', 'abnormal_appearance',
      'med_recur', 'polydipsia', 'polyuria', 'lethargy_activity',
      'halitosis', 'periodontal', 'anal_sac', 'local_licking',
      'thermal_intolerance', 'sleep_change', 'breath_difficulty',
      'lameness', 'chronic_vomiting', 'bloody_diarrhea', 'new_lump',
      'diabetes_suspicion', 'ckd_suspicion', 'hyperthyroid',
      'arthritis_pattern', 'gdv_risk', 'pancreatitis_pattern',
      'cardiomyopathy', 'gi_emergency', 'heat_risk', 'cold_risk',
    ],
  },
  {
    name: '47. Subliminar: variação peso 4% em 14d → NÃO dispara',
    fixture: {
      pet: dog('SRD', { idealWeightKg: 20 }),
      weightHistory: [weight(14, 20.0), weight(0, 19.2)], // -4% < 5%
      actionHistory: [],
      medicalEvents: [],
    },
    expectFires: [],
    expectMisses: ['weight_var_14d'],
  },
  {
    name: '48. Subliminar: 1 fezes líquida em 3d → NÃO dispara diarrhea',
    fixture: {
      pet: dog('SRD', {}),
      weightHistory: [],
      actionHistory: [
        poop(0, { consistency: 'liquid' }),
        poop(2, { consistency: 'normal' }),
      ],
      medicalEvents: [],
    },
    expectFires: [],
    expectMisses: ['diarrhea'],
  },
  {
    name: '49. Subliminar: 3 vômitos em 14d (< limiar de 4) → NÃO chronic',
    fixture: {
      pet: cat('Persa', { ageYears: 8 }),
      weightHistory: [],
      actionHistory: [],
      medicalEvents: [
        medEvent('vomito', 2),
        medEvent('vomito', 7),
        medEvent('vomito', 12),
      ],
    },
    // Vai disparar med_recur_vomito (≥2), mas NÃO chronic_vomiting (<4)
    expectFires: ['med_recur_vomito'],
    expectMisses: ['chronic_vomiting'],
  },
  {
    // weight_var_30d só dispara quando NÃO há ref14d (gap > 7d entre
    // pesagem antiga e -14d) — fallback pra variação mensal sustentada.
    name: '50b. Variação ≥10% em 30d sem ref de 14d → warning weight_var_30d',
    fixture: {
      pet: dog('Labrador Retriever', { idealWeightKg: 30, ageYears: 6 }),
      // Pesagens: -30d (28kg) e hoje (25kg) = -10.7%. Sem referência ~14d atrás.
      weightHistory: [weight(30, 28), weight(0, 25)],
      actionHistory: [],
      medicalEvents: [],
    },
    expectFires: ['weight_var_30d'],
    expectMisses: ['weight_var_14d'],
  },
  {
    name: '50. Pet não-sênior com sinais sutis — composto NÃO dispara',
    // CKD exige isSenior. Pet jovem com 1 sinal só não deve disparar.
    fixture: {
      pet: cat('Persa', { ageYears: 3 }), // jovem
      weightHistory: [weight(60, 4.0), weight(0, 3.7)], // -7.5%
      actionHistory: [
        ...repeat('agua', 28, 7, 2, { volumeMl: 100 }),
        ...repeat('agua', 7, 0, 3, { volumeMl: 200 }),
      ],
      medicalEvents: [],
    },
    // Vai disparar polydipsia + weight_var (separados), mas NÃO ckd_suspicion
    expectMisses: ['ckd_suspicion'],
    expectFires: ['polydipsia'],
  },
];

// Suprime erro "unused" se algum builder ficar não-usado num refactor
void action; void food; void water; void walk; void pee; void poop;
void bath; void repeat; void medEvent; void weight;
