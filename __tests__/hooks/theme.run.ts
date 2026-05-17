/**
 * Suite — hooks/useThemeColors.ts (pickIsDark pure fn)
 *
 * Lógica de prioridade entre user-override e system scheme.
 *   themeMode='dark'   → SEMPRE dark (user explicitamente escolheu)
 *   themeMode='light'  → SEMPRE light
 *   themeMode='system' → segue scheme; null/undefined cai em light
 */

import { pickIsDark } from '@/hooks/useThemeColors';
import { assertEq, runSuite } from '../_lib/assert';

runSuite('hooks/useThemeColors', [
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
]);
