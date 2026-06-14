// data.jsx — demo data for CronoPet redesign prototype. pt-BR.

const PETS = [
  { id: 'mel',  nome: 'Mel',   tipo: 'cachorro', raca: 'Golden Retriever', idade: '3 anos',  peso: 28.4, slot: 'pet-mel',  streak: 12 },
  { id: 'tom',  nome: 'Tom',   tipo: 'gato',     raca: 'Sem raça definida', idade: '5 anos',  peso: 4.6,  slot: 'pet-tom',  streak: 4 },
];

// metas por tipo
const GOALS = {
  cachorro: ['comida', 'agua', 'passeio'],
  gato: ['comida', 'agua'],
};

// linha do tempo de hoje (ordem cronológica)
const TODAY_TIMELINE = [
  { key: 'comida',  hora: '07:20', por: 'Você',    nota: 'Ração seca · 120g' },
  { key: 'agua',    hora: '07:25', por: 'Você',    nota: 'Tigela cheia' },
  { key: 'passeio', hora: '08:05', por: 'Rafael',  nota: '25 min · Praça' },
  { key: 'xixi',    hora: '08:10', por: 'Rafael',  nota: 'No passeio' },
  { key: 'coco',    hora: '08:12', por: 'Rafael',  nota: 'Normal' },
  { key: 'comida',  hora: '12:40', por: 'Você',    nota: 'Ração úmida · 80g' },
  { key: 'agua',    hora: '15:10', por: 'Você',    nota: 'Reabasteceu' },
];

// contagem de hoje derivada
function todayCounts(timeline) {
  const c = { comida: 0, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0, tosa: 0 };
  timeline.forEach((e) => { c[e.key] = (c[e.key] || 0) + 1; });
  return c;
}

// semana (seg→dom) — metas concluídas por dia
const WEEK = [
  { dia: 'Seg', done: 3, total: 3 },
  { dia: 'Ter', done: 3, total: 3 },
  { dia: 'Qua', done: 2, total: 3 },
  { dia: 'Qui', done: 3, total: 3 },
  { dia: 'Sex', done: 3, total: 3 },
  { dia: 'Sáb', done: 3, total: 3 },
  { dia: 'Hoje', done: 2, total: 3 },
];

// série de água (ml) últimos 7 dias
const WATER_WEEK = [620, 700, 540, 680, 720, 660, 430];
// refeições por dia
const MEALS_WEEK = [3, 3, 3, 2, 3, 3, 2];
// passeios (min) por dia
const WALK_WEEK = [40, 25, 0, 30, 45, 60, 25];

// peso — últimos 6 registros
const WEIGHT_SERIES = [
  { mes: 'Jan', kg: 27.2 },
  { mes: 'Fev', kg: 27.6 },
  { mes: 'Mar', kg: 28.0 },
  { mes: 'Abr', kg: 28.1 },
  { mes: 'Mai', kg: 28.5 },
  { mes: 'Jun', kg: 28.4 },
];

// vacinas
const VACCINES = [
  { nome: 'V10 (Déctupla)',     data: '14 mar 2026', status: 'ok',       prox: '14 mar 2027' },
  { nome: 'Antirrábica',         data: '14 mar 2026', status: 'ok',       prox: '14 mar 2027' },
  { nome: 'Giárdia',             data: '02 fev 2026', status: 'ok',       prox: '02 fev 2027' },
  { nome: 'Gripe canina',        data: '—',           status: 'pendente', prox: 'Agendar' },
];

// próximas consultas
const APPOINTMENTS = [
  { titulo: 'Check-up anual',    quando: '28 jun · 15h30', vet: 'Dra. Camila · Clínica VidaPet' },
];

// insight clínico (não-alarmista, fecha com vet)
const INSIGHT = {
  tom: 'atencao',
  titulo: 'Hidratação um pouco abaixo',
  texto: 'Mel bebeu cerca de 18% menos água nos últimos 3 dias do que a média do mês. Pode ser o calor — vale deixar mais uma tigela disponível e observar.',
  rodape: 'Não é diagnóstico. Se persistir, consulte o veterinário.',
};

// nutrição
const NUTRITION = {
  metaKcal: 1180,
  consumidoKcal: 760,
  refeicoes: [
    { nome: 'Manhã',  hora: '07:20', tipo: 'Ração seca',  g: 120, kcal: 430, feito: true },
    { nome: 'Tarde',  hora: '12:40', tipo: 'Ração úmida', g: 80,  kcal: 330, feito: true },
    { nome: 'Noite',  hora: '19:00', tipo: 'Ração seca',  g: 115, kcal: 420, feito: false },
  ],
  macros: { proteina: 28, gordura: 16, carbo: 44, fibra: 12 },
};

// família
const FAMILY = [
  { nome: 'Você',   papel: 'Tutor principal', cor: '#04A29B', inicial: 'V' },
  { nome: 'Rafael', papel: 'Tutor',           cor: '#B45309', inicial: 'R' },
  { nome: 'Camila', papel: 'Convidada',       cor: '#7C3AED', inicial: 'C' },
];

const DATE_LABEL = 'Sábado, 13 de junho';

Object.assign(window, {
  PETS, GOALS, TODAY_TIMELINE, todayCounts, WEEK, WATER_WEEK, MEALS_WEEK, WALK_WEEK,
  WEIGHT_SERIES, VACCINES, APPOINTMENTS, INSIGHT, NUTRITION, FAMILY, DATE_LABEL,
});
