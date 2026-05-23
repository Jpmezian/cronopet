import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PoopIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Ícone vetorial pra ação de cocô.
 *
 * Por que existe: Lucide não tem ícone bom pra excremento. O Sprout
 * (broto) que estávamos usando confundia usuários — feedback TestFlight
 * "ícone do cocô não faz sentido". Trocamos por esta silhueta clássica
 * de "tufo" (três ovais empilhados) que é universalmente reconhecida
 * sem precisar do emoji 💩 — emoji é proibido pelo CLAUDE.md em
 * elementos não decorativos. Renderiza com stroke pra encaixar com
 * outros ícones Lucide na mesma linha.
 */
export function PoopIcon({ size = 22, color = '#1c1917', strokeWidth = 2 }: PoopIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Tufo de baixo (largo) */}
      <Path
        d="M5 19c0-2.2 3.1-4 7-4s7 1.8 7 4-3.1 2-7 2-7 .2-7-2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Tufo do meio */}
      <Path
        d="M7 14c0-1.8 2.2-3.2 5-3.2s5 1.4 5 3.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Tufo de cima (espiral menor) */}
      <Path
        d="M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Ponta caracol */}
      <Path
        d="M11 5.5c0-.8.5-1.5 1-1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
