/**
 * lib/insightPersonalization.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Reescreve os textos genéricos do motor de insights pra soar como um
 * mentor que conhece o pet — não como um bot.
 *
 * Princípios de copy:
 *   • Usa o nome do pet em vez de "o pet"
 *   • Frases curtas, ponto final firme
 *   • Menciona raça quando agrega contexto, não como decoração
 *   • Sem palavras de chatbot ("detectado", "cruzando dados", "padrão")
 *   • Não conclui — sugere o próximo passo concreto
 *   • Sem exclamação de efeito, sem emoji
 */

import type { HealthInsight } from '@/services/HealthInsights';
import type { PetProfile } from '@/types/pet';
import { getBreedHealthProfile } from '@/data/breed-conditions';

interface PersonalizedCopy {
  /** Frase curta, máximo 60 chars — vira título do banner */
  title: string;
  /** Contexto, 1-2 frases naturais usando nome do pet */
  body: string;
  /** Próximo passo concreto, 1 frase imperativa suave */
  nextStep: string;
  /** Texto sugerido pra título da consulta veterinária (se a ação for marcar consulta) */
  appointmentTitle: string;
}

export function personalizeInsight(
  insight: HealthInsight,
  pet: Pick<PetProfile, 'nome' | 'raca' | 'tipo'>,
): PersonalizedCopy {
  const nome = pet.nome?.trim() || (pet.tipo === 'gato' ? 'seu gato' : 'seu pet');
  const breed = pet.raca ? getBreedHealthProfile(pet.raca, pet.tipo) : null;
  const breedName = breed?.displayName ?? null;

  switch (insight.category) {
    case 'weight':
      return weightCopy(insight, nome, breedName);
    case 'appetite':
      return appetiteCopy(insight, nome);
    case 'hydration':
      return hydrationCopy(insight, nome);
    case 'stool':
      return stoolCopy(insight, nome);
    case 'urine':
      return urineCopy(insight, nome);
    case 'medical':
      return medicalCopy(insight, nome);
    case 'breed':
      return breedCopy(insight, nome, breedName);
    case 'exercise':
      return exerciseCopy(insight, nome, breedName);
    case 'grooming':
      return groomingCopy(insight, nome);
    case 'thermal':
      return thermalCopy(insight, nome, breedName);
    default:
      return {
        title: insight.title,
        body: insight.message,
        nextStep: insight.suggestion,
        appointmentTitle: 'Avaliação geral',
      };
  }
}

// ─── Copy por categoria ──────────────────────────────────────────────

function weightCopy(insight: HealthInsight, nome: string, breed: string | null): PersonalizedCopy {
  const ev = insight.evidence as { fromKg?: number; toKg?: number; pct?: number } | undefined;
  const lost = (ev?.pct ?? 0) < 0;
  const pct = ev?.pct ? Math.abs(ev.pct).toFixed(1) : '?';

  if (insight.severity === 'alert') {
    return {
      title: lost ? `${nome} perdeu peso` : `${nome} ganhou peso`,
      body: lost
        ? `Caiu cerca de ${pct}% nas últimas duas semanas — ${ev?.fromKg ?? '?'}kg para ${ev?.toKg ?? '?'}kg. Variação dessa magnitude no curto prazo costuma ter causa por trás.`
        : `Subiu cerca de ${pct}% em duas semanas, indo de ${ev?.fromKg ?? '?'}kg para ${ev?.toKg ?? '?'}kg. Vale entender o que mudou na rotina.`,
      nextStep: 'Marque uma avaliação para o veterinário investigar.',
      appointmentTitle: lost ? 'Investigação de perda de peso' : 'Investigação de ganho de peso',
    };
  }

  return {
    title: lost ? `${nome} pode estar emagrecendo` : `${nome} pode estar engordando`,
    body: lost
      ? `Variação de ${pct}% no peso recente. Pode ser troca de ração, calor, ou algo que vale acompanhar.`
      : `Cerca de ${pct}% acima do peso de duas semanas atrás.${breed ? ` ${breed} costuma ganhar peso com facilidade.` : ''}`,
    nextStep: 'Pese de novo em uma semana e leve a tendência ao veterinário se persistir.',
    appointmentTitle: lost ? 'Acompanhamento de perda de peso' : 'Acompanhamento de ganho de peso',
  };
}

function appetiteCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  if (insight.severity === 'alert') {
    return {
      title: `${nome} está comendo bem menos`,
      body: `Nos últimos três dias o consumo caiu para uma fração do que era habitual. Falta de apetite prolongada não é normal e quase sempre tem causa.`,
      nextStep: 'Procure o veterinário ainda esta semana.',
      appointmentTitle: 'Investigação de falta de apetite',
    };
  }

  if (insight.title.includes('Recusas')) {
    return {
      title: `${nome} tem recusado refeições`,
      body: `Houve refeições recentes que o ${nome} não aceitou. Pode ser troca de ração, estresse no ambiente, ou desconforto que ainda não deu sintoma.`,
      nextStep: 'Acompanhe nos próximos dias. Se persistir, marque consulta.',
      appointmentTitle: 'Avaliação de recusa alimentar',
    };
  }

  return {
    title: `${nome} comendo abaixo do habitual`,
    body: `O apetite caiu nos últimos dias em comparação com a média do mês.`,
    nextStep: 'Observe por mais dois dias antes de mudar a ração ou marcar consulta.',
    appointmentTitle: 'Avaliação alimentar',
  };
}

function hydrationCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  if (insight.severity === 'warning') {
    return {
      title: 'Sem registro de água há mais de 24h',
      body: `Não há nenhum registro recente de hidratação para o ${nome}. Pode ser só falta de registro, ou pode ser sinal real — desidratação em pet é grave.`,
      nextStep: 'Confirme se o pote tem água e se o ${nome} está bebendo. Se está recusando, é urgência.'.replace('${nome}', nome),
      appointmentTitle: 'Avaliação de hidratação',
    };
  }
  return {
    title: 'Hidratação não registrada hoje',
    body: `Não vi registro de água do ${nome} hoje. Pode ser só esquecimento de registrar.`,
    nextStep: 'Cheque o pote e registre o consumo.',
    appointmentTitle: 'Avaliação de hidratação',
  };
}

function stoolCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  if (insight.title.includes('diarreia') || insight.title.includes('Diarreia') || insight.title.includes('Possível diarreia')) {
    return {
      title: `${nome} pode estar com diarreia`,
      body: `Mais de um registro de fezes líquidas em poucos dias. Pode ser algo que ele comeu, mas também pode ser infecção ou intolerância.`,
      nextStep: 'Mantenha hidratado. Se passar de 24h ou tiver outros sinais, procure o veterinário.',
      appointmentTitle: 'Avaliação de diarreia',
    };
  }
  if (insight.title.includes('Constipação') || insight.title.includes('Possível constipação')) {
    return {
      title: `${nome} parece constipado`,
      body: `Fezes endurecidas com frequência podem indicar pouca fibra, hidratação baixa, ou problema digestivo.`,
      nextStep: 'Reforce água e fibras. Se persistir, marque consulta.',
      appointmentTitle: 'Avaliação de constipação',
    };
  }
  if (insight.title.includes('Sem registros de cocô')) {
    return {
      title: `${nome} sem evacuar há horas`,
      body: `Faz mais de um dia sem registro de cocô. Pode ser apenas falta de registro, mas se passar de 48-72h sem evacuar de fato, é sinal de alerta.`,
      nextStep: 'Observe o ${nome} de perto e cheque com veterinário se a situação não normalizar.'.replace('${nome}', nome),
      appointmentTitle: 'Avaliação intestinal',
    };
  }
  return {
    title: insight.title.replace(/^[A-Z]/, (c) => c.toLowerCase()),
    body: insight.message,
    nextStep: insight.suggestion,
    appointmentTitle: 'Avaliação intestinal',
  };
}

function urineCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  return {
    title: `Aparência da urina alterada`,
    body: `Você marcou alguns registros recentes de xixi como diferente do normal. Pode ser cor, volume ou cheiro — e pode indicar problema urinário.`,
    nextStep: 'Vale uma consulta para investigar — exames de urina são simples e diretos.',
    appointmentTitle: 'Avaliação urinária',
  };
}

function medicalCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  const ev = insight.evidence as { type?: string; count?: number } | undefined;
  const sintoma = ev?.type
    ? ({ vomito: 'vômitos', febre: 'episódios de febre', mancando: 'episódios de mancada', diarreia: 'diarreia', coceira: 'coceira intensa', perda_apetite: 'perda de apetite', outro: 'sintomas' } as Record<string, string>)[ev.type] ?? 'sintomas'
    : 'o mesmo sintoma';

  return {
    title: `${nome} repetindo ${sintoma}`,
    body: `${ev?.count ?? 'Vários'} registros do mesmo tipo nas últimas duas semanas. Sintoma que volta merece investigação além de tratamento pontual.`,
    nextStep: 'Marque consulta e leve o histórico do app na consulta.',
    appointmentTitle: `Avaliação — ${sintoma}`,
  };
}

function breedCopy(insight: HealthInsight, nome: string, breed: string | null): PersonalizedCopy {
  const ev = insight.evidence as { condition?: string; hits?: number } | undefined;
  const condition = ev?.condition ?? 'condição racial';

  return {
    title: `Sinal compatível com ${condition.toLowerCase()}`,
    body: `${breed ? `${breed}` : 'A raça do ' + nome} tem predisposição conhecida a esse problema. Os registros recentes de ${nome} batem com o que normalmente se observa nele.`,
    nextStep: 'Vale mencionar isso explicitamente na próxima consulta.',
    appointmentTitle: `Avaliação — ${condition}`,
  };
}

function exerciseCopy(insight: HealthInsight, nome: string, breed: string | null): PersonalizedCopy {
  const ev = insight.evidence as { dailyAvg?: number; recommended?: number } | undefined;
  return {
    title: `${nome} se exercitando pouco`,
    body: `Média de ${Math.round(ev?.dailyAvg ?? 0)} minutos por dia esta semana.${breed ? ` ${breed} precisa de mais para gastar a energia que tem.` : ''} Sem isso vem ansiedade, ganho de peso e comportamento inquieto.`,
    nextStep: 'Tente aumentar gradualmente os passeios. Não precisa dobrar de um dia pro outro.',
    appointmentTitle: 'Plano de atividade física',
  };
}

function groomingCopy(insight: HealthInsight, nome: string): PersonalizedCopy {
  const ev = insight.evidence as { daysSince?: number } | undefined;
  return {
    title: 'Banho atrasado',
    body: `Faz cerca de ${ev?.daysSince ?? '?'} dias desde o último banho do ${nome}. Banho ajuda a perceber caroços, parasitas e mudanças na pele.`,
    nextStep: 'Marque um banho ou registre se já fez recentemente.',
    appointmentTitle: 'Banho e tosa',
  };
}

function thermalCopy(insight: HealthInsight, nome: string, breed: string | null): PersonalizedCopy {
  const ev = insight.evidence as { tempC?: number } | undefined;
  if (insight.title.includes('Risco térmico')) {
    return {
      title: `Hoje está quente para ${nome}`,
      body: `${ev?.tempC ?? '?'}°C agora.${breed ? ` ${breed} sofre mais com calor que outras raças.` : ''} Passeio em horário fresco e água sempre disponível são essenciais hoje.`,
      nextStep: 'Adie passeio para depois das 18h. Atenção a respiração ofegante intensa.',
      appointmentTitle: 'Emergência térmica',
    };
  }
  return {
    title: 'Frio para a raça',
    body: `${ev?.tempC ?? '?'}°C agora. ${breed ?? 'A raça'} sente frio mais que outras.`,
    nextStep: 'Roupinha em passeios curtos. Cama em local protegido de corrente de ar.',
    appointmentTitle: 'Avaliação geral',
  };
}
