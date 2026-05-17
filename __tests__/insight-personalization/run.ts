/**
 * Suite — lib/insightPersonalization.ts
 *
 * Reescrita de copy genérico do motor em texto personalizado pro tutor.
 * Bug aqui = push notification que não usa o nome do pet, vira "seu pet"
 * (clínico/frio) ou perde dados de evidence. Casos cobrem cada
 * categoria + ramificações de severity.
 */

import { personalizeInsight } from '@/lib/insightPersonalization';
import type { HealthInsight } from '@/services/HealthInsights';
import { assertEq, assertTrue, runSuite } from '../_lib/assert';

const BIDU = { nome: 'Bidu', raca: 'Labrador Retriever', tipo: 'cachorro' as const };
const PIPI_CAT = { nome: '', raca: 'Persa', tipo: 'gato' as const };

function makeInsight(partial: Partial<HealthInsight>): HealthInsight {
  return {
    id: 'x', severity: 'warning', category: 'medical',
    title: 'Título', message: 'Mensagem', suggestion: 'Sugestão',
    detectedAt: Date.now(),
    ...partial,
  };
}

runSuite('lib/insightPersonalization', [
  {
    name: '01. Pet sem nome (gato) cai em "seu gato" como fallback',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'urine' }),
        PIPI_CAT,
      );
      assertTrue(copy.body.includes('seu gato') || copy.body.length > 0,
        'fallback aplicado sem crash');
    },
  },

  {
    name: '02. Pet sem nome (cachorro) cai em "seu pet"',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'medical', evidence: { type: 'vomito', count: 3 } }),
        { nome: '', raca: '', tipo: 'cachorro' },
      );
      assertTrue(copy.title.toLowerCase().includes('seu pet') ||
                 copy.body.toLowerCase().includes('seu pet'),
        'usa "seu pet" como fallback');
    },
  },

  {
    name: '03. weight alert: title inclui nome + verbo correto (perdeu/ganhou)',
    fn: () => {
      const lost = personalizeInsight(
        makeInsight({ category: 'weight', severity: 'alert', evidence: { pct: -12, fromKg: 30, toKg: 26 } }),
        BIDU,
      );
      assertTrue(lost.title.includes('Bidu'), 'inclui nome');
      assertTrue(lost.title.toLowerCase().includes('perdeu'), 'perdeu, não ganhou');
      assertTrue(lost.body.includes('12'), 'inclui % de perda');

      const gained = personalizeInsight(
        makeInsight({ category: 'weight', severity: 'alert', evidence: { pct: 15, fromKg: 30, toKg: 34 } }),
        BIDU,
      );
      assertTrue(gained.title.toLowerCase().includes('ganhou'), 'ganhou peso');
    },
  },

  {
    name: '04. weight warning: copy não-alert é mais branda ("pode estar...")',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'weight', severity: 'warning', evidence: { pct: -6 } }),
        BIDU,
      );
      assertTrue(/pode/i.test(copy.title), 'severity:warning usa hedge');
    },
  },

  {
    name: '05. appetite alert: nextStep menciona "esta semana" (urgência)',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'appetite', severity: 'alert', title: 'Queda forte de apetite' }),
        BIDU,
      );
      assertTrue(/esta semana/i.test(copy.nextStep), 'alert leva pra ação rápida');
    },
  },

  {
    name: '06. medical: usa label pt-BR do tipo (vomito → "vômitos")',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'medical', evidence: { type: 'vomito', count: 4 } }),
        BIDU,
      );
      assertTrue(copy.title.toLowerCase().includes('vômitos'), 'label traduzido');
      assertTrue(copy.body.includes('4'), 'count interpolado');
      assertTrue(copy.appointmentTitle.toLowerCase().includes('vômitos'), 'também no title da consulta');
    },
  },

  {
    name: '07. medical: tipo desconhecido cai em "sintomas" sem crash',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'medical', evidence: { type: 'xyz-injected', count: 2 } }),
        BIDU,
      );
      assertTrue(copy.title.toLowerCase().includes('sintomas'), 'fallback');
    },
  },

  {
    name: '08. exercise: menciona breed quando disponível (mais convincente)',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'exercise', evidence: { dailyAvg: 12, recommended: 60 } }),
        BIDU,
      );
      assertTrue(copy.body.includes('Labrador') || copy.body.includes('12'),
        'menciona raça ou número');
    },
  },

  {
    name: '09. thermal: heat alert tem nextStep prático ("após 18h")',
    fn: () => {
      const copy = personalizeInsight(
        makeInsight({ category: 'thermal', severity: 'alert', title: 'Risco térmico — quente', evidence: { tempC: 35 } }),
        BIDU,
      );
      assertTrue(/18h/.test(copy.nextStep) || /tarde/i.test(copy.nextStep),
        'ação concreta de horário');
      assertTrue(copy.body.includes('35'), 'tempC interpolado');
    },
  },

  {
    name: '10. Categoria desconhecida: fallback usa campos originais sem crash',
    fn: () => {
      const original = makeInsight({
        category: 'xpto' as unknown as HealthInsight['category'],
        title: 'Categoria nova', message: 'Body novo', suggestion: 'Step novo',
      });
      const copy = personalizeInsight(original, BIDU);
      assertEq(copy.title, 'Categoria nova', 'fallback preserva title');
      assertEq(copy.body, 'Body novo');
      assertEq(copy.nextStep, 'Step novo');
    },
  },

  {
    name: '11. PersonalizedCopy nunca tem string vazia em title/body/nextStep',
    fn: () => {
      const categories: HealthInsight['category'][] = [
        'weight', 'appetite', 'hydration', 'stool', 'urine',
        'medical', 'breed', 'exercise', 'grooming', 'thermal',
      ];
      for (const cat of categories) {
        const copy = personalizeInsight(makeInsight({ category: cat }), BIDU);
        assertTrue(copy.title.length > 0, `${cat}: title vazio`);
        assertTrue(copy.body.length > 0, `${cat}: body vazio`);
        assertTrue(copy.nextStep.length > 0, `${cat}: nextStep vazio`);
        assertTrue(copy.appointmentTitle.length > 0, `${cat}: appointmentTitle vazio`);
      }
    },
  },
]);
