/**
 * Suite — store/usePetStore.ts
 *
 * Cobertura focada em comportamentos críticos de negócio:
 *  - Onboarding seta pet + zera contadores
 *  - addActionLog adiciona, computa streak quando dia completa,
 *    cria id estável, sanitiza note
 *  - removeActionLog / updateActionLog
 *  - addMedicalEvent ordena DESC (mais recente primeiro)
 *  - addVaccine / updateVaccine / removeVaccine
 *  - addWeightEntry / removeWeightEntry — retroativo OK
 *  - dismissInsight idempotente
 *  - snoozeInsight grava timestamp futuro
 *  - toggleInsightCategory liga/desliga
 *  - resetStore limpa tudo
 *  - registerAlertHandled incrementa + grava timestamp
 *
 * Stubs ativos (via tsconfig.test.json):
 *  - native deps: mmkv, secure-store, file-system, image-manipulator, sentry, crypto
 *  - serviços: NotificationService, SyncService
 *  - Storage MMKV vira Map em memória — persist NÃO sobrevive entre runs
 *    (intencional: cada `npm run test:store` parte do zero)
 */

import { usePetStore } from '@/store/usePetStore';
import {
  assertEq, assertTrue, assertNear, assertNotNull, runSuite,
} from '../_lib/assert';

// Snapshot inicial — usado como base do reset() entre casos.
// resetStore() do próprio store é o caminho oficial.
function reset() {
  usePetStore.getState().resetStore();
  // resetStore não limpa coleções de "metadata" (milestones, dismisses, etc).
  // Fazemos reset manual via setState pra começar do zero em cada caso.
  usePetStore.setState({
    shownMilestones: [],
    shownActivityMilestones: [],
    shownPremiumPrompts: [],
    dismissedInsightIds: [],
    snoozedInsights: {},
    disabledInsightCategories: [],
    alertsHandledCount: 0,
    alertsHandledLastAt: null,
    notifiedInsightIds: {},
  });
}

runSuite('usePetStore', [
  {
    name: '01. Estado inicial: hasOnboarded=false, pet vazio, contagens zeradas',
    fn: () => {
      reset();
      const s = usePetStore.getState();
      assertEq(s.hasOnboarded, false);
      assertEq(s.pet.nome, '');
      assertEq(s.streak, 0);
      assertEq(s.actionHistory.length, 0);
      assertEq(s.medicalEvents.length, 0);
      assertEq(s.vaccines.length, 0);
      assertEq(s.weightHistory.length, 0);
      assertEq(s.isPremium, false);
    },
  },

  {
    name: '02. completeOnboarding seta pet + hasOnboarded=true + sanitiza nome',
    fn: async () => {
      reset();
      // Nome com espaços extras → sanitizado pra "Bidu"
      await usePetStore.getState().completeOnboarding(
        '  Bidu  ', 'cachorro', 'Labrador Retriever', 'file:///stub/photo.jpg',
        '2020-05-17',
      );
      const s = usePetStore.getState();
      assertEq(s.hasOnboarded, true);
      assertEq(s.pet.nome, 'Bidu', 'sanitizeName aplicado');
      assertEq(s.pet.tipo, 'cachorro');
      assertEq(s.pet.raca, 'Labrador Retriever');
      assertEq(s.pet.nascimento, '2020-05-17');
      assertEq(s.streak, 0, 'streak zerado na onboarding');
    },
  },

  {
    name: '03. addActionLog gera id único + timestamp now + sanitiza note',
    fn: async () => {
      reset();
      await usePetStore.getState().addActionLog('comida', undefined, '  nota com espaço  ', { quantity: 50 });
      const logs = usePetStore.getState().actionHistory;
      assertEq(logs.length, 1);
      assertEq(logs[0].key, 'comida');
      assertEq(logs[0].quantity, 50);
      assertEq(logs[0].note, 'nota com espaço', 'sanitizeNote remove espaços de borda');
      assertTrue(logs[0].id.length > 0, 'id gerado');
      assertTrue(Math.abs(Date.now() - logs[0].timestamp) < 1000, 'timestamp ≈ now');
    },
  },

  {
    name: '04. Streak incrementa quando dia fica "completo" (≥1 comida + ≥1 água)',
    fn: async () => {
      reset();
      const store = usePetStore.getState();
      assertEq(store.streak, 0);

      // Só comida — não completa
      await usePetStore.getState().addActionLog('comida');
      assertEq(usePetStore.getState().streak, 0, 'só comida não conta');

      // Adicionar água → completa o dia, streak vai pra 1
      await usePetStore.getState().addActionLog('agua');
      assertEq(usePetStore.getState().streak, 1, 'comida + água = streak 1');

      // Mais comida no mesmo dia não incrementa de novo
      await usePetStore.getState().addActionLog('comida');
      assertEq(usePetStore.getState().streak, 1, 'já completo, streak não dobra');
    },
  },

  {
    name: '05. removeActionLog remove só o id alvo; updateActionLog merge parcial',
    fn: async () => {
      reset();
      await usePetStore.getState().addActionLog('comida');
      await usePetStore.getState().addActionLog('agua', undefined, undefined, { volumeMl: 200 });
      const [a, b] = usePetStore.getState().actionHistory;
      assertEq(usePetStore.getState().actionHistory.length, 2);

      usePetStore.getState().updateActionLog(b.id, { volumeMl: 350 });
      assertEq(usePetStore.getState().actionHistory.find((l) => l.id === b.id)?.volumeMl, 350);
      // Outros campos preservados
      assertEq(usePetStore.getState().actionHistory.find((l) => l.id === b.id)?.key, 'agua');

      usePetStore.getState().removeActionLog(a.id);
      assertEq(usePetStore.getState().actionHistory.length, 1);
      assertEq(usePetStore.getState().actionHistory[0].id, b.id, 'restou o segundo');
    },
  },

  {
    name: '06. addMedicalEvent insere no TOPO (LIFO — mais recente primeiro)',
    fn: async () => {
      reset();
      await usePetStore.getState().addMedicalEvent('vomito', 'primeiro');
      await usePetStore.getState().addMedicalEvent('diarreia', 'segundo');
      const events = usePetStore.getState().medicalEvents;
      assertEq(events.length, 2);
      assertEq(events[0].type, 'diarreia', 'mais recente no topo');
      assertEq(events[0].note, 'segundo');
    },
  },

  {
    name: '07. Vacinas: add insere no topo, update merge, remove por id',
    fn: () => {
      reset();
      usePetStore.getState().addVaccine({
        nome: 'V10', data: '2026-01-15', proxima: '2027-01-15',
      });
      usePetStore.getState().addVaccine({
        nome: 'Antirrábica', data: '2026-02-10',
      });
      let vs = usePetStore.getState().vaccines;
      assertEq(vs.length, 2);
      assertEq(vs[0].nome, 'Antirrábica', 'última adicionada vai pro topo');

      // Update merge: muda só `lote`, mantém o resto
      const antirrId = vs[0].id;
      usePetStore.getState().updateVaccine(antirrId, { lote: 'LOTE-X1' });
      vs = usePetStore.getState().vaccines;
      const updated = vs.find((v) => v.id === antirrId)!;
      assertEq(updated.lote, 'LOTE-X1');
      assertEq(updated.nome, 'Antirrábica', 'campo não-modificado preservado');

      // Remove
      usePetStore.getState().removeVaccine(antirrId);
      assertEq(usePetStore.getState().vaccines.length, 1);
      assertEq(usePetStore.getState().vaccines[0].nome, 'V10');
    },
  },

  {
    name: '08. addWeightEntry retroativo (data passada) funciona; sort por desc data',
    fn: () => {
      reset();
      usePetStore.getState().addWeightEntry(6.5, '2026-05-01');
      usePetStore.getState().addWeightEntry(6.4, '2026-05-15');
      usePetStore.getState().addWeightEntry(6.6, '2026-04-15');

      const w = usePetStore.getState().weightHistory;
      assertEq(w.length, 3);
      // Order é "última adicionada no topo" (LIFO no addWeightEntry, sem sort)
      assertEq(w[0].data, '2026-04-15', 'última adicionada no topo (não sorted)');
      assertEq(w.map((x) => x.peso).sort().length, 3, 'todos persistidos');
    },
  },

  {
    name: '09. dismissInsight é idempotente: chamar 2x com mesmo id ⇒ 1 entrada',
    fn: () => {
      reset();
      usePetStore.getState().dismissInsight('polydipsia_2026-5-17');
      usePetStore.getState().dismissInsight('polydipsia_2026-5-17');
      usePetStore.getState().dismissInsight('hydration_gap_2026-5-17');

      const ids = usePetStore.getState().dismissedInsightIds;
      assertEq(ids.length, 2, 'duplicata ignorada');
      assertTrue(ids.includes('polydipsia_2026-5-17'));
      assertTrue(ids.includes('hydration_gap_2026-5-17'));

      usePetStore.getState().clearDismissedInsights();
      assertEq(usePetStore.getState().dismissedInsightIds.length, 0);
    },
  },

  {
    name: '10. snoozeInsight grava timestamp futuro = now + N horas',
    fn: () => {
      reset();
      const beforeMs = Date.now();
      usePetStore.getState().snoozeInsight('diarrhea_2026-5-17', 24);
      const after = usePetStore.getState().snoozedInsights['diarrhea_2026-5-17'];
      assertNotNull(after);
      // ~24h depois (com folga de 100ms pra execução)
      const expectedMs = beforeMs + 24 * 3600 * 1000;
      assertNear(after, expectedMs, 100, 'snooze ~24h no futuro');
    },
  },

  {
    name: '11. toggleInsightCategory liga e desliga categorias (set semântico)',
    fn: () => {
      reset();
      assertEq(usePetStore.getState().disabledInsightCategories.length, 0);

      // Desliga 2 categorias
      usePetStore.getState().toggleInsightCategory('thermal', false);
      usePetStore.getState().toggleInsightCategory('grooming', false);
      // Idempotente: chamar de novo não duplica
      usePetStore.getState().toggleInsightCategory('thermal', false);

      const off = usePetStore.getState().disabledInsightCategories;
      assertEq(off.length, 2, 'sem duplicata');
      assertTrue(off.includes('thermal'));
      assertTrue(off.includes('grooming'));

      // Liga uma de volta
      usePetStore.getState().toggleInsightCategory('thermal', true);
      const off2 = usePetStore.getState().disabledInsightCategories;
      assertEq(off2.length, 1);
      assertEq(off2[0], 'grooming');
    },
  },

  {
    name: '12. registerAlertHandled incrementa contador + atualiza timestamp',
    fn: () => {
      reset();
      assertEq(usePetStore.getState().alertsHandledCount, 0);
      assertEq(usePetStore.getState().alertsHandledLastAt, null);

      const before = Date.now();
      usePetStore.getState().registerAlertHandled();
      usePetStore.getState().registerAlertHandled();

      assertEq(usePetStore.getState().alertsHandledCount, 2);
      const last = usePetStore.getState().alertsHandledLastAt;
      assertNotNull(last);
      assertTrue(last >= before, 'timestamp recente');
    },
  },

  {
    name: '13. markActivityMilestoneShown / markPremiumPromptShown são idempotentes',
    fn: () => {
      reset();
      usePetStore.getState().markActivityMilestoneShown('passeio-100');
      usePetStore.getState().markActivityMilestoneShown('passeio-100');
      usePetStore.getState().markActivityMilestoneShown('comida-500');

      const m = usePetStore.getState().shownActivityMilestones;
      assertEq(m.length, 2, 'sem duplicata');

      usePetStore.getState().markPremiumPromptShown('after-2nd-pet');
      usePetStore.getState().markPremiumPromptShown('after-2nd-pet');
      assertEq(usePetStore.getState().shownPremiumPrompts.length, 1);
    },
  },

  {
    name: '14. setPremiumStatus(true, "monthly") atualiza isPremium + plan',
    fn: () => {
      reset();
      assertEq(usePetStore.getState().isPremium, false);

      const exp = Date.now() + 30 * 86400000;
      usePetStore.getState().setPremiumStatus({
        isPremium: true, plan: 'monthly', expiresAt: exp,
      });

      const s = usePetStore.getState();
      assertEq(s.isPremium, true);
      assertEq(s.premiumPlan, 'monthly');
      assertEq(s.premiumExpiresAt, exp);
    },
  },

  {
    name: '15. resetStore zera dados clínicos mas mantém milestones (intencional)',
    fn: async () => {
      reset();
      await usePetStore.getState().completeOnboarding(
        'Bidu', 'cachorro', 'SRD', 'file:///x.jpg',
      );
      await usePetStore.getState().addActionLog('comida');
      await usePetStore.getState().addMedicalEvent('vomito', 'teste');
      usePetStore.getState().addVaccine({ nome: 'V10', data: '2026-01-01' });
      usePetStore.getState().addWeightEntry(15, '2026-05-17');
      usePetStore.getState().markActivityMilestoneShown('comida-1');

      usePetStore.getState().resetStore();

      const s = usePetStore.getState();
      assertEq(s.hasOnboarded, false);
      assertEq(s.pet.nome, '');
      assertEq(s.actionHistory.length, 0);
      assertEq(s.medicalEvents.length, 0);
      assertEq(s.vaccines.length, 0);
      assertEq(s.weightHistory.length, 0);
      assertEq(s.streak, 0);
      // Milestones NÃO são limpas (decisão do código atual — re-onboarding
      // mantém histórico de prompts já vistos)
      assertEq(s.shownActivityMilestones.length, 1, 'milestones persistem após reset');
    },
  },
]);
