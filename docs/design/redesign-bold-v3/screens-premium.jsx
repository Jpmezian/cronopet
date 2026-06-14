// screens-premium.jsx — Pro / paywall v3 "Bold". Tom honesto.

function PremiumScreen({ T, onClose }) {
  const [plano, setPlano] = React.useState('anual');
  const feats = [
    { glyph: 'sparkle', t: 'Análise de saúde por padrões', d: 'Insights dos últimos 30 dias, toda semana' },
    { glyph: 'passeio', t: 'Família ilimitada', d: 'No grátis dá 1 pessoa. No Pro, a casa toda' },
    { glyph: 'comida',  t: 'Relatório PDF avançado', d: 'Peso, água, vacinas e medicação pro vet' },
    { glyph: 'flame',   t: 'Lembretes inteligentes', d: 'Vacina e consulta avisadas na hora certa' },
  ];
  return (
    <ModalShell T={T} kicker="Plano" title="CronoPet Pro" onClose={onClose}>
      <div style={{ padding: '18px 20px 30px' }}>
        {/* hero preto, alto contraste */}
        <InkPanel T={T} pad={24} radius={28}>
          <div style={{ position: 'absolute', right: -20, bottom: -26, opacity: 0.1 }}>
            <Stamp glyph="passeio" size={150} fg={T.mint} bare />
          </div>
          <div style={{ position: 'relative' }}>
            <Pill T={T} color="#10231F" bg={T.mint}>Pro</Pill>
            <h1 style={{ margin: '14px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, color: T.onBlk, letterSpacing: -1, lineHeight: 1.04 }}>Cuidar fica<br />ainda mais fácil</h1>
            <p style={{ margin: '11px 0 0', fontFamily: FONT_BODY, fontSize: 13.5, color: 'rgba(246,244,234,0.72)', lineHeight: 1.45, maxWidth: 260 }}>
              O grátis já dá conta do essencial. O Pro entra quando você quer mais memória e mais gente cuidando junto.
            </p>
          </div>
        </InkPanel>

        <div style={{ marginTop: 20 }}>
          {feats.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '13px 0', borderBottom: i < feats.length - 1 ? `1px solid ${T.rule}` : 'none' }}>
              <Stamp glyph={f.glyph} size={42} fg={T.primary} bg={T.isDark ? T.surfaceTint : T.mintSoft} radius={14} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: T.ink, letterSpacing: -0.3 }}>{f.t}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink3, marginTop: 1, lineHeight: 1.35 }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {[
            { id: 'anual', t: 'Anual', p: 'R$ 89,90', sub: 'R$ 7,49/mês · economiza 38%', badge: 'Melhor valor' },
            { id: 'mensal', t: 'Mensal', p: 'R$ 11,90', sub: 'cobrado todo mês', badge: null },
          ].map((pl) => {
            const sel = plano === pl.id;
            return (
              <ScalePress key={pl.id} scale={0.99} onClick={() => setPlano(pl.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px', borderRadius: 20, background: sel ? (T.isDark ? T.surfaceTint : T.mintSoft) : T.card, border: `2px solid ${sel ? T.primary : T.rule}` }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${sel ? T.primary : T.rule}`, background: sel ? T.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sel && <Icon name="check" size={13} color={T.onPrimary} strokeWidth={3.2} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: T.ink, letterSpacing: -0.3 }}>{pl.t}</span>
                    {pl.badge && <Pill T={T} color="#0B2C28" bg={T.mint}>{pl.badge}</Pill>}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ink3, marginTop: 1 }}>{pl.sub}</div>
                </div>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: T.ink, letterSpacing: -0.4 }}>{pl.p}</span>
              </ScalePress>
            );
          })}
        </div>

        <Button T={T} variant="primary" full glyph="flame" style={{ marginTop: 20 }} onClick={onClose}>Assinar o Pro</Button>
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: FONT_BODY, fontSize: 11.5, color: T.ink4, lineHeight: 1.5 }}>
          Renova automático. Cancela quando quiser, em 2 toques. Sem pegadinha.
        </p>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { PremiumScreen });
