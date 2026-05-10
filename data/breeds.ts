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
  'Pinscher Miniatura',
  'Poodle',
  'Pug',
  'Rottweiler',
  'Samojeda',
  'São Bernardo',
  'Schnauzer',
  'Shar-Pei',
  'Shih Tzu',
  'Spitz Alemão',
  'Staffordshire Bull Terrier',
  'Teckel',
  'Viralata',
  'Weimaraner',
  'Welsh Corgi Pembroke',
  'West Highland White Terrier',
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
