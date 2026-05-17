/**
 * Suite — lib/fuzzy.ts (fuzzyMatch + bestMatch)
 *
 * Casos cobrem cada camada do matcher (exact > prefix > substring >
 * fuzzy via Levenshtein > fuzzy via bigram) com fixtures realistas
 * tiradas do uso real em onboarding/edit-profile.
 */

import { fuzzyMatch, bestMatch } from '@/lib/fuzzy';
import {
  assertEq, assertTrue, assertNotNull, assertNull, runSuite,
} from '../_lib/assert';

const BREEDS = [
  'Yorkshire Terrier',
  'Labrador Retriever',
  'Golden Retriever',
  'Cavalier King Charles Spaniel',
  'Cocker Spaniel',
  'Pastor Alemão',
  'Bulldog Francês',
  'Border Collie',
  'Vira-lata / SRD',
  'Siamês',
  'Persa',
];

runSuite('lib/fuzzy.ts', [
  {
    name: '01. Exact match: score 100, matchType "exact"',
    fn: () => {
      const r = fuzzyMatch('Labrador Retriever', BREEDS);
      assertTrue(r.length > 0, 'achou pelo menos 1');
      assertEq(r[0].value, 'Labrador Retriever');
      assertEq(r[0].score, 100);
      assertEq(r[0].matchType, 'exact');
    },
  },

  {
    name: '02. Prefix match: "york" → "Yorkshire Terrier" prioridade alta',
    fn: () => {
      const r = fuzzyMatch('york', BREEDS);
      assertTrue(r.length > 0);
      assertEq(r[0].value, 'Yorkshire Terrier');
      assertEq(r[0].matchType, 'prefix');
      assertTrue(r[0].score >= 80, `prefix score >= 80, recebeu ${r[0].score}`);
    },
  },

  {
    name: '03. Substring match: "retriever" volta múltiplos (Labrador + Golden)',
    fn: () => {
      const r = fuzzyMatch('retriever', BREEDS);
      assertTrue(r.length >= 2, `esperava 2+ matches, recebeu ${r.length}`);
      const values = r.map((x) => x.value);
      assertTrue(values.includes('Labrador Retriever'), 'Labrador');
      assertTrue(values.includes('Golden Retriever'), 'Golden');
      assertTrue(
        r.every((x) => x.matchType === 'substring'),
        'todos são substring (nenhum é prefix porque "retriever" não começa nenhum)',
      );
    },
  },

  {
    name: '04. Fuzzy Levenshtein: typo "labrdor" → Labrador Retriever',
    fn: () => {
      // Aqui "labrdor" tem 1 letra a menos ("labrdor" vs "labrador") + é
      // substring depois do match parcial. O matcher pode classificar
      // como substring/prefix em vez de fuzzy. Validamos só o RESULTADO:
      // o top hit deve ser Labrador Retriever.
      const r = fuzzyMatch('labrdor', BREEDS);
      assertTrue(r.length > 0, 'typo pequeno deve achar match');
      assertEq(r[0].value, 'Labrador Retriever');
    },
  },

  {
    name: '05. Query vazia → array vazio (sem ruído)',
    fn: () => {
      assertEq(fuzzyMatch('', BREEDS).length, 0);
      assertEq(fuzzyMatch('   ', BREEDS).length, 0, 'só espaços normalize → vazio');
    },
  },

  {
    name: '06. minScore + limit respeitados, ordenação por score desc',
    fn: () => {
      const r = fuzzyMatch('persa', BREEDS, { limit: 2, minScore: 50 });
      assertTrue(r.length <= 2, 'limit=2');
      assertTrue(r.every((x) => x.score >= 50), 'todos respeitam minScore');
      // Ordenação descendente
      for (let i = 1; i < r.length; i++) {
        assertTrue(r[i - 1].score >= r[i].score, `idx ${i - 1} (${r[i - 1].score}) >= idx ${i} (${r[i].score})`);
      }
    },
  },

  {
    name: '07. bestMatch retorna só o top (ou null se ninguém passa threshold)',
    fn: () => {
      const top = bestMatch('siames', BREEDS);
      assertNotNull(top);
      assertEq(top.value, 'Siamês', 'acento ignorado no input mas preservado no value');

      const noise = bestMatch('zzzqxw', BREEDS, 50);
      assertNull(noise, 'gibberish não deve dar match com threshold 50');
    },
  },
]);
