// screens-nutrition.jsx — Nutrição v3 "Bold".

function CalorieHero({ T }) {
  const n = NUTRITION, ratio = n.consumidoKcal / n.metaKcal;
  return (
    <InkPanel T={T} pad={22}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <ProgressRing value={ratio} size={120} stroke={12} T={T} color={T.mint} track="rgba(255,255,255,0.14)">
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, color: T.onBlk, lineHeight: 1, letterSpacing: -1 }}>{n.consumidoKcal}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: 'rgba(246,244,234,0.5)', marginTop: 3, textTransform: 'uppercase' }}>de {n.metaKcal}</div>
        </ProgressRing>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, color: T.onBlk, letterSpacing: -0.6, lineHeight: 1.02 }}>Faltam<br />{n.metaKcal - n.consumidoKcal} kcal</div>
          <p style={{ margin: '8px 0 0', fontFamily: FONT_BODY, fontSize: 12.5, color: 'rgba(246,244,234,0.62)', lineHeight: 1.4 }}>Uma refeição da noite pra completar a meta da Mel.</p>
        </div>
      </div>
    </InkPanel>
  );
}

function MealRow({ T, meal, last }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${T.rule}` }}>
      <Stamp glyph="comida" size={42} fg={meal.feito ? '#fff' : '#C2620A'} bg={meal.feito ? '#C2620A' : (T.isDark ? 'rgba(194,98,10,0.18)' : '#FBEAD2')} radius={14} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, color: T.ink }}>{meal.nome}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 800, color: T.ink4 }}>{meal.hora}</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ink3, marginTop: 1 }}>{meal.tipo} · {meal.g}g</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: meal.feito ? T.ink : T.ink4, letterSpacing: -0.4 }}>{meal.kcal}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800, color: T.ink4, textTransform: 'uppercase' }}>kcal</div>
      </div>
    </div>
  );
}

function MacroBars({ T }) {
  const m = NUTRITION.macros;
  const rows = [
    { k: 'Proteína', v: m.proteina, c: '#C2620A' },
    { k: 'Gordura', v: m.gordura, c: '#0B7BB5' },
    { k: 'Carboidrato', v: m.carbo, c: '#0E8C5A' },
    { k: 'Fibra', v: m.fibra, c: '#8B43E6' },
  ];
  return (
    <Card T={T}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: T.ink, marginBottom: 16, letterSpacing: -0.4 }}>Composição</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: T.ink }}>{r.k}</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 800, color: T.ink }}>{r.v}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: T.surfaceTint, overflow: 'hidden' }}>
              <div style={{ width: `${r.v}%`, height: '100%', borderRadius: 999, background: r.c, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NutritionScreen({ T, onClose }) {
  return (
    <ModalShell T={T} kicker="Plano · Mel" title="Nutrição" onClose={onClose}>
      <div style={{ padding: '20px 20px 30px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CalorieHero T={T} />
        <div>
          <SectionHeader T={T} title="Refeições de hoje" action="Editar" onAction={() => {}} />
          <Card T={T}>{NUTRITION.refeicoes.map((m, i) => <MealRow key={i} T={T} meal={m} last={i === NUTRITION.refeicoes.length - 1} />)}</Card>
        </div>
        <MacroBars T={T} />
        <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 18, background: T.mint, alignItems: 'flex-start' }}>
          <Icon name="shield" size={19} color="#10231F" strokeWidth={2.3} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: '#10231F', lineHeight: 1.45 }}>
            Meta calculada por raça, idade, peso, castração e atividade. É referência — o veterinário ajusta no caso da Mel.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { NutritionScreen });
