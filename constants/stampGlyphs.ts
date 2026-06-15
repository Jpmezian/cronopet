// ═══════════════════════════════════════════════════════════════
// ═══ Stamp glyphs — paths SVG filled das 7 ações + extras    ═══
// ═══════════════════════════════════════════════════════════════
//
// Cópia LITERAL dos `STAMP_GLYPHS` em
// `docs/design/redesign-bold-v3/icons.jsx`. Cada valor é o conteúdo
// interno (`<path>`, `<circle>`, `<ellipse>`, `<rect>`) que será
// embutido num `<svg viewBox="0 0 24 24">` na renderização via
// `SvgXml` de `react-native-svg`.
//
// Por que XML cru e não path-string-list:
//   • Glifos têm misturas de `<path>`, `<circle>`, `<ellipse>`, `<rect>`
//     com `transform="rotate(...)"`. Modelar como array de paths
//     forçaria desempacotamento mais complexo no Stamp.tsx.
//   • `SvgXml` aceita XML cru direto — zero parser custom.
//   • Conteúdo é o mesmo do material-fonte; visual idêntico ao protótipo
//     HTML quando renderizado em RN @3x.
//
// Convenção:
//   • Cor de preenchimento (fill) NÃO está embutida — vem do Stamp.tsx
//     via attribute do `<svg>` wrapper (`fill={fg}`). Glifo herda.
//   • Stroke-only glifos (`check`) trazem `stroke-width`/`stroke-*` no
//     próprio `<path>` pra não depender do wrapper.
//
// Briefing: 04-fase-0-prerequisitos.md § 3.4.

export const STAMP_GLYPHS = {
  // ── 7 ações canônicas ─────────────────────────────────────────
  comida:
    '<path d="M3.4 11.5h17.2c-.15 1-.5 1.9-1 2.7l-1.2 4.3a2.2 2.2 0 0 1-2.1 1.6H7.7a2.2 2.2 0 0 1-2.1-1.6l-1.2-4.3c-.5-.8-.85-1.7-1-2.7Z"/><path d="M6 11.3a6 6 0 0 1 12 0Z"/>',
  agua:
    '<path d="M12 3c4.3 5.2 6.4 7.6 6.4 10.5a6.4 6.4 0 0 1-12.8 0C5.6 10.6 7.7 8.2 12 3Z"/>',
  passeio:
    '<ellipse cx="5.4" cy="12.2" rx="2" ry="2.7" transform="rotate(-22 5.4 12.2)"/><ellipse cx="9.7" cy="8" rx="2.15" ry="3" transform="rotate(-9 9.7 8)"/><ellipse cx="14.3" cy="8" rx="2.15" ry="3" transform="rotate(9 14.3 8)"/><ellipse cx="18.6" cy="12.2" rx="2" ry="2.7" transform="rotate(22 18.6 12.2)"/><path d="M12 12.4c-3.1 0-5.5 2.4-5.5 4.9 0 2 1.5 3.1 3.2 3.1 1.05 0 1.6-.4 2.3-.4s1.25.4 2.3.4c1.7 0 3.2-1.1 3.2-3.1 0-2.5-2.4-4.9-5.5-4.9Z"/>',
  xixi:
    '<path d="M8 4.2c2.5 3 3.7 4.5 3.7 6.1a3.7 3.7 0 0 1-7.4 0C4.3 8.7 5.5 7.2 8 4.2Z"/><path d="M16.2 11c1.7 2 2.5 3.1 2.5 4.2a2.5 2.5 0 0 1-5 0c0-1.1.8-2.2 2.5-4.2Z"/>',
  coco:
    '<path d="M12.2 3.4c.9 1.1.6 2.6-.5 3.4 1.1 0 2.8.7 2.8 2.5 1.6 0 2.9 1.1 2.9 2.5 1.6.2 2.7 1.4 2.7 2.9 0 1.8-1.6 3.1-3.6 3.1H6.1c-2 0-3.6-1.3-3.6-3.1 0-1.5 1.1-2.7 2.7-2.9 0-1.4 1.3-2.5 2.9-2.5 0-1.7 1.6-2.5 2.7-2.6-1-.8-1.2-2.3-.5-3.3Z"/>',
  banho:
    '<circle cx="11.5" cy="13.6" r="5.2"/><circle cx="17.1" cy="8" r="2.6"/><circle cx="6.9" cy="8.6" r="2"/>',
  tosa:
    '<path d="M3.5 6.4h17a1.4 1.4 0 0 1 1.4 1.4v2.3a1.4 1.4 0 0 1-1.4 1.4h-17a1.4 1.4 0 0 1-1.4-1.4V7.8A1.4 1.4 0 0 1 3.5 6.4Z"/><rect x="4.4" y="11.6" width="2.1" height="6" rx="1"/><rect x="8.2" y="11.6" width="2.1" height="6.7" rx="1"/><rect x="12" y="11.6" width="2.1" height="6" rx="1"/><rect x="15.8" y="11.6" width="2.1" height="6.7" rx="1"/>',

  // ── Extras filled / chrome ────────────────────────────────────
  flame:
    '<path d="M12 2.5c2.2 3.2 5.4 4.9 5.4 9.1A5.4 5.4 0 0 1 6.6 11.6c0-1 .3-1.9.9-2.7.3 1.1.9 1.8 1.9 2C9 8 10.3 5 12 2.5Z"/>',
  sparkle:
    '<path d="M12 2.5l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9Z"/>',
  crown:
    '<path d="M3.5 8.2l3.7 3.1L12 4.8l4.8 6.5 3.7-3.1L18.7 18H5.3Z"/><rect x="5" y="18.6" width="14" height="2.2" rx="1.1"/>',
  heart:
    '<path d="M12 20.6 4.4 12.9a4.7 4.7 0 0 1 6.7-6.6l.9.9.9-.9a4.7 4.7 0 0 1 6.7 6.6Z"/>',

  // ── Check (stroke-on-glyph, sem fill) ─────────────────────────
  // Convertido pra path único com stroke próprio: usado como overlay
  // dentro do Stamp pra marcar ações cumpridas. Cor herda do wrapper.
  check:
    '<path d="M6 12l4 4 8-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
} as const;

export type StampGlyph = keyof typeof STAMP_GLYPHS;
