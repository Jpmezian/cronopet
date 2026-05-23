import React from 'react';
import { Text } from 'react-native';
import { PoopIcon } from '@/components/icons/PoopIcon';
import type { ActionKey } from '@/types/pet';

// ─── ActionIcon — fonte única de ícones por ação ───────────────
//
// Por que existe (R3-6): tínhamos emoji-strings espalhados em
// log-detail, activity-milestone, photos, history — alguns ainda
// com 💩 quando o resto do app já usa PoopIcon SVG. Esta função
// centraliza: SE for cocô → SVG custom; outros mantêm emoji nativo
// (CLAUDE.md permite emoji em ações do pet como identidade de marca).
//
// Use em qualquer lugar que precise renderizar o ícone de uma ação:
//   <ActionIcon action="coco" size={20} />
//   <ActionIcon action="comida" size={16} />
//
// Por convenção, cocô fica em cor neutra (textPrimary do tema). Pra
// outras ações o emoji já carrega a cor — não tem como customizar.

interface ActionIconProps {
  action: ActionKey;
  /** Tamanho em pt — também controla o fontSize do emoji */
  size?: number;
  /** Cor do SVG cocô (não afeta emojis). Default: '#2C2B27' graphite */
  color?: string;
  strokeWidth?: number;
}

// Emojis canônicos (CLAUDE.md: identidade de marca, intocados)
const ACTION_EMOJI: Record<Exclude<ActionKey, 'coco'>, string> = {
  comida:  '🍖',
  agua:    '💧',
  passeio: '🐾',
  xixi:    '🪣',
  banho:   '🛁',
};

export function ActionIcon({
  action,
  size = 20,
  color = '#2C2B27',
  strokeWidth = 2,
}: ActionIconProps) {
  if (action === 'coco') {
    return <PoopIcon size={size} color={color} strokeWidth={strokeWidth} />;
  }
  return (
    <Text style={{ fontSize: size }} importantForAccessibility="no">
      {ACTION_EMOJI[action]}
    </Text>
  );
}

// ACTION_ICON_COMPONENT e ActionIconBadge removidos por knip — não
// tinham caller. Podem voltar quando precisar; ALL_ACTIONS em index.tsx
// e DailyProgress importam Lucide direto, padrão atual.
