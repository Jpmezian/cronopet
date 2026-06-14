// screens-onboarding.jsx — Onboarding v3 "Bold": photographic, mint + black paw.

function OnbHero({ T, step }) {
  if (step === 0) {
    return (
      <div style={{ position: 'relative', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stamp glyph="passeio" size={210} fg={T.blk} bare />
        <div style={{ position: 'absolute', right: 26, bottom: 30, width: 92, height: 92, borderRadius: 26, overflow: 'hidden', border: `4px solid ${T.bg}`, boxShadow: `0 12px 26px rgba(${T.shadow},0.2)`, transform: 'rotate(6deg)' }}>
          <image-slot id="onb-pet" shape="rect" placeholder="Pet" style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div style={{ position: 'relative', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 170, height: 170, borderRadius: 999, border: `2px dashed ${T.mintDeep}` }} />
        <div style={{ position: 'absolute', width: 124, height: 124, borderRadius: 999, background: T.mint, opacity: 0.5 }} />
        <Stamp glyph="comida" size={104} fg="#FFFFFF" bg={ACTIONS.comida.primary} radius={32} style={{ boxShadow: `0 16px 32px rgba(${T.shadow},0.22)` }} />
        <div style={{ position: 'absolute', bottom: 40, right: 60, width: 34, height: 34, borderRadius: 999, background: T.blk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={19} color={T.mint} strokeWidth={3.4} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      {FAMILY.map((f, i) => (
        <div key={i} style={{ width: 70, height: 70, borderRadius: 24, background: f.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${[14,-14,10][i]}px)`, boxShadow: `0 12px 24px rgba(${T.shadow},0.18)` }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, color: '#fff' }}>{f.inicial}</span>
        </div>
      ))}
    </div>
  );
}

const ONB = [
  { titulo: 'Você não precisa\nlembrar de tudo', texto: 'O CronoPet guarda a rotina do seu bicho por você. Comida, água, passeio, vacina — num lugar só.' },
  { titulo: 'Registrar leva\n2 segundos', texto: 'Um toque e pronto. Depois é só olhar e ver o padrão da semana, sem planilha.' },
  { titulo: 'A casa inteira\ncuidando junto', texto: 'Vários tutores, o mesmo diário. Acabou o "você já deu ração?".' },
];

function OnboardingScreen({ T, onDone }) {
  const [step, setStep] = React.useState(0);
  const s = ONB[step], last = step === ONB.length - 1;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.surfaceTint, paddingTop: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px' }}>
        <Logo T={T} size={19} />
        {!last && <ScalePress onClick={onDone}><span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink3 }}>Pular</span></ScalePress>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px' }}>
        <OnbHero T={T} step={step} />
        <h1 style={{ margin: '26px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 36, letterSpacing: -1.4, color: T.ink, lineHeight: 1.0, whiteSpace: 'pre-line' }}>{s.titulo}</h1>
        <p style={{ margin: '14px 0 0', fontFamily: FONT_BODY, fontSize: 15.5, fontWeight: 500, color: T.ink2, lineHeight: 1.5 }}>{s.texto}</p>
      </div>

      <div style={{ padding: '0 26px 44px' }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}>
          {ONB.map((_, i) => (
            <div key={i} style={{ height: 6, borderRadius: 999, flex: i === step ? 3 : 1, background: i === step ? T.blk : 'rgba(0,0,0,0.12)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <Button T={T} variant="black" full glyph={last ? 'passeio' : undefined} onClick={() => last ? onDone() : setStep(step + 1)}>
          {last ? 'Começar a cuidar' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen });
