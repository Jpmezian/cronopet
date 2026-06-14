// main.jsx — root App: state, navigation wiring, mount.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "tom": "mint",
  "pet": "Mel"
}/*EDITMODE-END*/;

function nowHora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// timelines iniciais por pet
const INITIAL_TIMELINES = {
  mel: TODAY_TIMELINE,
  tom: [
    { key: 'comida', hora: '08:00', por: 'Você', nota: 'Sachê · 70g' },
    { key: 'agua',   hora: '08:02', por: 'Você', nota: 'Fonte' },
  ],
};

const QS = new URLSearchParams(location.search);
function devGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
const INIT_SCREEN = QS.get('screen') || devGet('cp_dev_screen'); // premium | settings | nutrition
const INIT_TAB = QS.get('tab') || devGet('cp_dev_tab');        // inicio | historico | saude
const FORCE_ONB = QS.get('onb') === '1' || devGet('cp_dev_onb') === '1';

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const dark = t.dark;
  const T = makeTheme(dark, t.tom);

  const [petId, setPetId] = React.useState('mel');
  React.useEffect(() => { setPetId(t.pet === 'Tom' ? 'tom' : 'mel'); }, [t.pet]);
  const pet = PETS.find((p) => p.id === petId) || PETS[0];

  const [timelines, setTimelines] = React.useState(INITIAL_TIMELINES);
  const timeline = timelines[petId] || [];
  const counts = todayCounts(timeline);

  const [tab, setTab] = React.useState(['inicio','historico','saude'].includes(INIT_TAB) ? INIT_TAB : 'inicio');
  const [modal, setModal] = React.useState(['premium','settings','nutrition'].includes(INIT_SCREEN) ? INIT_SCREEN : null);
  const [sheet, setSheet] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [celebrate, setCelebrate] = React.useState(false);
  const [lastLogged, setLastLogged] = React.useState(null);

  // onboarding: mostra na 1ª vez (persistente)
  const [onboarding, setOnboarding] = React.useState(() => {
    if (FORCE_ONB) return true;
    if (INIT_SCREEN || INIT_TAB) return false;
    try { return localStorage.getItem('cp_onboarded') !== '1'; } catch (e) { return true; }
  });
  const finishOnboarding = () => {
    try { localStorage.setItem('cp_onboarded', '1'); } catch (e) {}
    setOnboarding(false);
  };

  const toastRef = React.useRef(null);
  const showToast = (msg, opts = {}) => {
    setToast({ msg, ...opts });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), opts.celebrate ? 2600 : 1700);
  };

  const onLog = (key) => {
    const goals = GOALS[pet.tipo] || GOALS.cachorro;
    const before = goals.filter((k) => (counts[k] || 0) > 0).length;
    const evt = { key, hora: nowHora(), por: 'Você', nota: 'Registrado agora' };
    const nextTimeline = [...timeline, evt];
    setTimelines((prev) => ({ ...prev, [petId]: nextTimeline }));
    setLastLogged(key);
    setTimeout(() => setLastLogged(null), 360);

    const after = todayCounts(nextTimeline);
    const afterDone = goals.filter((k) => (after[k] || 0) > 0).length;
    if (before < goals.length && afterDone === goals.length) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2600);
      showToast('Dia completo!', { celebrate: true });
    } else {
      showToast(`${ACTIONS[key].label} registrada`);
    }
  };

  const onNav = (dest) => {
    if (dest === 'inicio' || dest === 'historico' || dest === 'saude') { setTab(dest); return; }
    if (dest === 'settings' || dest === 'premium' || dest === 'nutrition') { setModal(dest); return; }
    if (dest === 'editProfile') { setModal('settings'); return; }
    if (dest === 'notifs') { showToast('Sem novas notificações'); return; }
  };

  // sincroniza dark do toggle interno de settings com o tweak
  const toggleDark = () => setTweak('dark', !dark);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: dark ? '#15140F' : '#DCE3CF', boxSizing: 'border-box' }}>
      <IOSDevice dark={dark}>
        <div style={{ position: 'relative', height: '100%', background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {onboarding ? (
            <OnboardingScreen T={T} onDone={finishOnboarding} />
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 48, paddingBottom: 112 }}>
                {tab === 'inicio' && <HomeScreen T={T} pet={pet} pets={PETS} counts={counts} timeline={timeline} onLog={onLog} onSwitch={(id) => { setPetId(id); setTweak('pet', id === 'tom' ? 'Tom' : 'Mel'); }} onNav={onNav} celebrate={celebrate} lastLogged={lastLogged} />}
                {tab === 'historico' && <HistoryScreen T={T} pet={pet} onNav={onNav} />}
                {tab === 'saude' && <HealthScreen T={T} pet={pet} onNav={onNav} />}
              </div>
              <FAB T={T} onClick={() => setSheet(true)} />
              <TabBar T={T} active={tab} onTab={setTab} />
            </>
          )}

          {sheet && <QuickLogSheet T={T} onLog={onLog} onClose={() => setSheet(false)} />}
          {modal === 'nutrition' && <NutritionScreen T={T} onClose={() => setModal(null)} />}
          {modal === 'premium' && <PremiumScreen T={T} onClose={() => setModal(null)} />}
          {modal === 'settings' && <SettingsScreen T={T} onClose={() => setModal(null)} dark={dark} onToggleDark={toggleDark} />}

          <Toast T={T} toast={toast} />
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Aparência" />
        <TweakToggle label="Tema escuro" value={dark} onChange={(v) => setTweak('dark', v)} />
        <TweakRadio label="Tom / textura" value={t.tom} options={['mint', 'pastel', 'terroso', 'solido']} onChange={(v) => setTweak('tom', v)} />
        <TweakSection label="Pet ativo" />
        <TweakRadio label="Pet" value={t.pet} options={['Mel', 'Tom']} onChange={(v) => setTweak('pet', v)} />
        <TweakSection label="Fluxo" />
        <TweakButton label="Reabrir onboarding" onClick={() => { setModal(null); setOnboarding(true); }} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
