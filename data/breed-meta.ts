// ─── Metadata de raças ────────────────────────────────────────
// Mapeia raças conhecidas para porte (size) para uso em:
// - Estimativa de calorias (senior threshold varia por porte)
// - Recomendação de rações (filtro por tamanho)
//
// Arquivo separado de `data/breeds.ts` (que é só lista de strings
// para autocomplete). Se a raça não estiver mapeada, fallback = 'medium'.

import type { PetType, PetSize } from '@/types/pet';

// Raças canônicas → porte oficial
export const DOG_BREED_SIZES: Record<string, PetSize> = {
  // ── Pequeno (< 10 kg) ────────────────────
  'Affenpinscher':                  'small',
  'Bichon Frisé':                   'small',
  'Cavalier King Charles Spaniel':  'small',
  'Chihuahua':                      'small',
  'Dachshund':                      'small',
  'Fox Terrier':                    'small',
  'Jack Russell Terrier':           'small',
  'Lhasa Apso':                     'small',
  'Lulu da Pomerânia':              'small',
  'Maltês':                         'small',
  'Pinscher Miniatura':             'small',
  'Poodle':                         'small',
  'Pug':                            'small',
  'Shih Tzu':                       'small',
  'Spitz Alemão':                   'small',
  'Teckel':                         'small',
  'West Highland White Terrier':    'small',
  'Yorkshire Terrier':              'small',

  // ── Médio (10-25 kg) ─────────────────────
  'American Bully':                 'medium',
  'American Pit Bull Terrier':      'medium',
  'American Staffordshire Terrier': 'medium',
  'Basset Hound':                   'medium',
  'Beagle':                         'medium',
  'Border Collie':                  'medium',
  'Boston Terrier':                 'medium',
  'Buldogue Francês':               'medium',
  'Buldogue Inglês':                'medium',
  'Bull Terrier':                   'medium',
  'Cocker Spaniel':                 'medium',
  'Chow-Chow':                      'medium',
  'Dálmata':                        'medium',
  'Schnauzer':                      'medium',
  'Shar-Pei':                       'medium',
  'Staffordshire Bull Terrier':     'medium',
  'Welsh Corgi Pembroke':           'medium',
  'Viralata':                       'medium',

  // ── Grande (25-45 kg) ────────────────────
  'Akita':                          'large',
  'Boxer':                          'large',
  'Dobermann':                      'large',
  'Dogo Argentino':                 'large',
  'Fila Brasileiro':                'large',
  'Golden Retriever':               'large',
  'Greyhound':                      'large',
  'Husky Siberiano':                'large',
  'Labrador Retriever':             'large',
  'Malamute do Alasca':             'large',
  'Pastor Alemão':                  'large',
  'Rottweiler':                     'large',
  'Samojeda':                       'large',
  'Weimaraner':                     'large',

  // ── Gigante (> 45 kg) ────────────────────
  'Bernese Mountain Dog':           'giant',
  'Bullmastiff':                    'giant',
  'Cane Corso':                     'giant',
  'Gran Danês':                     'giant',
  'Mastim Inglês':                  'giant',
  'Mastim Napolitano':              'giant',
  'Mastim Tibetano':                'giant',
  'São Bernardo':                   'giant',
};

/**
 * Retorna o porte da raça. Gato sempre retorna 'small' (categoria
 * irrelevante para recomendação de ração felina).
 * Se raça não mapeada (incluindo vira-lata), retorna 'medium' como
 * fallback razoável. Usuário pode override na tela de nutrição.
 */
export function getBreedSize(raca: string, tipo: PetType): PetSize {
  if (tipo === 'gato') return 'small';
  if (!raca) return 'medium';

  const needle = raca.trim().toLowerCase();

  // Busca exata case-insensitive
  for (const [breed, size] of Object.entries(DOG_BREED_SIZES)) {
    if (breed.toLowerCase() === needle) return size;
  }

  // Busca parcial (ex: "Labrador" → "Labrador Retriever")
  for (const [breed, size] of Object.entries(DOG_BREED_SIZES)) {
    if (
      needle.includes(breed.toLowerCase()) ||
      breed.toLowerCase().includes(needle)
    ) {
      return size;
    }
  }

  return 'medium';
}

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  small:  'Pequeno',
  medium: 'Médio',
  large:  'Grande',
  giant:  'Gigante',
};

export const PET_SIZE_WEIGHT_RANGE: Record<PetSize, string> = {
  small:  'até 10 kg',
  medium: '10 a 25 kg',
  large:  '25 a 45 kg',
  giant:  'acima de 45 kg',
};
