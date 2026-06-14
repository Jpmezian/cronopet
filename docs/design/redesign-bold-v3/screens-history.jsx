// screens-history.jsx — Histórico v3 "Bold".

function StreakHero({ T, pet }) {
  return (
    <InkPanel T={T} pad={22}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Stamp glyph="flame" size={18} fg="#FF9D4D" bare />
            <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 800, color: 'rgba(246,244,234,0.65)', textTransform: 'uppercase', letterSpacing: 1 }}>Sequência</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 13, marginTop: 6 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 62, lineHeight: 0.82, letterSpacing: -1.5, color: T.mint }}>{pet.streak}</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: T.onBlk, marginBottom: 6, letterSpacing: -0.4 }}>dias<br />seguidos</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 700, color: 'rgba(246,244,234,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Recorde</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, color: T.onBlk, marginTop: 2 }}>21</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        {WEEK.map((d, i) => {
          const full = d.done === d.total;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ width: '100%', maxHeight: 40, aspectRatio: '1', borderRadius: 11, background: full ? T.mint : 'rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {full ? <Icon name="check" size={15} color="#10231F" strokeWidth={3.2} /> : <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 800, color: 'rgba(246,244,234,0.4)' }}>{d.done}</span>}
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800, color: i === WEEK.length - 1 ? T.mint : 'rgba(246,244,234,0.4)', textTransform: 'uppercase' }}>{d.dia}</span>
            </div>
          );
        })}
      </div>
    </InkPanel>
  );
}

function WeekGoalsCard({ T }) {
  return (
    <Card T={T}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: T.ink, letterSpacing: -0.4 }}>Metas da semana</span>
        <Pill T={T} dot>20 de 21</Pill>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 104 }}>
        {WEEK.map((d, i) => {
          const ratio = d.done / d.total, full = d.done === d.total;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${Math.max(12, ratio * 100)}%`, borderRadius: 8, background: full ? T.primary : T.mint, transition: 'height 0.6s ease' }} />
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 800, color: i === WEEK.length - 1 ? T.primary : T.ink4, textTransform: 'uppercase' }}>{d.dia}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TrendRow({ T, glyph, color, titulo, valor, unidade, data, delta, max, last }) {
  const up = delta >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: last ? 'none' : `1px solid ${T.rule}` }}>
      <Stamp glyph={glyph} size={44} fg="#fff" bg={color} radius={15} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 800, color: T.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{titulo}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 23, color: T.ink, letterSpacing: -0.6 }}>{valor}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ink3 }}>{unidade}</span>
        </div>
      </div>
      <div style={{ width: 64, flexShrink: 0 }}><MiniBars data={data} color={color} T={T} height={30} max={max} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: 42, justifyContent: 'flex-end' }}>
        <Icon name={up ? 'trendingUp' : 'trendingDown'} size={13} color={up ? '#0E8C5A' : '#C2620A'} strokeWidth={2.8} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 800, color: up ? '#0E8C5A' : '#C2620A' }}>{up ? '+' : ''}{delta}</span>
      </div>
    </div>
  );
}

function ReportCard({ T, onNav }) {
  return (
    <Card T={T} pad={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: T.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="fileText" size={24} color="#10231F" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, color: T.ink, letterSpacing: -0.3 }}>Relatório pro vet</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink2, marginTop: 1 }}>PDF dos últimos 30 dias</div>
        </div>
      </div>
      <Button T={T} variant="black" full icon="share" style={{ marginTop: 14 }} onClick={() => onNav('premium')}>Gerar PDF</Button>
    </Card>
  );
}

function HistoryScreen({ T, pet, onNav }) {
  return (
    <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <Kicker T={T} color={T.primary}>Relatório · Semana</Kicker>
        <h1 style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: -1.4, color: T.ink }}>Histórico</h1>
        <p style={{ margin: '4px 0 0', fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 500, color: T.ink2 }}>A rotina de {pet.nome}, em padrões.</p>
      </div>
      <StreakHero T={T} pet={pet} />
      <WeekGoalsCard T={T} />
      <div>
        <SectionHeader T={T} title="Tendências" />
        <Card T={T}>
          <TrendRow T={T} glyph="agua" color="#0B7BB5" titulo="Água por dia" valor="623" unidade="ml" data={WATER_WEEK} delta={-8} max={800} />
          <TrendRow T={T} glyph="comida" color="#C2620A" titulo="Refeições por dia" valor="2,7" unidade="×" data={MEALS_WEEK} delta={2} max={3} />
          <TrendRow T={T} glyph="passeio" color="#0E8C5A" titulo="Passeio por dia" valor="32" unidade="min" data={WALK_WEEK} delta={12} max={60} last />
        </Card>
      </div>
      <ReportCard T={T} onNav={onNav} />
    </div>
  );
}

Object.assign(window, { HistoryScreen });
