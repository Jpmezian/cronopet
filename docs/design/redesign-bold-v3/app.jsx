// app.jsx — shell chrome v3 "Bold": black floating nav, FAB, sheet, toast, modal.

function ModalShell({ T, title, kicker, onClose, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: T.bg, zIndex: 40, display: 'flex', flexDirection: 'column', animation: 'sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)' }}>
      <div style={{ paddingTop: 54, position: 'sticky', top: 0, zIndex: 5, background: T.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px' }}>
          <div>
            {kicker && <div style={{ marginBottom: 3 }}><Kicker T={T}>{kicker}</Kicker></div>}
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, color: T.ink, letterSpacing: -0.8 }}>{title}</span>
          </div>
          <ScalePress onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: T.blk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={19} color={T.onBlk} strokeWidth={2.6} />
          </ScalePress>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
    </div>
  );
}
window.ModalShell = ModalShell;

function TabBar({ T, active, onTab }) {
  const tabs = [
    { id: 'inicio', icon: 'home', label: 'Início' },
    { id: 'historico', icon: 'chart', label: 'Histórico' },
    { id: 'saude', icon: 'heartPulse', label: 'Saúde' },
  ];
  return (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 30, height: 62, borderRadius: 999, background: T.blk, display: 'flex', alignItems: 'center', padding: '0 8px', boxShadow: `0 14px 34px rgba(${T.shadow},${T.isDark ? 0.55 : 0.28})` }}>
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <ScalePress key={t.id} scale={0.9} onClick={() => onTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, margin: '0 4px', borderRadius: 999, background: on ? T.mint : 'transparent' }}>
            <Icon name={t.icon} size={22} color={on ? '#10231F' : 'rgba(246,244,234,0.62)'} strokeWidth={2.4} />
            {on && <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: '#10231F', letterSpacing: -0.3 }}>{t.label}</span>}
          </ScalePress>
        );
      })}
    </div>
  );
}
window.TabBar = TabBar;

function FAB({ T, onClick }) {
  return (
    <ScalePress onClick={onClick} scale={0.88} style={{ position: 'absolute', right: 22, bottom: 98, zIndex: 31, width: 56, height: 56, borderRadius: 999, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 26px rgba(4,162,155,0.5)` }}>
      <Icon name="plus" size={28} color={T.onPrimary} strokeWidth={2.8} />
    </ScalePress>
  );
}
window.FAB = FAB;

const QUICK_ACTIONS = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho', 'tosa'];
function QuickLogSheet({ T, onLog, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(15,14,11,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: '30px 30px 0 0', padding: '14px 22px 36px', animation: 'sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: T.rule, margin: '0 auto 18px' }} />
        <h3 style={{ margin: '0 0 4px', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, color: T.ink, letterSpacing: -0.6 }}>Registrar agora</h3>
        <p style={{ margin: '0 0 18px', fontFamily: FONT_BODY, fontSize: 14, color: T.ink3 }}>Toque pra marcar na hora.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {QUICK_ACTIONS.map((k) => {
            const a = actionTint(k, T);
            return (
              <ScalePress key={k} scale={0.86} onClick={() => { onLog(k); onClose(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                <Stamp glyph={a.glyph} size={58} fg="#FFFFFF" bg={a.primary} radius={20} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink2 }}>{a.label}</span>
              </ScalePress>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.QuickLogSheet = QuickLogSheet;

function Toast({ T, toast }) {
  if (!toast) return null;
  const cel = toast.celebrate;
  return (
    <div style={{ position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 20px 12px 13px', borderRadius: 999, background: cel ? T.primary : T.blk, boxShadow: `0 12px 28px rgba(${T.shadow},0.34)`, animation: 'toastIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 24, height: 24, borderRadius: 999, background: cel ? 'rgba(255,255,255,0.25)' : T.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={15} color={cel ? '#fff' : '#10231F'} strokeWidth={3.2} />
        </div>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, color: cel ? T.onPrimary : T.onBlk }}>{toast.msg}</span>
      </div>
    </div>
  );
}
window.Toast = Toast;
