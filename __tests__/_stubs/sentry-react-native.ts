/**
 * Stub de `@sentry/react-native` — silencia breadcrumbs e exceptions.
 * Pra testar comportamento de erro, capture explicitly via try/catch.
 */

export function captureException(_err: unknown, _opts?: unknown): void { /* no-op */ }
export function captureMessage(_msg: string, _opts?: unknown): void { /* no-op */ }
export function addBreadcrumb(_b: unknown): void { /* no-op */ }
export function setUser(_u: unknown): void { /* no-op */ }
export function setTag(_k: string, _v: string): void { /* no-op */ }
export function init(_opts?: unknown): void { /* no-op */ }
