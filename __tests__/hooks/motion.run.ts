/**
 * Suite — hooks/useMotion.ts (pickEntering + pickSectionEntering pure fns)
 *
 * Decisão de motion isolada do Reanimated. Bug aqui = animação errada
 * pra usuário com reduced-motion (acessibilidade quebrada) ou stagger
 * incoerente em listas.
 */

import { pickEntering, pickSectionEntering } from '@/hooks/useMotion';
import { assertEq, runSuite } from '../_lib/assert';

runSuite('hooks/useMotion', [
  {
    name: '01. reducedMotion=true: sempre fade 150ms, ignora index/delay',
    fn: () => {
      const a = pickEntering(true, 0);
      const b = pickEntering(true, 5);
      const c = pickEntering(true, 99, 200);
      assertEq(a.kind, 'fade');
      assertEq(b.kind, 'fade');
      assertEq(c.kind, 'fade');
      if (a.kind === 'fade') assertEq(a.durationMs, 150);
      if (c.kind === 'fade') assertEq(c.durationMs, 150, 'delay/index ignorados quando reduced');
    },
  },

  {
    name: '02. reducedMotion=false: fadeInDownSpring com stagger crescente',
    fn: () => {
      const a = pickEntering(false, 0);
      const b = pickEntering(false, 1);
      const c = pickEntering(false, 3);
      assertEq(a.kind, 'fadeInDownSpring');
      if (a.kind === 'fadeInDownSpring') assertEq(a.delayMs, 0,    'index 0 = sem delay');
      if (b.kind === 'fadeInDownSpring') assertEq(b.delayMs, 60,   'index 1 * default delay 60');
      if (c.kind === 'fadeInDownSpring') assertEq(c.delayMs, 180,  'index 3 * 60');
    },
  },

  {
    name: '03. pickEntering: delay custom propaga (index * delay)',
    fn: () => {
      const slow = pickEntering(false, 2, 200);
      assertEq(slow.kind, 'fadeInDownSpring');
      if (slow.kind === 'fadeInDownSpring') assertEq(slow.delayMs, 400, '2 * 200');
    },
  },

  {
    name: '04. pickSectionEntering: stagger maior (100ms vs 60ms de pickEntering)',
    fn: () => {
      const reduced = pickSectionEntering(true, 5);
      const normal = pickSectionEntering(false, 3);
      assertEq(reduced.kind, 'fade', 'reduced-motion sempre fade');
      assertEq(normal.kind, 'fadeInDownSpring');
      if (normal.kind === 'fadeInDownSpring') {
        assertEq(normal.delayMs, 300, 'section usa 100ms por slot, não 60ms');
      }
    },
  },
]);
