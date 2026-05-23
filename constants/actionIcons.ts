// ═══════════════════════════════════════════════════════════════
// ═══ Mapping centralizado: ActionKey → Lucide Icon            ═══
// ═══════════════════════════════════════════════════════════════
//
// Fonte única de verdade pro ícone semântico de cada ação do pet.
// Consumidores: ActionButton, DailyProgress, history, medical,
// log-detail, photos.
//
// Diretrizes:
// • Lucide pra consistência visual com chrome de UI
// • Exceção: cocô usa PoopIcon (SVG custom) — feedback repetido
//   TestFlight de que "Sprout não faz sentido". Esse arquivo é o
//   último callsite que ficou com Sprout — corrigido em R6-1.
// • strokeWidth padrão 2.2 nos componentes
// ═══════════════════════════════════════════════════════════════

import type { ComponentType } from 'react';
import {
  Utensils,    // comida — talher cruzado
  Droplet,     // agua   — gota única
  Footprints,  // passeio — pegadas
  Droplets,    // xixi   — gotas plurais (distinto de água)
  Bath,        // banho  — banheira
} from 'lucide-react-native';
import { PoopIcon } from '@/components/icons/PoopIcon';
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
  coco:    PoopIcon,
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
