// ═══════════════════════════════════════════════════════════════
// ═══ Mapping centralizado: ActionKey → Lucide Icon            ═══
// ═══════════════════════════════════════════════════════════════
//
// Migração 2026-05-15: emojis foram removidos de toda UI por
// decisão de marca (ver CLAUDE.md atualizado). Este arquivo é a
// fonte única de verdade para o ícone semântico de cada ação do
// pet — usado em ActionButton, DailyProgress, history, medical,
// log-detail, photos, etc.
//
// Diretrizes:
// • Sempre Lucide (consistência visual com chrome de UI)
// • Semântica clara, sem pictograma vulgar (cocô = Sprout, broto
//   enrolado, abstrato e fofo)
// • strokeWidth padrão 2.2 nos componentes
// ═══════════════════════════════════════════════════════════════

import type { ComponentType } from 'react';
import {
  Utensils,    // comida — talher cruzado
  Droplet,     // agua   — gota única
  Footprints,  // passeio — pegadas
  Droplets,    // xixi   — gotas plurais (distinto de água)
  Sprout,      // coco   — broto enrolado, abstrato
  Bath,        // banho  — banheira
} from 'lucide-react-native';
import type { ActionKey } from '@/types/pet';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const ACTION_ICON: Record<ActionKey, ComponentType<IconProps>> = {
  comida:  Utensils,
  agua:    Droplet,
  passeio: Footprints,
  xixi:    Droplets,
  coco:    Sprout,
  banho:   Bath,
};

export const ACTION_LABEL: Record<ActionKey, string> = {
  comida:  'Comida',
  agua:    'Água',
  passeio: 'Passeio',
  xixi:    'Xixi',
  coco:    'Cocô',
  banho:   'Banho',
};
