// ui.jsx — CronoPet redesign v3 "Bold": photographic, high-contrast, mint + graphite-black.
// Brand palette preserved. References: Duolingo (chunky/friendly), Spotify (bold/photo), the pet-app comp.

// ── Tone presets (textura/tom — paleta da marca mantida) ──
const TONES = {
  mint:    { bg: '#E7F4EC', surfaceTint: '#D8EFE2' },
  pastel:  { bg: '#F2F1E9', surfaceTint: '#E7F2E9' },
  terroso: { bg: '#EFEAD8', surfaceTint: '#E7E2CB' },
  solido:  { bg: '#F4F3EC', surfaceTint: '#EBEFDB' },
};

function makeTheme(dark, tone) {
  const t = TONES[tone] || TONES.mint;
  if (dark) {
    return {
      bg: '#1A1916', panel: '#252320', card: '#252320', surfaceTint: '#2E2C27', paper: '#252320', sunken: '#2E2C27',
      ink: '#F3EFE2', ink2: '#CBC2AE', ink3: '#968C79', ink4: '#6B6354',
      rule: '#39362F', ruleSoft: '#332F29',
      primary: '#22C3B6', primaryDeep: '#9BE4C6',
      mint: '#9BE4C6', mintSoft: 'rgba(155,228,198,0.14)', mintDeep: '#22C3B6',
      beige: '#39362F',
      blk: '#0F0E0C', onBlk: '#F3EFE2',
      onPrimary: '#0F2420', shadow: '0,0,0', isDark: true,
    };
  }
  return {
    bg: t.bg, panel: '#FBFAF2', card: '#FFFFFF', surfaceTint: t.surfaceTint, paper: '#FFFFFF', sunken: t.surfaceTint,
    ink: '#1E1C17', ink2: '#564C3D', ink3: '#867C6A', ink4: '#ADA48F',
    rule: '#E1DCC9', ruleSoft: '#ECE7D7',
    primary: '#04A29B', primaryDeep: '#036E69',
    mint: '#9BE4C6', mintSoft: '#D8EFE2', mintDeep: '#7ED4B0',
    beige: '#E9F1CF',
    blk: '#1E1C17', onBlk: '#F6F4EA',
    onPrimary: '#FBFAF2', shadow: '52,46,34', isDark: false,
  };
}

// Ações — cores funcionais preservadas
const ACTIONS = {
  comida:  { label: 'Comida',  glyph: 'comida',  primary: '#C2620A', tintL: '#FBEAD2', tintD: 'rgba(194,98,10,0.22)' },
  agua:    { label: 'Água',    glyph: 'agua',    primary: '#0B7BB5', tintL: '#D7ECF8', tintD: 'rgba(11,123,181,0.22)' },
  passeio: { label: 'Passeio', glyph: 'passeio', primary: '#0E8C5A', tintL: '#D3F0DF', tintD: 'rgba(14,140,90,0.22)' },
  xixi:    { label: 'Xixi',    glyph: 'xixi',    primary: '#8B43E6', tintL: '#EBDFFB', tintD: 'rgba(139,67,230,0.22)' },
  coco:    { label: 'Cocô',    glyph: 'coco',    primary: '#9A4D14', tintL: '#F0E2CC', tintD: 'rgba(154,77,20,0.24)' },
  banho:   { label: 'Banho',   glyph: 'banho',   primary: '#0E91A8', tintL: '#D2EEF1', tintD: 'rgba(14,145,168,0.22)' },
  tosa:    { label: 'Tosa',    glyph: 'tosa',    primary: '#D11E73', tintL: '#FAD9E8', tintD: 'rgba(209,30,115,0.22)' },
};
function actionTint(key, T) {
  const a = ACTIONS[key];
  return { ...a, tint: T.isDark ? a.tintD : a.tintL };
}

const FONT_DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
const FONT_BODY = '"Hanken Grotesk", -apple-system, system-ui, sans-serif';
const FONT_MONO = '"Hanken Grotesk", system-ui, sans-serif';

function ScalePress({ children, onClick, style, scale = 0.95, disabled, ...rest }) {
  const [p, setP] = React.useState(false);
  return (
    <div role="button" tabIndex={0}
      onMouseDown={() => !disabled && setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => !disabled && setP(true)} onTouchEnd={() => setP(false)}
      onClick={(e) => !disabled && onClick && onClick(e)}
      style={{ cursor: disabled ? 'default' : 'pointer', transform: p ? `scale(${scale})` : 'scale(1)',
        transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1)', WebkitTapHighlightColor: 'transparent',
        opacity: disabled ? 0.45 : 1, ...style }} {...rest}>
      {children}
    </div>
  );
}

// Eyebrow — small bold uppercase label (no mono, no index)
function Kicker({ children, T, color, style }) {
  return (
    <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: color || T.ink3, ...style }}>{children}</span>
  );
}

function Rule({ T, style }) { return <div style={{ height: 1, background: T.rule, ...style }} />; }

// Logo — solid paw mark + heavy wordmark
function Logo({ T, size = 22, showWord = true, color }) {
  const c = color || T.ink;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Stamp glyph="passeio" size={size * 1.18} fg={c} bare />
      {showWord && (
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: -0.8, color: T.ink }}>
          cronopet
        </span>
      )}
    </div>
  );
}

// White rounded card
function Card({ children, T, style, pad = 18, radius = 26, flat = false }) {
  return (
    <div style={{ background: T.card, borderRadius: radius, padding: pad,
      boxShadow: flat ? 'none' : `0 2px 4px rgba(${T.shadow},0.03), 0 14px 30px rgba(${T.shadow},${T.isDark ? 0.34 : 0.06})`,
      ...style }}>{children}</div>
  );
}

// Black / ink panel (high contrast hero)
function InkPanel({ children, T, style, pad = 20, radius = 28 }) {
  return (
    <div style={{ background: T.blk, borderRadius: radius, padding: pad, color: T.onBlk,
      boxShadow: `0 16px 36px rgba(${T.shadow},${T.isDark ? 0.5 : 0.18})`, ...style }}>{children}</div>
  );
}

// Section header — bold title + optional "see all"
function SectionHeader({ title, action, onAction, T, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 14px', ...style }}>
      <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, letterSpacing: -0.6, color: T.ink }}>{title}</h3>
      {action && (
        <ScalePress onClick={onAction}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: T.primary }}>{action}</span>
        </ScalePress>
      )}
    </div>
  );
}

// Filter pill chip
function Chip({ children, active, T, onClick, glyph }) {
  return (
    <ScalePress onClick={onClick} scale={0.93} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: glyph ? '9px 15px 9px 11px' : '9px 16px', borderRadius: 999,
      background: active ? T.blk : 'transparent', border: `1.5px solid ${active ? T.blk : T.rule}`, whiteSpace: 'nowrap' }}>
      {glyph && <Stamp glyph={glyph} size={16} fg={active ? T.onBlk : T.ink2} bare />}
      <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: active ? T.onBlk : T.ink2 }}>{children}</span>
    </ScalePress>
  );
}

// Status pill
function Pill({ children, color, bg, T, style, glyph, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999,
      fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2, whiteSpace: 'nowrap',
      color: color || T.primaryDeep, background: bg || T.mintSoft, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 6, background: color || T.primary }} />}
      {glyph && <Stamp glyph={glyph} size={13} fg={color || T.primaryDeep} bare />}
      {children}
    </span>
  );
}

function ProgressRing({ value = 0, size = 124, stroke = 11, color, track, T, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || 'rgba(255,255,255,0.18)'} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color || T.mint} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

// Button — bold pill. variants: black / mint / white / primary
function Button({ children, T, onClick, variant = 'black', glyph, icon, style, full }) {
  const v = {
    black:   { bg: T.blk, color: T.onBlk, border: 'transparent' },
    primary: { bg: T.primary, color: T.onPrimary, border: 'transparent' },
    mint:    { bg: T.mint, color: '#10231F', border: 'transparent' },
    white:   { bg: T.card, color: T.ink, border: T.rule },
    soft:    { bg: T.isDark ? T.surfaceTint : T.beige, color: T.ink, border: 'transparent' },
  }[variant];
  return (
    <ScalePress onClick={onClick} scale={0.97} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      width: full ? '100%' : undefined, boxSizing: 'border-box', padding: '16px 24px', borderRadius: 999,
      background: v.bg, border: `1.5px solid ${v.border}`, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, letterSpacing: -0.2, color: v.color, whiteSpace: 'nowrap', ...style }}>
      {glyph && <Stamp glyph={glyph} size={20} fg={v.color} bare />}
      {icon && <Icon name={icon} size={19} color={v.color} strokeWidth={2.6} />}
      {children}
    </ScalePress>
  );
}

function MiniBars({ data, color, T, height = 44, max }) {
  const m = max || Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(6, (v / m) * 100)}%`, background: color, borderRadius: 3, opacity: v === 0 ? 0.16 : 1, transition: 'height 0.5s ease' }} />
      ))}
    </div>
  );
}

Object.assign(window, {
  TONES, makeTheme, ACTIONS, actionTint, FONT_DISPLAY, FONT_BODY, FONT_MONO,
  ScalePress, Kicker, Rule, Logo, Card, InkPanel, SectionHeader, Chip, Pill, ProgressRing, Button, MiniBars,
});
