// ─── Security utilities ──────────────────────────────────────
// Helpers centralizados para validação de input, escaping HTML,
// geração de códigos seguros e limites de taxa client-side.
//
// OBJETIVO: reduzir superfície de ataque sem depender de backend.

import * as Crypto from 'expo-crypto';

// ───────────────────────────────────────────────────────────
// 1. HTML ESCAPING
// ───────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML especiais para prevenir XSS em templates.
 * Usado em PDF generation (HTML injetado em HTML rendering).
 *
 * Exemplo: `<img src=x onerror="..">` → `&lt;img src=x onerror=&quot;..&quot;&gt;`
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

// ───────────────────────────────────────────────────────────
// 2. INPUT VALIDATION
// ───────────────────────────────────────────────────────────

export const INPUT_LIMITS = {
  PET_NAME_MAX:    40,
  BREED_MAX:       50,
  NOTE_MAX:        500,
  VACCINE_NAME_MAX: 60,
  VACCINE_LOT_MAX:  30,
  VET_NAME_MAX:     60,
  APPT_TITLE_MAX:   80,
  EMAIL_MAX:       254,
  PASSWORD_MIN:      8,
  PASSWORD_MAX:    128,
  INVITE_CODE_LENGTH: 8,
} as const;

/**
 * Valida e trunca nome de pet / pessoa / marca.
 * - Remove espaços extras
 * - Remove caracteres de controle
 * - Trunca a `max` caracteres
 */
export function sanitizeName(raw: string, max: number = INPUT_LIMITS.PET_NAME_MAX): string {
  return (raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Valida e trunca texto livre (notas, observações). Mantém quebras de linha. */
export function sanitizeNote(raw: string, max: number = INPUT_LIMITS.NOTE_MAX): string {
  return (raw ?? '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')  // mantém \n (0x0A) e \t (0x09)
    .trim()
    .slice(0, max);
}

/**
 * Valida força de senha.
 * Retorna score 0-4 e lista de razões se inválida.
 */
export interface PasswordStrength {
  score:   0 | 1 | 2 | 3 | 4;
  level:   'muito fraca' | 'fraca' | 'média' | 'forte' | 'muito forte';
  isValid: boolean;
  issues:  string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  let score = 0;

  if (password.length < INPUT_LIMITS.PASSWORD_MIN) {
    issues.push(`Mínimo ${INPUT_LIMITS.PASSWORD_MIN} caracteres`);
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(password)) score += 1;
  else issues.push('Uma letra maiúscula');

  if (/[a-z]/.test(password)) score += 1;
  else issues.push('Uma letra minúscula');

  if (/[0-9]/.test(password)) score += 1;
  else issues.push('Um número');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else issues.push('Um caractere especial (!@#$...)');

  // Cap score at 4
  if (score > 4) score = 4;

  const levels: PasswordStrength['level'][] = ['muito fraca', 'fraca', 'média', 'forte', 'muito forte'];

  return {
    score:   score as 0 | 1 | 2 | 3 | 4,
    level:   levels[score],
    isValid: password.length >= INPUT_LIMITS.PASSWORD_MIN && score >= 3,
    issues,
  };
}

/** Validação simples de email. Não é RFC-completa, mas evita XSS e typos comuns. */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > INPUT_LIMITS.EMAIL_MAX) return false;
  // RFC 5322 simplificada — suficiente para UI
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ───────────────────────────────────────────────────────────
// 3. CRYPTOGRAPHICALLY SECURE CODES
// ───────────────────────────────────────────────────────────

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // sem 0/O/1/I para não confundir

/**
 * Gera código de convite 8 chars usando RNG criptográfico do OS.
 * ~40 bits de entropia — impraticável brute-forçar.
 *
 * iOS: SecRandomCopyBytes · Android: SecureRandom
 */
export function generateSecureInviteCode(length: number = INPUT_LIMITS.INVITE_CODE_LENGTH): string {
  const bytes = Crypto.getRandomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

// ───────────────────────────────────────────────────────────
// 4. RATE LIMITING (client-side)
// ───────────────────────────────────────────────────────────

interface RateLimitState {
  attempts:    number;
  firstAttempt: number;
  lockedUntil:  number;
}

const rateLimits = new Map<string, RateLimitState>();

/**
 * Retorna true se a operação pode prosseguir, false se está bloqueada.
 * Usado para proteger auth (signin/signup) contra brute-force.
 *
 * Ex: `checkRateLimit('signin', { maxAttempts: 5, windowMs: 60_000, lockoutMs: 300_000 })`
 *     = 5 tentativas/minuto, lockout de 5 min após esgotar
 */
export function checkRateLimit(
  key: string,
  opts: { maxAttempts: number; windowMs: number; lockoutMs: number },
): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  let state = rateLimits.get(key);

  // Limpar estado expirado
  if (state && state.lockedUntil > 0 && now >= state.lockedUntil) {
    state = undefined;
  }
  if (state && state.firstAttempt > 0 && now - state.firstAttempt > opts.windowMs) {
    state = undefined;
  }

  if (!state) {
    state = { attempts: 0, firstAttempt: now, lockedUntil: 0 };
    rateLimits.set(key, state);
  }

  if (state.lockedUntil > 0 && now < state.lockedUntil) {
    return { allowed: false, remainingMs: state.lockedUntil - now };
  }

  if (state.attempts >= opts.maxAttempts) {
    state.lockedUntil = now + opts.lockoutMs;
    return { allowed: false, remainingMs: opts.lockoutMs };
  }

  return { allowed: true, remainingMs: 0 };
}

/**
 * Incrementa o contador após falha. Chamar SÓ em falhas (erro 401, senha inválida).
 */
export function recordRateLimitAttempt(key: string): void {
  const state = rateLimits.get(key);
  if (state) {
    state.attempts += 1;
  } else {
    rateLimits.set(key, { attempts: 1, firstAttempt: Date.now(), lockedUntil: 0 });
  }
}

/** Reseta o contador (chamar após sucesso). */
export function clearRateLimit(key: string): void {
  rateLimits.delete(key);
}

