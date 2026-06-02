// ─── Listas de raças conhecidas ───────────────────────────────
// Source-of-truth pra BreedPickerField + autocomplete legado.
// Cada string aqui DEVE bater com a chave usada em `data/breed-meta.ts`,
// `data/breed-conditions.ts` e `data/estimateWeight.ts` — caso contrário
// o lookup retorna fallback genérico (pet sem predisposições raciais).
//
// Mudanças 2026-06-02 (sprint UX-F1):
//   - SRD (Sem Raça Definida) virou primeiro item de cão E gato.
//     Lookup retorna fallback (não há predisposições atribuídas a SRD).
//   - "Viralata" (sem hífen) removido da lista de cães — pets com esse
//     raca legado são migrados pra "SRD" via usePetStore.hydrateFromCloud.
//   - "Vira-lata" (com hífen) idem nos gatos.
//   - "Teckel" consolidado em "Dachshund" (sinônimo — meta key "Dachshund").
//   - Adicionadas: Welsh Corgi (Cardigan), Schnauzer Gigante/Médio/
//     Miniatura, Bolonhês, Buldogue Americano, Galgo, Papillon, Pequinês,
//     Pastor Australiano, Pastor Belga, Pastor de Shetland, Podengo,
//     Rhodesian Ridgeback, Spitz Japonês, Vira-lata Caramelo, e ~13
//     outras (lista cresceu de 62 → ~85 cães e 23 → ~40 gatos).
//   - "Outro" no fim — sentinela pra triggerar TextInput livre na UI.

/** Sentinela "Sem Raça Definida" — primeira opção sempre. */
export const SRD = 'SRD';

/** Sentinela "Outro" — última opção em cão/gato. Quando o user toca,
 *  o BreedPickerField abre um campo de texto livre como fallback. */
export const OTHER = 'Outro';

const DOG_BREEDS: string[] = [
  SRD,
  'Affenpinscher',
  'Akita',
  'American Bully',
  'American Pit Bull Terrier',
  'American Staffordshire Terrier',
  'Australian Cattle Dog',
  'Australian Shepherd',
  'Basenji',
  'Basset Hound',
  'Beagle',
  'Bearded Collie',
  'Bernese Mountain Dog',
  'Bichon Frisé',
  'Bloodhound',
  'Bolonhês',
  'Border Collie',
  'Borzoi',
  'Boston Terrier',
  'Boxer',
  'Buldogue Americano',
  'Buldogue Francês',
  'Buldogue Inglês',
  'Bull Terrier',
  'Bullmastiff',
  'Cairn Terrier',
  'Cane Corso',
  'Cavalier King Charles Spaniel',
  'Chihuahua',
  'Chow-Chow',
  'Cocker Spaniel',
  'Collie',
  'Dachshund',
  'Dálmata',
  'Dobermann',
  'Dogo Argentino',
  'Fila Brasileiro',
  'Fox Terrier',
  'Galgo',
  'Golden Retriever',
  'Gran Danês',
  'Greyhound',
  'Husky Siberiano',
  'Jack Russell Terrier',
  'Komondor',
  'Labrador Retriever',
  'Lhasa Apso',
  'Lulu da Pomerânia',
  'Malamute do Alasca',
  'Maltês',
  'Mastim Inglês',
  'Mastim Napolitano',
  'Mastim Tibetano',
  'Newfoundland',
  'Old English Sheepdog',
  'Papillon',
  'Pastor Alemão',
  'Pastor Australiano',
  'Pastor Belga',
  'Pastor Belga Malinois',
  'Pastor de Shetland',
  'Pequinês',
  'Pinscher Miniatura',
  'Podengo',
  'Poodle',
  'Pug',
  'Rhodesian Ridgeback',
  'Rottweiler',
  'Samojeda',
  'Schnauzer',
  'Schnauzer Gigante',
  'Schnauzer Médio',
  'Schnauzer Miniatura',
  'Setter Irlandês',
  'Shar-Pei',
  'Shiba Inu',
  'Shih Tzu',
  'São Bernardo',
  'Spitz Alemão',
  'Spitz Japonês',
  'Staffordshire Bull Terrier',
  'Vira-lata Caramelo',
  'Weimaraner',
  'Welsh Corgi Cardigan',
  'Welsh Corgi Pembroke',
  'West Highland White Terrier',
  'Whippet',
  'Yorkshire Terrier',
  OTHER,
];

const CAT_BREEDS: string[] = [
  SRD,
  'Abissínio',
  'American Curl',
  'American Shorthair',
  'Angora Turco',
  'Bengal',
  'Birmanês',
  'Bombay',
  'British Longhair',
  'British Shorthair',
  'Burmês',
  'Cornish Rex',
  'Devon Rex',
  'Egyptian Mau',
  'Exótico de Pelo Curto',
  'Himalaio',
  'Japanese Bobtail',
  'Korat',
  'LaPerm',
  'Maine Coon',
  'Manx',
  'Munchkin',
  'Norueguês da Floresta',
  'Ocicat',
  'Oriental Shorthair',
  'Persa',
  'Pixie-Bob',
  'Ragdoll',
  'Russian Blue',
  'Sagrado da Birmânia',
  'Savannah',
  'Scottish Fold',
  'Selkirk Rex',
  'Serengeti',
  'Siamês',
  'Siberiano',
  'Singapura',
  'Snowshoe',
  'Somali',
  'Sphynx',
  'Tonquinês',
  'Turkish Van',
  OTHER,
];

/** Raças legadas que devem ser migradas pra SRD via store. */
export const LEGACY_SRD_BREEDS: readonly string[] = ['Viralata', 'Vira-lata'];

/** Retorna a lista de raças filtrada pelo tipo do pet. Pra 'outro',
 *  retorna vazio — a UI deve renderizar TextInput livre direto. */
export function breedsForType(tipo: 'cachorro' | 'gato' | 'outro'): string[] {
  if (tipo === 'cachorro') return DOG_BREEDS;
  if (tipo === 'gato') return CAT_BREEDS;
  return [];
}

import { fuzzyMatch, bestMatch as fuzzyBest, type FuzzyMatch } from '@/lib/fuzzy';

/**
 * Sugestões inteligentes pra autocomplete — tolerante a typos, acentos,
 * matches parciais e ordem de palavras. Mantida pra retrocompat (antes
 * do BreedPickerField); novos callers devem usar o picker em vez disso.
 *
 * Filtra SRD e Outro das sugestões — só raças "reais" aparecem como autocomplete.
 *
 * @example
 *   fuzzyBreeds("lavrador", "cachorro") → [{value: "Labrador Retriever", score: 50, matchType: "fuzzy"}]
 *   fuzzyBreeds("york", "cachorro") → [{value: "Yorkshire Terrier", score: 91, matchType: "prefix"}]
 *   fuzzyBreeds("siames", "gato") → [{value: "Siamês", score: 100, matchType: "exact"}]
 */
export function fuzzyBreeds(
  query: string,
  tipo: 'cachorro' | 'gato' | 'outro',
  limit: number = 5,
): FuzzyMatch[] {
  const pool = breedsForType(tipo).filter((b) => b !== SRD && b !== OTHER);
  return fuzzyMatch(query, pool, { limit });
}

/**
 * Tenta normalizar uma raça digitada errada para a forma canônica.
 * Usado quando o tutor finaliza o input — se ele digitou "Lavrador",
 * salva como "Labrador Retriever".
 *
 * Retorna null se nenhum match passou do threshold de confiança.
 */
export function canonicalizeBreed(
  raca: string,
  tipo: 'cachorro' | 'gato' | 'outro',
): string | null {
  if (!raca.trim()) return null;
  const pool = breedsForType(tipo).filter((b) => b !== SRD && b !== OTHER);
  const match = fuzzyBest(raca, pool, 60);
  return match ? match.value : null;
}
