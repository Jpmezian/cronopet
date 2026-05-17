/**
 * Suite — lib/security.ts (input + rate limit)
 *
 * Cobertura:
 *  - escapeHtml: XSS payload neutralizado
 *  - sanitizeName/sanitizeNote: limites, controle chars, espaços
 *  - checkPasswordStrength: gradiente + threshold isValid
 *  - isValidEmail: aceita formatos comuns, rejeita inválidos
 *  - Rate limit: allow → block → window expira (com time mock)
 *
 * Não cobre: `generateSecureInviteCode` — depende de `expo-crypto`
 * (RNG nativo iOS/Android) que não roda em Node puro. Validar via
 * Maestro/device. Documentado em TESTING.md.
 */

import {
  escapeHtml,
  sanitizeName,
  sanitizeNote,
  checkPasswordStrength,
  isValidEmail,
  checkRateLimit,
  recordRateLimitAttempt,
  clearRateLimit,
  INPUT_LIMITS,
} from '@/lib/security';
import {
  assertEq, assertTrue, assertFalse, runSuite,
  mockTime, advanceTime, restoreTime,
} from '../_lib/assert';

runSuite('lib/security.ts', [
  {
    name: '01. escapeHtml neutraliza XSS payload e lida com null/undefined',
    fn: () => {
      const payload = '<img src=x onerror="alert(1)">';
      const escaped = escapeHtml(payload);
      assertFalse(escaped.includes('<img'), 'tag <img foi escapada');
      assertFalse(escaped.includes('"'), 'aspa dupla foi escapada');
      assertTrue(escaped.includes('&lt;img'), 'contém forma escapada');
      assertEq(escapeHtml(null), '');
      assertEq(escapeHtml(undefined), '');
      assertEq(escapeHtml(42), '42', 'number coerced');
    },
  },

  {
    name: '02. sanitizeName: trim + colapsa espaços + remove controle + trunca',
    fn: () => {
      assertEq(sanitizeName('  Bidu  '), 'Bidu', 'trim');
      assertEq(sanitizeName('Multi    Space    Pet'), 'Multi Space Pet', 'collapse');
      // Controle char (U+0001) deve sumir, deixando o resto intacto
      const withCtrl = `Bi${String.fromCharCode(1)}du`;
      assertEq(sanitizeName(withCtrl), 'Bidu', 'control char stripped');
      assertEq(sanitizeName('A'.repeat(100)).length, INPUT_LIMITS.PET_NAME_MAX, 'trunca em MAX');
      assertEq(sanitizeName(''), '', 'vazio mantém vazio');
    },
  },

  {
    name: '03. sanitizeNote preserva \\n e \\t mas remove outros control chars',
    fn: () => {
      const input = `linha1\nlinha2\tindentada`;
      const out = sanitizeNote(input);
      assertTrue(out.includes('\n'), 'preserva newline');
      assertTrue(out.includes('\t'), 'preserva tab');

      // Bell char (U+0007) deve sumir
      const dirty = `nota${String.fromCharCode(7)}suja`;
      assertEq(sanitizeNote(dirty), 'notasuja');

      // Trunca em NOTE_MAX
      const huge = 'x'.repeat(INPUT_LIMITS.NOTE_MAX + 100);
      assertEq(sanitizeNote(huge).length, INPUT_LIMITS.NOTE_MAX);
    },
  },

  {
    name: '04. checkPasswordStrength: score capped em 4, isValid pede >=3 + min length',
    fn: () => {
      const weak = checkPasswordStrength('abc');
      assertFalse(weak.isValid, 'curta demais é inválida');
      assertTrue(weak.issues.length > 0);

      const strong = checkPasswordStrength('S3nh@Forte');
      assertTrue(strong.isValid, 'mix completo é válida');
      assertTrue(strong.score >= 3, `score >=3, recebeu ${strong.score}`);

      const maxed = checkPasswordStrength('A1bc!def@ghI3');
      assertTrue(maxed.score <= 4, 'score nunca passa 4 (capped)');

      // Sem letra maiúscula → falta 1 issue
      const noUpper = checkPasswordStrength('senha1@longa');
      assertTrue(noUpper.issues.some((i) => /mai[uú]scula/i.test(i)), 'flagga falta de maiúscula');
    },
  },

  {
    name: '05. isValidEmail: formatos comuns aceitos, inválidos rejeitados',
    fn: () => {
      assertTrue(isValidEmail('joao@cronopet.com.br'));
      assertTrue(isValidEmail('a+tag@b.co'));
      assertFalse(isValidEmail('sem-arroba.com'));
      assertFalse(isValidEmail('@semlocal.com'));
      assertFalse(isValidEmail('semdominio@'));
      assertFalse(isValidEmail(''));
      assertFalse(isValidEmail('   '));
      const huge = 'a'.repeat(INPUT_LIMITS.EMAIL_MAX) + '@b.co';
      assertFalse(isValidEmail(huge), 'rejeita > EMAIL_MAX');
    },
  },

  {
    name: '06. Rate limit: 5 attempts allowed, 6ª bloqueia, window expira allowed de novo',
    fn: () => {
      const opts = { maxAttempts: 5, windowMs: 60_000, lockoutMs: 30_000 };
      const KEY = 'test:rate:basic';

      mockTime(1_000_000);
      try {
        clearRateLimit(KEY);

        for (let i = 1; i <= 5; i++) {
          const r = checkRateLimit(KEY, opts);
          assertTrue(r.allowed, `tentativa ${i} deve passar`);
          recordRateLimitAttempt(KEY);
        }

        const sixth = checkRateLimit(KEY, opts);
        assertFalse(sixth.allowed, '6ª bloqueada');
        assertTrue(sixth.remainingMs > 0, 'remainingMs informado');

        advanceTime(61_000);
        assertTrue(checkRateLimit(KEY, opts).allowed, 'após windowMs+1s permite');
      } finally {
        restoreTime();
        clearRateLimit(KEY);
      }
    },
  },

  {
    name: '07. clearRateLimit reseta o estado imediatamente',
    fn: () => {
      const opts = { maxAttempts: 3, windowMs: 60_000, lockoutMs: 30_000 };
      const KEY = 'test:rate:clear';

      mockTime(2_000_000);
      try {
        clearRateLimit(KEY);
        for (let i = 0; i < 3; i++) {
          checkRateLimit(KEY, opts);
          recordRateLimitAttempt(KEY);
        }
        assertFalse(checkRateLimit(KEY, opts).allowed, 'esgotado bloqueia');

        clearRateLimit(KEY);
        assertTrue(checkRateLimit(KEY, opts).allowed, 'após clear, allowed de novo');
      } finally {
        restoreTime();
        clearRateLimit(KEY);
      }
    },
  },
]);
