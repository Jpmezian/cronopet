// ─── Listas de raças conhecidas ───────────────────────────────
// Usadas no autocomplete de onboarding e edição de perfil.
// Se o usuário digitar algo fora desta lista, o valor é salvo
// como digitado para exibição, mas categorizado como "Outro"
// nos dados analíticos futuros.

export const DOG_BREEDS: string[] = [
  'Affenpinscher',
  'Akita',
  'American Bully',
  'American Pit Bull Terrier',
  'American Staffordshire Terrier',
  'Australian Shepherd',
  'Basset Hound',
  'Beagle',
  'Bernese Mountain Dog',
  'Bichon Frisé',
  'Border Collie',
  'Boston Terrier',
  'Boxer',
  'Buldogue Francês',
  'Buldogue Inglês',
  'Bull Terrier',
  'Bullmastiff',
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
  'Golden Retriever',
  'Gran Danês',
  'Greyhound',
  'Husky Siberiano',
  'Jack Russell Terrier',
  'Labrador Retriever',
  'Lhasa Apso',
  'Lulu da Pomerânia',
  'Malamute do Alasca',
  'Maltês',
  'Mastim Inglês',
  'Mastim Napolitano',
  'Mastim Tibetano',
  'Pastor Belga Malinois',
  'Pinscher Miniatura',
  'Poodle',
  'Pug',
  'Rottweiler',
  'Samojeda',
  'São Bernardo',
  'Schnauzer',
  'Setter Irlandês',
  'Shar-Pei',
  'Shiba Inu',
  'Shih Tzu',
  'Spitz Alemão',
  'Staffordshire Bull Terrier',
  'Teckel',
  'Viralata',
  'Weimaraner',
  'Welsh Corgi Pembroke',
  'West Highland White Terrier',
  'Whippet',
  'Yorkshire Terrier',
];

export const CAT_BREEDS: string[] = [
  'Abissínio',
  'American Shorthair',
  'Angora Turco',
  'Bengal',
  'Birmanês',
  'British Shorthair',
  'Burmês',
  'Devon Rex',
  'Exótico de Pelo Curto',
  'Himalaio',
  'Maine Coon',
  'Manx',
  'Norueguês da Floresta',
  'Persa',
  'Ragdoll',
  'Russian Blue',
  'Scottish Fold',
  'Serengeti',
  'Siamês',
  'Singapura',
  'Sphynx',
  'Tonquinês',
  'Vira-lata',
];

/** Retorna a lista de raças filtrada pelo tipo do pet */
export function breedsForType(tipo: 'cachorro' | 'gato' | 'outro'): string[] {
  if (tipo === 'cachorro') return DOG_BREEDS;
  if (tipo === 'gato') return CAT_BREEDS;
  return [];
}

/** Verifica se uma raça digitada pertence à lista conhecida */
export function isKnownBreed(raca: string, tipo: 'cachorro' | 'gato' | 'outro'): boolean {
  const list = breedsForType(tipo);
  return list.some((b) => b.toLowerCase() === raca.trim().toLowerCase());
}

import { fuzzyMatch, bestMatch as fuzzyBest, type FuzzyMatch } from '@/lib/fuzzy';

/**
 * Sugestões inteligentes pra autocomplete — tolerante a typos, acentos,
 * matches parciais e ordem de palavras.
 *
 * Substitui o `.includes()` simples do onboarding/edit-profile.
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
  return fuzzyMatch(query, breedsForType(tipo), { limit });
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
  const match = fuzzyBest(raca, breedsForType(tipo), 60);
  return match ? match.value : null;
}
