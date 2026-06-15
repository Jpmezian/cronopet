/**
 * Suite — hooks/useThemeColors.ts (pickIsDark) + constants/colors
 * (migrateLegacyPalette).
 *
 * Cobre:
 *   • Lógica de prioridade entre user-override e system scheme.
 *   • Migration Q3 (Redesign Bold v3 Fase 0a, 2026-06-14): paletteMode
 *     'light-neutral' / 'dark-neutral' deprecados → cronopet + tone.
 */

import { pickIsDark } from '@/hooks/useThemeColors';
import { migrateLegacyPalette } from '@/constants/colors';
import { assertEq, runSuite } from '../_lib/assert';

runSuite('hooks/useThemeColors + migrateLegacyPalette', [
  {
    name: '01. themeMode="dark" sobrepõe scheme do sistema',
    fn: () => {
      assertEq(pickIsDark('dark', 'light'),     true, 'dark over light system');
      assertEq(pickIsDark('dark', 'dark'),      true, 'dark + dark');
      assertEq(pickIsDark('dark', null),        true, 'dark + null scheme');
      assertEq(pickIsDark('dark', undefined),   true, 'dark + undefined scheme');
    },
  },

  {
    name: '02. themeMode="light" sobrepõe scheme do sistema',
    fn: () => {
      assertEq(pickIsDark('light', 'dark'),     false, 'light over dark system');
      assertEq(pickIsDark('light', 'light'),    false);
      assertEq(pickIsDark('light', null),       false);
    },
  },

  {
    name: '03. themeMode="system" segue scheme; null/undefined → light',
    fn: () => {
      assertEq(pickIsDark('system', 'dark'),     true,  'system + dark scheme');
      assertEq(pickIsDark('system', 'light'),    false, 'system + light scheme');
      assertEq(pickIsDark('system', null),       false, 'sem scheme info, fallback light');
      assertEq(pickIsDark('system', undefined),  false);
    },
  },

  // ── Migration Q3 ─────────────────────────────────────────────

  {
    name: '04. migrateLegacyPalette: light-neutral → cronopet + light + mint',
    fn: () => {
      const r = migrateLegacyPalette({ paletteMode: 'light-neutral', themeMode: 'system' });
      assertEq(r.paletteMode, 'cronopet', 'paletteMode forçado a cronopet');
      assertEq(r.themeMode,   'light',    'themeMode mapeado pra light (paleta era light)');
      assertEq(r.tone,        'mint',     'tone default mint');
      assertEq(r.migrated,    true,       'flag de migration verdadeiro');
    },
  },

  {
    name: '05. migrateLegacyPalette: dark-neutral → cronopet + dark + mint',
    fn: () => {
      const r = migrateLegacyPalette({ paletteMode: 'dark-neutral', themeMode: 'system' });
      assertEq(r.paletteMode, 'cronopet');
      assertEq(r.themeMode,   'dark', 'themeMode mapeado pra dark (paleta era dark)');
      assertEq(r.tone,        'mint');
      assertEq(r.migrated,    true);
    },
  },

  {
    name: '06. migrateLegacyPalette: cronopet preserva themeMode + tone existente',
    fn: () => {
      const r = migrateLegacyPalette({ paletteMode: 'cronopet', themeMode: 'dark', tone: 'terroso' });
      assertEq(r.paletteMode, 'cronopet');
      assertEq(r.themeMode,   'dark',    'themeMode preservado');
      assertEq(r.tone,        'terroso', 'tone preservado');
      assertEq(r.migrated,    false,     'sem migration (já era cronopet)');
    },
  },

  {
    name: '07. migrateLegacyPalette: cronopet sem tone → default mint',
    fn: () => {
      const r = migrateLegacyPalette({ paletteMode: 'cronopet', themeMode: 'system' });
      assertEq(r.tone, 'mint', 'tone undefined → default mint');
      assertEq(r.migrated, false, 'sem migration de paleta — só default de tone');
    },
  },

  {
    name: '08. migrateLegacyPalette: idempotente (re-aplicar não muda)',
    fn: () => {
      const first  = migrateLegacyPalette({ paletteMode: 'light-neutral', themeMode: 'system' });
      const second = migrateLegacyPalette({
        paletteMode: first.paletteMode,
        themeMode:   first.themeMode,
        tone:        first.tone,
      });
      assertEq(second.paletteMode, first.paletteMode, 'paletteMode idem');
      assertEq(second.themeMode,   first.themeMode,   'themeMode idem');
      assertEq(second.tone,        first.tone,        'tone idem');
      assertEq(second.migrated,    false,             'segunda passada não migra');
    },
  },
]);
