import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ActionKey } from '@/types/pet';
import { STAMP_GLYPHS, type StampGlyph } from '@/constants/stampGlyphs';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

// ─── Sizes pré-definidos (Q-A.a) ──────────────────────────────
const SIZE_PX = {
  sm: 32,
  md: 44,
  lg: 62,
  xl: 72,
} as const;

type Size = keyof typeof SIZE_PX;

// ─── Tints (modo de cor do quadrado + glyph) ─────────────────
//
// `tintL`/`tintD` → usa cor da ação (briefing 03 § Cores funcionais)
// `solid`         → quadrado na cor primária da ação, glyph branco
// `mint`/`blk`/`beige` → tokens de marca, p/ glyphs não-ação (check, sparkle)

type Tint = 'tintL' | 'tintD' | 'solid' | 'mint' | 'blk' | 'beige';

interface StampProps {
  /** Qual glifo SVG renderizar. Inclui as 7 ações + extras (check, flame, sparkle, etc). */
  glyph: StampGlyph;

  /** Tamanho do quadrado (e do glifo proporcionalmente). Default `md` (44). */
  size?: Size;

  /** Só o glifo, sem quadrado de fundo. Cor do glifo herda de `tint` ou usa `T.ink`. */
  bare?: boolean;

  /** Modo de cor do quadrado + glifo. Default depende do glyph:
   *  • Glyph de ação → 'tintL'
   *  • Glyph genérico (check/sparkle/etc) → 'mint'
   */
  tint?: Tint;

  /** Inativo (opacity reduzida). Mantém legibilidade pro user perceber estado. */
  dim?: boolean;

  /** Estilo extra do wrapper (margin, position, etc). NÃO sobrescreve bg/radius. */
  style?: ViewStyle;
}

// ─── Helpers ──────────────────────────────────────────────────

const ACTION_GLYPHS = new Set<string>([
  'comida', 'agua', 'passeio', 'xixi', 'coco', 'banho', 'tosa',
]);

function isActionGlyph(glyph: StampGlyph): glyph is ActionKey {
  return ACTION_GLYPHS.has(glyph);
}

// ─── Componente ───────────────────────────────────────────────
//
// SvgXml aceita XML cru — abstrai a montagem de tags individuais
// (<Path>, <Circle>, <Ellipse>, <Rect>) e respeita `transform` inline,
// crítico pro glifo `passeio` que usa elipses rotacionadas (R4 da
// investigação 0b).
//
// `__FG__` é substituído em tempo de render pela cor do glifo (alguns
// glifos como `check` são stroke-only e precisam de cor explícita —
// `currentColor` não é interpretado consistentemente pelo parser).

export const Stamp = React.memo(function Stamp({
  glyph,
  size = 'md',
  bare = false,
  tint,
  dim = false,
  style,
}: StampProps) {
  const T = useTheme();
  const px = SIZE_PX[size];

  // Default tint depende do tipo de glyph
  const effectiveTint: Tint = tint ?? (isActionGlyph(glyph) ? 'tintL' : 'mint');

  // Cor do quadrado + cor do glifo
  let bg: string;
  let fg: string;
  if (isActionGlyph(glyph)) {
    const a = ACTIONS_V3[glyph];
    switch (effectiveTint) {
      case 'tintL': bg = a.tintL;     fg = a.primary; break;
      case 'tintD': bg = a.tintD;     fg = a.primary; break;
      case 'solid': bg = a.primary;   fg = '#FFFFFF'; break;
      case 'mint':  bg = T.mint;      fg = T.blk;     break;
      case 'blk':   bg = T.blk;       fg = T.onBlk;   break;
      case 'beige': bg = T.beige;     fg = T.ink;     break;
    }
  } else {
    // Glifos não-ação: cor vem do token de marca direto
    // R-novo-2 (sub-fase 0c): tints específicos de ação não fazem
    // sentido sem action color — defensive warn em DEV revela uso
    // errado sem quebrar prod (fallback mint silencioso).
    if (__DEV__ && (effectiveTint === 'tintL' || effectiveTint === 'tintD' || effectiveTint === 'solid')) {
      console.warn(
        `[Stamp] tint "${effectiveTint}" inválido pra glyph "${glyph}" (não-ação) — fallback mint. ` +
        `Use 'mint' | 'blk' | 'beige' pra glyphs não-ação.`,
      );
    }
    switch (effectiveTint) {
      case 'tintL':
      case 'tintD':
      case 'solid':
        // Sem ação → trata como mint (default seguro)
        bg = T.mint; fg = T.blk; break;
      case 'mint':  bg = T.mint;  fg = T.blk;   break;
      case 'blk':   bg = T.blk;   fg = T.onBlk; break;
      case 'beige': bg = T.beige; fg = T.ink;   break;
    }
  }

  // Substitui token __FG__ por cor real (glyph `check` etc)
  const inner = STAMP_GLYPHS[glyph].replace(/__FG__/g, fg);

  // SvgXml monta o wrapper `<svg>` — fill padrão é `fg` pros paths
  // filled; stroke-only paths usam `__FG__` substituído acima.
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fg}">${inner}</svg>`;

  // Tamanho do SVG: cobre 60% do quadrado (visual respira) OU 100% se bare.
  const svgPx = bare ? px : Math.round(px * 0.6);

  if (bare) {
    return (
      <View style={[{ width: px, height: px, opacity: dim ? 0.4 : 1 }, styles.center, style]}>
        <SvgXml xml={xml} width={svgPx} height={svgPx} />
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width:           px,
          height:          px,
          backgroundColor: bg,
          // Radius proporcional (briefing 03: stamp radius = size * 0.32)
          borderRadius:    Math.round(px * 0.32),
          opacity:         dim ? 0.4 : 1,
        },
        styles.center,
        style,
      ]}
    >
      <SvgXml xml={xml} width={svgPx} height={svgPx} />
    </View>
  );
});

Stamp.displayName = 'Stamp';

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
