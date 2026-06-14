// icons.jsx — Lucide-style stroke icons for CronoPet redesign.
// Single <Icon name=... size=... color=... strokeWidth=... /> component.
// All 24×24 viewBox, round caps/joins. No emoji — matches app icon language.

const ICON_PATHS = {
  // ── Navegação ──
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="18" y="13" width="0.01" height="0.01"/><rect x="18" y="9" width="3" height="8" rx="1"/>',
  heartPulse: '<path d="M20.4 5.6a5.5 5.5 0 0 0-8.4.7 5.5 5.5 0 0 0-8.4-.7c-2.2 2.2-2.1 5.7.2 8L12 21l8.2-7.4c2.3-2.3 2.4-5.8.2-8Z"/><path d="M3.5 13h4l1.5-3 2.5 6 2-4 1.2 1H20"/>',
  // ── Ações do pet ──
  utensils: '<path d="M4 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3"/><path d="M6 12v9"/><path d="M16 3c-1.5 0-3 1.8-3 5 0 2.4 1 3.5 2 4v9"/>',
  droplet: '<path d="M12 3.5c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10Z"/>',
  droplets: '<path d="M8 2.7c1.6 2.2 3.2 3.6 3.2 5.5A3.2 3.2 0 0 1 8 11.4 3.2 3.2 0 0 1 4.8 8.2C4.8 6.3 6.4 4.9 8 2.7Z"/><path d="M16 9c1.8 2.4 3.5 4 3.5 6.2A3.5 3.5 0 0 1 16 18.7a3.5 3.5 0 0 1-3.5-3.5C12.5 13 14.2 11.4 16 9Z"/>',
  footprints: '<path d="M5 16c0-1.5-.5-2-.5-3.5C4.5 11 5.3 10 6.5 10S8.5 11 8.5 12.5C8.5 14 8 14.5 8 16c0 1.2-.6 2-1.5 2S5 17.2 5 16Z"/><path d="M15.5 11c0-1.5-.5-2-.5-3.5C15 6 15.8 5 17 5s2 1 2 2.5c0 1.5-.5 2-.5 3.5 0 1.2-.6 2-1.5 2s-1.5-.8-1.5-2Z"/><path d="M5 20.5h3.5"/><path d="M15.5 15.5H19"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M5 12V6a2 2 0 0 1 2-2c1 0 1.5.5 2 1"/><path d="M8.5 6.5 7 5"/><path d="M6 19l-1 2"/><path d="M18 19l1 2"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 18"/><path d="M8 16.5 20 6"/>',
  poop: '<path d="M12 4c.8 1 .5 2.4-.4 3 .9.1 2.4.7 2.4 2.3 1.4 0 2.6 1 2.6 2.3 1.4.2 2.4 1.3 2.4 2.6 0 1.6-1.4 2.8-3.2 2.8H6.2C4.4 19 3 17.8 3 16.2c0-1.3 1-2.4 2.4-2.6 0-1.3 1.2-2.3 2.6-2.3 0-1.5 1.4-2.2 2.3-2.3-.8-.7-1-2-.3-3Z"/>',
  // ── Estado / feedback ──
  flame: '<path d="M12 3c2 3 5 4.5 5 8.5A5 5 0 0 1 7 11.5c0-1.2.4-2.2 1-3 .2 1 .8 1.6 1.6 1.8C9.2 7.5 10.4 5 12 3Z"/>',
  check: '<path d="M5 12.5 10 17 19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2 11 15l5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  chevronDown: '<path d="M5 9l7 7 7-7"/>',
  arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.5 1.5 0 0 0 .3 1.6l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-2.5 1V19a2 2 0 1 1-4 0v-.1a1.5 1.5 0 0 0-2.5-1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0-1-2.5H5a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1-2.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 2.5-1V5a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 2.5 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.6Z"/>',
  scale: '<path d="M12 3v3"/><path d="M7 6h10l3 6a4 4 0 0 1-8 0Z" transform="translate(-5 0)"/><path d="M17 6l3 6a4 4 0 0 1-8 0Z"/><path d="M3 12a4 4 0 0 0 8 0L8 6"/><path d="M6 21h12"/><path d="M12 6v15"/>',
  weight: '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M9 6a3 3 0 0 1 6 0"/><path d="M8.5 13.5 12 11l3.5 2.5"/>',
  syringe: '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3a2 2 0 0 1-2.8 0l-1.2-1.2a2 2 0 0 1 0-2.8L15 5"/><path d="m9 11 2 2"/><path d="m13 7 2 2"/><path d="M5 16l-2.5 2.5"/>',
  stethoscope: '<path d="M5 3v5a4 4 0 0 0 8 0V3"/><path d="M5 3H4M13 3h-1"/><path d="M9 16v1a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="13" r="2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9.5h18"/><path d="M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.2A5.5 5.5 0 0 1 20.5 19"/>',
  camera: '<path d="M4 8.5h2.5L8 6h8l1.5 2.5H20a1 1 0 0 1 1 1V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.2"/>',
  paw: '<circle cx="6.5" cy="11" r="2"/><circle cx="11" cy="7" r="2"/><circle cx="17.5" cy="11" r="2"/><circle cx="14.5" cy="6.5" r="1.6"/><path d="M9 14.5c-1.6 1-2.4 2.3-2.4 3.6A2.4 2.4 0 0 0 9 20.4c.9 0 1.6-.4 3-.4s2.1.4 3 .4a2.4 2.4 0 0 0 2.4-2.3c0-1.3-.9-2.6-2.5-3.6-1-.7-1.8-1.2-2.9-1.2s-1.9.5-3 1.2Z"/>',
  dog: '<path d="M10 5.2 8.5 4A2 2 0 0 0 5 5.4V9"/><path d="M14 5.2 15.5 4A2 2 0 0 1 19 5.4V9"/><path d="M5 8.5C5 7 6 6.2 7.2 6.5L12 7.7l4.8-1.2C18 6.2 19 7 19 8.5v3.2a7 7 0 0 1-14 0Z"/><path d="M9 12h.01M15 12h.01"/><path d="M11 15.5a1.5 1 0 0 0 2 0"/><path d="M7 20v-3M17 20v-3"/>',
  cat: '<path d="M4 4.5 6.5 8h11L20 4.5V12a8 8 0 0 1-16 0Z"/><path d="M9 12h.01M15 12h.01"/><path d="M12 14.5v1.5"/><path d="M10.5 17 12 16l1.5 1"/><path d="M7 15l-3 1M17 15l3 1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  faceId: '<path d="M5 8.5V7a2 2 0 0 1 2-2h1.5M15.5 5H17a2 2 0 0 1 2 2v1.5M19 15.5V17a2 2 0 0 1-2 2h-1.5M8.5 19H7a2 2 0 0 1-2-2v-1.5"/><path d="M9 10v1.5M15 10v1.5M12 10v3l-1 .8"/><path d="M9.5 15.5a3.5 2 0 0 0 5 0"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M18.5 4.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z"/>',
  crown: '<path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10H5.5Z"/><path d="M5.5 18h13"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="M9 12l2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  trendingUp: '<path d="M3 16l5-5 4 4 7-7"/><path d="M16 8h3v3"/>',
  trendingDown: '<path d="M3 8l5 5 4-4 7 7"/><path d="M16 16h3v-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M12 3v3"/><path d="M9.5 4.5 12 6l2.5-1.5"/>',
  bone: '<path d="M5 9a2.2 2.2 0 1 1 2.6-3.2A2.2 2.2 0 1 1 10.5 8L13.5 11l2.4-2.4A2.2 2.2 0 1 1 18.5 5.6 2.2 2.2 0 1 1 15.6 8.5L13 11"/><path d="m11 13-2.4 2.4A2.2 2.2 0 1 1 5.5 18.4 2.2 2.2 0 1 1 8.4 15.5L11 13"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/>',
  fileText: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  logout: '<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 16l4-4-4-4"/><path d="M20 12H9"/>',
  alert: '<path d="M12 3 2.5 19.5h19Z"/><path d="M12 9v5M12 17h.01"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9Z"/>',
  heart: '<path d="M12 20.4 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"/>',
  ruler: '<rect x="3" y="7" width="18" height="10" rx="2" transform="rotate(0)"/><path d="M7 7v3M11 7v4M15 7v3M19 7v4"/>',
  activity: '<path d="M3 12h4l2.5-7 5 14 2.5-7H21"/>',
  zap: '<path d="M13 2 4 13h6l-1 9 9-11h-6Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
};

function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 2, fill = 'none', style }) {
  const inner = ICON_PATHS[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={style} dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Bespoke filled "selo" (stamp) glyphs — chunky, ownable, no thin lines.
// Used for the 7 pet actions + logo mark.
// ─────────────────────────────────────────────────────────────
const STAMP_GLYPHS = {
  comida:  '<path d="M3.4 11.5h17.2c-.15 1-.5 1.9-1 2.7l-1.2 4.3a2.2 2.2 0 0 1-2.1 1.6H7.7a2.2 2.2 0 0 1-2.1-1.6l-1.2-4.3c-.5-.8-.85-1.7-1-2.7Z"/><path d="M6 11.3a6 6 0 0 1 12 0Z"/>',
  agua:    '<path d="M12 3c4.3 5.2 6.4 7.6 6.4 10.5a6.4 6.4 0 0 1-12.8 0C5.6 10.6 7.7 8.2 12 3Z"/>',
  passeio: '<ellipse cx="5.4" cy="12.2" rx="2" ry="2.7" transform="rotate(-22 5.4 12.2)"/><ellipse cx="9.7" cy="8" rx="2.15" ry="3" transform="rotate(-9 9.7 8)"/><ellipse cx="14.3" cy="8" rx="2.15" ry="3" transform="rotate(9 14.3 8)"/><ellipse cx="18.6" cy="12.2" rx="2" ry="2.7" transform="rotate(22 18.6 12.2)"/><path d="M12 12.4c-3.1 0-5.5 2.4-5.5 4.9 0 2 1.5 3.1 3.2 3.1 1.05 0 1.6-.4 2.3-.4s1.25.4 2.3.4c1.7 0 3.2-1.1 3.2-3.1 0-2.5-2.4-4.9-5.5-4.9Z"/>',
  xixi:    '<path d="M8 4.2c2.5 3 3.7 4.5 3.7 6.1a3.7 3.7 0 0 1-7.4 0C4.3 8.7 5.5 7.2 8 4.2Z"/><path d="M16.2 11c1.7 2 2.5 3.1 2.5 4.2a2.5 2.5 0 0 1-5 0c0-1.1.8-2.2 2.5-4.2Z"/>',
  coco:    '<path d="M12.2 3.4c.9 1.1.6 2.6-.5 3.4 1.1 0 2.8.7 2.8 2.5 1.6 0 2.9 1.1 2.9 2.5 1.6.2 2.7 1.4 2.7 2.9 0 1.8-1.6 3.1-3.6 3.1H6.1c-2 0-3.6-1.3-3.6-3.1 0-1.5 1.1-2.7 2.7-2.9 0-1.4 1.3-2.5 2.9-2.5 0-1.7 1.6-2.5 2.7-2.6-1-.8-1.2-2.3-.5-3.3Z"/>',
  banho:   '<circle cx="11.5" cy="13.6" r="5.2"/><circle cx="17.1" cy="8" r="2.6"/><circle cx="6.9" cy="8.6" r="2"/>',
  tosa:    '<path d="M3.5 6.4h17a1.4 1.4 0 0 1 1.4 1.4v2.3a1.4 1.4 0 0 1-1.4 1.4h-17a1.4 1.4 0 0 1-1.4-1.4V7.8A1.4 1.4 0 0 1 3.5 6.4Z"/><rect x="4.4" y="11.6" width="2.1" height="6" rx="1"/><rect x="8.2" y="11.6" width="2.1" height="6.7" rx="1"/><rect x="12" y="11.6" width="2.1" height="6" rx="1"/><rect x="15.8" y="11.6" width="2.1" height="6.7" rx="1"/>',
  // extras filled
  flame:   '<path d="M12 2.5c2.2 3.2 5.4 4.9 5.4 9.1A5.4 5.4 0 0 1 6.6 11.6c0-1 .3-1.9.9-2.7.3 1.1.9 1.8 1.9 2C9 8 10.3 5 12 2.5Z"/>',
  crown:   '<path d="M3.5 8.2l3.7 3.1L12 4.8l4.8 6.5 3.7-3.1L18.7 18H5.3Z"/><rect x="5" y="18.6" width="14" height="2.2" rx="1.1"/>',
  heart:   '<path d="M12 20.6 4.4 12.9a4.7 4.7 0 0 1 6.7-6.6l.9.9.9-.9a4.7 4.7 0 0 1 6.7 6.6Z"/>',
  sparkle: '<path d="M12 2.5l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9Z"/>',
};

function Stamp({ glyph, size = 24, fg = '#fff', bg, radius, bare, style }) {
  const inner = STAMP_GLYPHS[glyph] || '';
  const g = size * (bare ? 1 : 0.6);
  const svg = (
    <svg width={g} height={g} viewBox="0 0 24 24" fill={fg} style={{ display: 'block' }}
      dangerouslySetInnerHTML={{ __html: inner }} />
  );
  if (bare) return svg;
  return (
    <div style={{ width: size, height: size, borderRadius: radius ?? size * 0.32, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>{svg}</div>
  );
}

window.Icon = Icon;
window.ICON_PATHS = ICON_PATHS;
window.Stamp = Stamp;
window.STAMP_GLYPHS = STAMP_GLYPHS;
