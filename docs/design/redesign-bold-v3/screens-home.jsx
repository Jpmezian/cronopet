// screens-home.jsx — Início v3 "Bold": photographic, high-contrast, mint + black.

function TopBar({ T, onNav }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 18px' }}>
      <div>
        <Kicker T={T} color={T.primary}>13 de junho</Kicker>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: -0.8, color: T.ink, marginTop: 2 }}>Oi, Marina</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ScalePress onClick={() => onNav('notifs')} style={{ position: 'relative', width: 44, height: 44, borderRadius: 999, background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px rgba(${T.shadow},0.06)` }}>
          <Icon name="bell" size={20} color={T.ink} strokeWidth={2.2} />
          <span style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 8, background: '#C2620A', border: `2px solid ${T.card}` }} />
        </ScalePress>
        <ScalePress onClick={() => onNav('settings')} style={{ width: 44, height: 44, borderRadius: 999, overflow: 'hidden', boxShadow: `0 4px 12px rgba(${T.shadow},0.1)` }}>
          <image-slot id="user-avatar" shape="circle" placeholder="Você" style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
        </ScalePress>
      </div>
    </div>
  );
}

function PetHero({ T, pet, pets, onSwitch, onNav }) {
  return (
    <div style={{ position: 'relative', background: T.surfaceTint, borderRadius: 30, padding: 20, overflow: 'hidden' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px 5px 9px', borderRadius: 999, background: T.blk, marginBottom: 14 }}>
        <Stamp glyph="flame" size={14} fg="#FF9D4D" bare />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12.5, fontWeight: 800, color: T.onBlk, whiteSpace: 'nowrap' }}>{pet.streak} dias seguidos</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 42, lineHeight: 0.92, letterSpacing: -1.6, color: T.ink }}>{pet.nome}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink2, background: T.card, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{pet.raca}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink2, background: T.card, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{pet.idade}</span>
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 104, height: 104, borderRadius: 999, background: T.mint, position: 'absolute', inset: 0 }} />
          <ScalePress onClick={() => onNav('editProfile')} scale={0.97} style={{ width: 104, height: 104, borderRadius: 999, overflow: 'hidden', position: 'relative', border: `3px solid ${T.card}`, boxShadow: `0 10px 24px rgba(${T.shadow},0.16)` }}>
            <image-slot id={pet.slot} shape="circle" placeholder="Foto" style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
          </ScalePress>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
            {pets.map((p) => (
              <ScalePress key={p.id} onClick={() => onSwitch(p.id)} style={{ width: p.id === pet.id ? 18 : 7, height: 7, borderRadius: 999, background: p.id === pet.id ? T.blk : T.ink4, transition: 'all 0.25s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayPanel({ T, pet, counts, celebrate }) {
  const goals = GOALS[pet.tipo] || GOALS.cachorro;
  const done = goals.filter((k) => (counts[k] || 0) > 0).length;
  const all = done === goals.length;
  return (
    <InkPanel T={T} pad={20} style={{ transform: celebrate ? 'scale(1.015)' : 'none', transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <ProgressRing value={done / goals.length} size={88} stroke={9} T={T} color={all ? T.mint : T.primary} track="rgba(255,255,255,0.14)">
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, color: T.onBlk, lineHeight: 1 }}>{done}<span style={{ fontSize: 15, opacity: 0.5 }}>/{goals.length}</span></div>
        </ProgressRing>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, color: T.onBlk, letterSpacing: -0.4 }}>{all ? 'Dia completo!' : 'Metas de hoje'}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: 'rgba(246,244,234,0.62)', marginTop: 2, lineHeight: 1.35 }}>
            {all ? `${pet.nome} tem tudo registrado hoje.` : `Falta ${goals.length - done} pra fechar o dia.`}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
            {goals.map((k) => {
              const ok = (counts[k] || 0) > 0;
              const a = ACTIONS[k];
              return (
                <div key={k} style={{ width: 36, height: 36, borderRadius: 12, background: ok ? a.primary : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ok ? <Icon name="check" size={19} color="#fff" strokeWidth={3} /> : <Stamp glyph={a.glyph} size={19} fg="rgba(246,244,234,0.42)" bare />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </InkPanel>
  );
}

const HOME_ACTIONS = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho', 'tosa'];

function ActionTile({ T, k, count, onLog, justLogged }) {
  const a = actionTint(k, T);
  const done = count > 0;
  return (
    <ScalePress onClick={() => onLog(k)} scale={0.86} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, width: 66, flexShrink: 0 }}>
      <div style={{ position: 'relative', transform: justLogged ? 'scale(1.16) rotate(-5deg)' : 'none', transition: 'transform 0.32s cubic-bezier(0.34,1.7,0.5,1)' }}>
        <Stamp glyph={a.glyph} size={62} fg={done ? '#FFFFFF' : a.primary} bg={done ? a.primary : a.tint} radius={21} />
        {count > 0 && (
          <div style={{ position: 'absolute', top: -5, right: -5, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: T.blk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12, color: T.onBlk }}>{count}</span>
          </div>
        )}
      </div>
      <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: done ? a.primary : T.ink2 }}>{a.label}</span>
    </ScalePress>
  );
}

function MetasLine({ T, pet, counts }) {
  const goals = GOALS[pet.tipo] || GOALS.cachorro;
  const done = goals.filter((k) => (counts[k] || 0) > 0).length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
      <div style={{ flex: 1, display: 'flex', gap: 5 }}>
        {goals.map((k) => {
          const ok = (counts[k] || 0) > 0, a = ACTIONS[k];
          return <div key={k} style={{ flex: 1, height: 7, borderRadius: 999, background: ok ? a.primary : T.surfaceTint }} />;
        })}
      </div>
      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 800, color: T.ink2 }}>{done}/{goals.length} metas</span>
    </div>
  );
}

function InsightCard({ T, onNav }) {
  const i = INSIGHT;
  return (
    <ScalePress onClick={() => onNav('saude')} scale={0.98}>
      <Card T={T} pad={18} style={{ background: T.isDark ? T.card : '#FBEAD2' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Stamp glyph="agua" size={46} fg="#fff" bg="#C2620A" radius={16} />
          <div style={{ flex: 1 }}>
            <Kicker T={T} color="#C2620A">De olho</Kicker>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: T.isDark ? '#E9CBA0' : '#7C4A12', marginTop: 3, letterSpacing: -0.3 }}>{i.titulo}</div>
            <p style={{ margin: '5px 0 0', fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.isDark ? '#CBB18C' : '#8A6437' }}>{i.texto}</p>
          </div>
        </div>
      </Card>
    </ScalePress>
  );
}

function JournalTimeline({ T, timeline }) {
  const ordered = [...timeline].sort((a, b) => b.hora.localeCompare(a.hora));
  return (
    <div>
      {ordered.map((e, i) => {
        const a = actionTint(e.key, T);
        const last = i === ordered.length - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 40, flexShrink: 0, textAlign: 'right', paddingTop: 9 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 800, color: T.ink3 }}>{e.hora}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Stamp glyph={a.glyph} size={38} fg={a.primary} bg={a.tint} radius={13} />
              {!last && <div style={{ width: 2, flex: 1, minHeight: 16, background: T.rule, marginTop: 5 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 7, paddingBottom: last ? 0 : 16 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: T.ink }}>{a.label}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink3, marginTop: 1 }}>{e.nota} <span style={{ color: T.ink4 }}>· {e.por}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HomeScreen({ T, pet, pets, counts, timeline, onLog, onSwitch, onNav, celebrate, lastLogged }) {
  return (
    <div style={{ padding: '6px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TopBar T={T} onNav={onNav} />
      <PetHero T={T} pet={pet} pets={pets} onSwitch={onSwitch} onNav={onNav} />
      <TodayPanel T={T} pet={pet} counts={counts} celebrate={celebrate} />

      <div>
        <SectionHeader T={T} title="Registrar" />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px', padding: '2px 20px 4px' }}>
          {HOME_ACTIONS.map((k) => <ActionTile key={k} T={T} k={k} count={counts[k] || 0} onLog={onLog} justLogged={lastLogged === k} />)}
        </div>
        <MetasLine T={T} pet={pet} counts={counts} />
      </div>

      <InsightCard T={T} onNav={onNav} />

      <div>
        <SectionHeader T={T} title="Hoje" action="Ver tudo" onAction={() => onNav('historico')} />
        <JournalTimeline T={T} timeline={timeline} />
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen });
