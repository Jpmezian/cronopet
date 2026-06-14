// screens-settings.jsx — Ajustes v3 "Bold".

function Toggle({ T, on, onToggle }) {
  return (
    <ScalePress onClick={onToggle} scale={0.96} style={{ width: 48, height: 28, borderRadius: 999, background: on ? T.primary : T.rule, padding: 3, boxSizing: 'border-box', transition: 'background 0.2s' }}>
      <div style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s cubic-bezier(0.34,1.4,0.6,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </ScalePress>
  );
}

function SetRow({ T, icon, title, detail, last, onClick, right, danger }) {
  return (
    <ScalePress onClick={onClick} scale={0.99} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${T.rule}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: danger ? (T.isDark ? 'rgba(185,28,28,0.18)' : '#FCE3E3') : T.surfaceTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={18} color={danger ? '#B91C1C' : T.ink} strokeWidth={2.3} />
      </div>
      <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 600, color: danger ? '#B91C1C' : T.ink }}>{title}</span>
      {detail && <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: T.ink4 }}>{detail}</span>}
      {right !== undefined ? right : <Icon name="chevronRight" size={16} color={T.ink4} strokeWidth={2.4} />}
    </ScalePress>
  );
}

function FamilyCard({ T }) {
  return (
    <Card T={T}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: T.ink, letterSpacing: -0.4 }}>Família</span>
        <Pill T={T} dot>3 pessoas</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FAMILY.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: f.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: '#fff' }}>{f.inicial}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, color: T.ink }}>{f.nome}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ink3, marginTop: 1 }}>{f.papel}</div>
            </div>
          </div>
        ))}
      </div>
      <Button T={T} variant="soft" full icon="plus" style={{ marginTop: 16 }}>Convidar pra cuidar junto</Button>
    </Card>
  );
}

function SettingsScreen({ T, onClose, dark, onToggleDark }) {
  const [bio, setBio] = React.useState(true);
  const [notif, setNotif] = React.useState(true);
  return (
    <ModalShell T={T} kicker="Conta" title="Ajustes" onClose={onClose}>
      <div style={{ padding: '20px 20px 30px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card T={T} pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 17, overflow: 'hidden', flexShrink: 0 }}>
              <image-slot id="user-avatar" shape="rect" placeholder="Você" style={{ display: 'block', width: '100%', height: '100%' }}></image-slot>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: T.ink, letterSpacing: -0.3 }}>Marina Souza</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink3 }}>marina@email.com</div>
            </div>
            <Pill T={T} glyph="flame" color="#0B2C28" bg={T.mint}>Pro</Pill>
          </div>
        </Card>

        <FamilyCard T={T} />

        <div>
          <SectionHeader T={T} title="Preferências" />
          <Card T={T}>
            <SetRow T={T} icon={dark ? 'moon' : 'sun'} title="Tema escuro" right={<Toggle T={T} on={dark} onToggle={onToggleDark} />} />
            <SetRow T={T} icon="faceId" title="Bloqueio com Face ID" right={<Toggle T={T} on={bio} onToggle={() => setBio(!bio)} />} />
            <SetRow T={T} icon="bell" title="Notificações" right={<Toggle T={T} on={notif} onToggle={() => setNotif(!notif)} />} last />
          </Card>
        </div>

        <div>
          <SectionHeader T={T} title="Cuidado" />
          <Card T={T}>
            <SetRow T={T} icon="bowl" title="Plano nutricional" detail="Mel" />
            <SetRow T={T} icon="paw" title="Meus pets" detail="2" />
            <SetRow T={T} icon="fileText" title="Relatórios" last />
          </Card>
        </div>

        <div>
          <SectionHeader T={T} title="Conta" />
          <Card T={T}>
            <SetRow T={T} icon="shield" title="Privacidade e dados" />
            <SetRow T={T} icon="info" title="Sobre o CronoPet" detail="v1.0" />
            <SetRow T={T} icon="logout" title="Sair" danger right={<span />} last />
          </Card>
        </div>

        <p style={{ textAlign: 'center', fontFamily: FONT_BODY, fontSize: 11.5, color: T.ink4, lineHeight: 1.5, margin: 0 }}>
          Feito no Brasil, pra quem ama bicho.<br />Seus dados ficam criptografados no aparelho.
        </p>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { SettingsScreen });
