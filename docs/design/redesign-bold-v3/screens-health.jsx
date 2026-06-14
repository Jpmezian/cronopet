// screens-health.jsx — Saúde v3 "Bold".

function WeightCard({ T, pet }) {
  const data = WEIGHT_SERIES, w = 300, h = 100, padX = 4, padY = 12;
  const kgs = data.map((d) => d.kg), min = Math.min(...kgs) - 0.4, max = Math.max(...kgs) + 0.4;
  const pts = data.map((d, i) => [padX + (i / (data.length - 1)) * (w - padX * 2), padY + (1 - (d.kg - min) / (max - min)) * (h - padY * 2)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return (
    <Card T={T}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 800, color: T.ink3, textTransform: 'uppercase', letterSpacing: 0.6 }}>Peso atual</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, color: T.ink, letterSpacing: -1.4 }}>{pet.peso.toLocaleString('pt-BR')}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: T.ink3 }}>kg</span>
          </div>
        </div>
        <Pill T={T} dot color="#0E8C5A" bg={T.isDark ? 'rgba(14,140,90,0.18)' : '#D3F0DF'}>Saudável</Pill>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', marginTop: 8 }}>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.primary} stopOpacity="0.16" /><stop offset="100%" stopColor={T.primary} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#wg)" />
        <path d={line} fill="none" stroke={T.primary} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 2.4} fill={i === pts.length - 1 ? T.primary : T.card} stroke={T.primary} strokeWidth="2.2" />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {data.map((d, i) => <span key={i} style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800, color: T.ink4, textTransform: 'uppercase' }}>{d.mes}</span>)}
      </div>
    </Card>
  );
}

function NutritionCard({ T, onNav }) {
  return (
    <ScalePress onClick={() => onNav('nutrition')} scale={0.99}>
      <Card T={T} pad={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Stamp glyph="comida" size={46} fg="#fff" bg="#C2620A" radius={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, color: T.ink, letterSpacing: -0.3 }}>Plano nutricional</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink2, marginTop: 1 }}>760 / 1.180 kcal · falta a noite</div>
          </div>
          <Icon name="arrowRight" size={18} color={T.ink2} strokeWidth={2.4} />
        </div>
      </Card>
    </ScalePress>
  );
}

function AIGate({ T, onNav }) {
  return (
    <InkPanel T={T} pad={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <Stamp glyph="sparkle" size={40} fg="#10231F" bg={T.mint} radius={14} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 800, color: 'rgba(246,244,234,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Últimos 30 dias</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: T.onBlk, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>Análise de saúde</div>
          </div>
        </div>
        <Pill T={T} glyph="flame" color="#0B2C28" bg={T.mint} style={{ flexShrink: 0 }}>Pro</Pill>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ filter: 'blur(5px)', opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
          <p style={{ margin: '0 0 6px', fontFamily: FONT_BODY, fontSize: 12.5, color: T.onBlk, lineHeight: 1.5 }}>Mel manteve peso e apetite estáveis. O consumo de água caiu levemente, possivelmente ligado ao clima.</p>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12.5, color: T.onBlk, lineHeight: 1.5 }}>Sugestão: manter passeios e reforçar hidratação.</p>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 999, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={19} color={T.onBlk} strokeWidth={2.4} />
          </div>
        </div>
      </div>
      <Button T={T} variant="mint" full glyph="sparkle" style={{ marginTop: 16 }} onClick={() => onNav('premium')}>Desbloquear com o Pro</Button>
      <p style={{ margin: '11px 0 0', fontFamily: FONT_BODY, fontSize: 11, color: 'rgba(246,244,234,0.5)', textAlign: 'center', lineHeight: 1.4 }}>Nunca diagnostica. Sempre consulte o veterinário.</p>
    </InkPanel>
  );
}

function AppointmentCard({ T }) {
  const a = APPOINTMENTS[0];
  return (
    <Card T={T} pad={16}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: T.mint, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, color: '#10231F', lineHeight: 1 }}>28</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800, color: '#0E6E5C', textTransform: 'uppercase', letterSpacing: 0.5 }}>jun</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5, color: T.ink, letterSpacing: -0.3 }}>{a.titulo}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink2, marginTop: 2 }}>{a.quando}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.ink4, marginTop: 1 }}>{a.vet}</div>
        </div>
        <Icon name="chevronRight" size={18} color={T.ink4} strokeWidth={2.4} />
      </div>
    </Card>
  );
}

function VaccineRow({ T, v, last }) {
  const ok = v.status === 'ok';
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${T.rule}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: ok ? (T.isDark ? 'rgba(14,140,90,0.16)' : '#D3F0DF') : (T.isDark ? 'rgba(194,98,10,0.16)' : '#FBEAD2'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="syringe" size={18} color={ok ? '#0E8C5A' : '#C2620A'} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, color: T.ink }}>{v.nome}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ink3, marginTop: 1 }}>{ok ? `Aplicada ${v.data}` : 'Ainda não aplicada'}</div>
      </div>
      {ok ? (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 9.5, fontWeight: 800, color: T.ink4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Próxima</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 800, color: T.ink2, marginTop: 2 }}>{v.prox}</div>
        </div>
      ) : <Pill T={T} dot color="#C2620A" bg={T.isDark ? 'rgba(194,98,10,0.2)' : '#FBEAD2'}>Agendar</Pill>}
    </div>
  );
}

function HealthScreen({ T, pet, onNav }) {
  return (
    <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Kicker T={T} color={T.primary}>Prontuário · {pet.nome}</Kicker>
        <h1 style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: -1.4, color: T.ink }}>Saúde</h1>
      </div>
      <WeightCard T={T} pet={pet} />
      <NutritionCard T={T} onNav={onNav} />
      <AIGate T={T} onNav={onNav} />
      <div>
        <SectionHeader T={T} title="Próxima consulta" />
        <AppointmentCard T={T} />
      </div>
      <div>
        <SectionHeader T={T} title="Vacinas" action="Adicionar" onAction={() => {}} />
        <Card T={T}>{VACCINES.map((v, i) => <VaccineRow key={i} T={T} v={v} last={i === VACCINES.length - 1} />)}</Card>
      </div>
    </div>
  );
}

Object.assign(window, { HealthScreen });
