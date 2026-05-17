/**
 * lib/fuzzy.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Matching tolerante a erro de digitação para autocomplete de raças.
 *
 * Estratégia em camadas (cada uma mais permissiva):
 *   1. Match exato (case + acento insensível)         → score 100
 *   2. Prefix match ("york" → "Yorkshire Terrier")    → score 80
 *   3. Substring match ("retriever" → "Labrador R…")  → score 60
 *   4. Levenshtein distance pra typos curtos          → score 40-55
 *   5. Bigram similarity pra typos médios             → score 20-40
 *
 * Usado em:
 *   - data/breeds.ts → fuzzyBreedMatches()
 *   - data/breed-conditions.ts → getBreedHealthProfile() fallback
 *
 * Por quê não usar uma lib externa: 80 raças × cada keystroke é trivial
 * pra rodar em <5ms. Sem dependência extra no bundle.
 */

/** Normaliza string: lowercase, sem acento, sem espaço duplicado */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distância de Levenshtein — número mínimo de edições (insert/delete/sub)
 * pra transformar a em b. "lavrador" → "labrador" = 1.
 *
 * Implementação iterativa O(n*m). Pra strings curtas como nome de raça
 * (max ~30 chars), é instantâneo.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[] = Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Similaridade por bigrama de Sørensen-Dice.
 * Bom pra capturar similaridade quando palavras são longas
 * e o user só errou letra(s) no meio.
 *
 * Retorna 0..1 (1 = idêntico).
 */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.substring(i, i + 2);
      out.set(bg, (out.get(bg) ?? 0) + 1);
    }
    return out;
  };

  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  let intersection = 0;
  for (const [bg, count] of aGrams) {
    const otherCount = bGrams.get(bg) ?? 0;
    intersection += Math.min(count, otherCount);
  }
  return (2 * intersection) / (a.length + b.length - 2);
}

export interface FuzzyMatch {
  /** Item original (com acento, capitalização correta) */
  value: string;
  /** Score 0..100 (alto = melhor match) */
  score: number;
  /** Tipo de match — útil pra UI mostrar "Você quis dizer?" vs autocompletar direto */
  matchType: 'exact' | 'prefix' | 'substring' | 'fuzzy';
}

/**
 * Busca os melhores matches numa lista, em ordem de score decrescente.
 *
 * @param query    O que o usuário digitou
 * @param choices  Lista de strings candidatas (ex: DOG_BREEDS)
 * @param opts.limit         Quantos resultados retornar (default 5)
 * @param opts.minScore      Score mínimo pra incluir (default 30)
 * @param opts.includeExact  Se false, exclui matches exatos (default true)
 *
 * Comportamento:
 *  - Query vazia → retorna [] (não sugere nada)
 *  - Query <2 chars → só faz prefix match (evita ruído)
 *  - Sempre normaliza antes de comparar
 */
export function fuzzyMatch(
  query: string,
  choices: string[],
  opts: { limit?: number; minScore?: number; includeExact?: boolean } = {},
): FuzzyMatch[] {
  const { limit = 5, minScore = 30, includeExact = true } = opts;
  const q = normalize(query);
  if (!q) return [];

  const results: FuzzyMatch[] = [];

  for (const value of choices) {
    const candidate = normalize(value);
    let score = 0;
    let matchType: FuzzyMatch['matchType'] = 'fuzzy';

    if (candidate === q) {
      score = 100;
      matchType = 'exact';
    } else if (candidate.startsWith(q)) {
      // "york" → "yorkshire terrier" — prioridade alta
      score = 80 + Math.max(0, 15 - (candidate.length - q.length));
      matchType = 'prefix';
    } else if (candidate.includes(q) && q.length >= 3) {
      // "retriever" → "labrador retriever"
      score = 60 + Math.max(0, 10 - Math.abs(candidate.length - q.length));
      matchType = 'substring';
    } else if (q.length >= 3) {
      // Levenshtein pra typos
      const dist = levenshtein(q, candidate);
      const maxLen = Math.max(q.length, candidate.length);
      const editRatio = dist / maxLen;

      if (editRatio <= 0.25) {
        // <=25% das letras erradas: provável typo
        score = Math.round(55 - editRatio * 100);
        matchType = 'fuzzy';
      } else {
        // Última chance: bigram pra match parcial em palavras longas
        const sim = bigramSimilarity(q, candidate);
        if (sim >= 0.4) {
          score = Math.round(20 + sim * 25);
          matchType = 'fuzzy';
        }
      }
    }

    if (score >= minScore && (includeExact || matchType !== 'exact')) {
      results.push({ value, score, matchType });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Retorna apenas o melhor match (ou null se ninguém passa o threshold).
 * Útil pra "auto-corrigir" um valor desconhecido.
 */
export function bestMatch(
  query: string,
  choices: string[],
  minScore: number = 50,
): FuzzyMatch | null {
  const results = fuzzyMatch(query, choices, { limit: 1, minScore });
  return results[0] ?? null;
}
