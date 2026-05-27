/**
 * Suite — migrateLegacyPetIds + isLegacyId
 *
 * Cobertura:
 *  - isLegacyId reconhece formatos `<digits>-<6chars>` e `<digits>-legacy`
 *  - isLegacyId rejeita UUID v4 válido (idempotência)
 *  - migrateLegacyPetIds substitui pet.id legacy por uuid v4
 *  - activePetId atualizado quando aponta pro pet migrado
 *  - actionHistory[].petId reescrito; outros logs intocados
 *  - vaccines / appointments / medical_events / weight_entries reescritos
 *  - state com apenas pets uuid v4: no-op (retorna 0)
 *  - state com mistura legacy + uuid: só legacy migra
 *
 * Stubs ativos (tsconfig.test.json):
 *  - expo-crypto.randomUUID retorna `00000000-0000-4000-8000-<counter>`
 *    determinístico — facilita asserts exatos de id novo.
 */

import {
  isLegacyId,
  migrateLegacyPetIds,
} from '@/store/usePetStore';
import {
  assertEq, assertTrue, assertFalse, runSuite,
} from '../_lib/assert';
import type {
  PetProfile, ActionLog, MedicalEvent,
  Vaccine, Appointment, WeightEntry,
} from '@/types/pet';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makePet(id: string, nome = 'Rex'): PetProfile {
  return { id, nome, tipo: 'cachorro', raca: 'SRD', foto: '' };
}

function makeEmptyState() {
  return {
    pets:          {} as Record<string, PetProfile>,
    activePetId:   '',
    pet:           makePet('placeholder'),
    actionHistory: [] as ActionLog[],
    medicalEvents: [] as MedicalEvent[],
    vaccines:      [] as Vaccine[],
    appointments:  [] as Appointment[],
    weightHistory: [] as WeightEntry[],
  };
}

runSuite('migrateLegacyPetIds', [
  {
    name: '01. isLegacyId: formato <epoch>-<6base36> → true',
    fn: () => {
      assertTrue(isLegacyId('1700000000000-abc123'));
      assertTrue(isLegacyId('1700000000000-xyz789'));
      assertTrue(isLegacyId('1234567890-a0b1c2'));
    },
  },
  {
    name: '02. isLegacyId: formato <epoch>-legacy → true',
    fn: () => {
      assertTrue(isLegacyId('1700000000000-legacy'));
    },
  },
  {
    name: '03. isLegacyId: uuid v4 válido → false (idempotência)',
    fn: () => {
      assertFalse(isLegacyId('550e8400-e29b-41d4-a716-446655440000'));
      assertFalse(isLegacyId('00000000-0000-4000-8000-000000000001'));
    },
  },
  {
    name: '04. isLegacyId: empty/null/undefined → false',
    fn: () => {
      assertFalse(isLegacyId(''));
      assertFalse(isLegacyId(null));
      assertFalse(isLegacyId(undefined));
    },
  },
  {
    name: '05. isLegacyId: random string que não casa regex → false',
    fn: () => {
      assertFalse(isLegacyId('not-an-id'));
      assertFalse(isLegacyId('abc-123'));
      assertFalse(isLegacyId('1700000000000-abcdef-extra'));
    },
  },
  {
    name: '06. Migra pet com id <epoch>-<6chars> → uuid v4',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      state.pets[oldId] = makePet(oldId);

      const migrated = migrateLegacyPetIds(state);

      assertEq(migrated, 1);
      assertEq(state.pets[oldId], undefined, 'oldId removido de pets');

      const newIds = Object.keys(state.pets);
      assertEq(newIds.length, 1);
      assertTrue(UUID_V4.test(newIds[0]), `novo id deve ser uuid v4 (recebeu ${newIds[0]})`);
      assertEq(state.pets[newIds[0]].id, newIds[0], 'pet.id reescrito');
    },
  },
  {
    name: '07. Migra pet com id <epoch>-legacy → uuid v4',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-legacy';
      state.pets[oldId] = makePet(oldId);

      const migrated = migrateLegacyPetIds(state);

      assertEq(migrated, 1);
      const newIds = Object.keys(state.pets);
      assertTrue(UUID_V4.test(newIds[0]));
    },
  },
  {
    name: '08. Pet já com uuid v4 → NÃO migrado (idempotência)',
    fn: () => {
      const state = makeEmptyState();
      const goodId = '550e8400-e29b-41d4-a716-446655440000';
      state.pets[goodId] = makePet(goodId);

      const migrated = migrateLegacyPetIds(state);

      assertEq(migrated, 0);
      assertEq(state.pets[goodId].id, goodId, 'id preservado');
      assertEq(Object.keys(state.pets).length, 1);
    },
  },
  {
    name: '09. activePetId atualizado se apontava pro pet migrado',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      state.pets[oldId] = makePet(oldId);
      state.activePetId = oldId;
      state.pet = state.pets[oldId];

      migrateLegacyPetIds(state);

      const newId = Object.keys(state.pets)[0];
      assertEq(state.activePetId, newId);
      assertEq(state.pet.id, newId);
    },
  },
  {
    name: '10. activePetId preservado se aponta pra outro pet (não legacy)',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      const goodId = '550e8400-e29b-41d4-a716-446655440000';
      state.pets[oldId] = makePet(oldId, 'PetLegacy');
      state.pets[goodId] = makePet(goodId, 'PetUuid');
      state.activePetId = goodId;
      state.pet = state.pets[goodId];

      migrateLegacyPetIds(state);

      assertEq(state.activePetId, goodId, 'activePetId mantido');
      assertEq(state.pet.id, goodId);
      assertFalse(state.pets[oldId], 'pet legacy removido');
      assertEq(Object.keys(state.pets).length, 2, '1 novo uuid + 1 uuid preservado');
    },
  },
  {
    name: '11. actionHistory[].petId reescrito pra logs do pet migrado',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      state.pets[oldId] = makePet(oldId);
      state.actionHistory = [
        { id: 'log-1', petId: oldId, key: 'comida', timestamp: 1 },
        { id: 'log-2', petId: oldId, key: 'agua',   timestamp: 2 },
      ] as ActionLog[];

      migrateLegacyPetIds(state);

      const newId = Object.keys(state.pets)[0];
      assertEq(state.actionHistory[0].petId, newId);
      assertEq(state.actionHistory[1].petId, newId);
    },
  },
  {
    name: '12. actionHistory[].petId NÃO tocado pra logs de outro pet',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      const otherId = '550e8400-e29b-41d4-a716-446655440000';
      state.pets[oldId] = makePet(oldId, 'PetLegacy');
      state.pets[otherId] = makePet(otherId, 'PetOutro');
      state.actionHistory = [
        { id: 'log-1', petId: oldId,   key: 'comida', timestamp: 1 },
        { id: 'log-2', petId: otherId, key: 'agua',   timestamp: 2 },
      ] as ActionLog[];

      migrateLegacyPetIds(state);

      // log-1 deve ter petId trocado, log-2 NÃO
      assertFalse(state.actionHistory[0].petId === oldId, 'log-1 petId reescrito');
      assertEq(state.actionHistory[1].petId, otherId, 'log-2 petId intocado');
    },
  },
  {
    name: '13. vaccines / appointments / medical_events / weight_entries reescritos',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      state.pets[oldId] = makePet(oldId);

      state.vaccines      = [{ id: 'v1', petId: oldId, nome: 'V8', data: '2026-01-01' }] as Vaccine[];
      state.appointments  = [{ id: 'a1', petId: oldId, titulo: 'check', data: '2026-02-01' }] as Appointment[];
      state.medicalEvents = [{ id: 'm1', petId: oldId, type: 'vomito' as any, timestamp: 1 }] as MedicalEvent[];
      state.weightHistory = [{ id: 'w1', petId: oldId, peso: 12.5, data: '2026-01-15' }] as WeightEntry[];

      migrateLegacyPetIds(state);

      const newId = Object.keys(state.pets)[0];
      assertEq(state.vaccines[0].petId, newId,      'vacina reescrita');
      assertEq(state.appointments[0].petId, newId,  'consulta reescrita');
      assertEq(state.medicalEvents[0].petId, newId, 'evento médico reescrito');
      assertEq(state.weightHistory[0].petId, newId, 'peso reescrito');
    },
  },
  {
    name: '14. Sem petId em log/vaccine/etc: campo preservado undefined',
    fn: () => {
      const state = makeEmptyState();
      const oldId = '1700000000000-abc123';
      state.pets[oldId] = makePet(oldId);

      state.actionHistory = [
        { id: 'log-orphan', key: 'comida', timestamp: 1 },
      ] as ActionLog[];

      migrateLegacyPetIds(state);

      assertEq(state.actionHistory[0].petId, undefined, 'log órfão preservado');
    },
  },
  {
    name: '15. State vazio: no-op (retorna 0)',
    fn: () => {
      const state = makeEmptyState();
      const migrated = migrateLegacyPetIds(state);
      assertEq(migrated, 0);
    },
  },
]);
