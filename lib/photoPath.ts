import { Paths } from 'expo-file-system';

// ─── Persistência de fotos em iOS — fix de R3-1+4 ──────────────
//
// Bug crítico achado no TestFlight: usuários abriam o app no dia
// seguinte e a foto do pet/registros estava em branco.
//
// Root cause: iOS reescreve o container UUID em CADA reinstalação
// (incluindo updates do TestFlight e versões da App Store). O path
// absoluto do Documents dir é tipo:
//   file:///var/mobile/Containers/Data/Application/{UUID}/Documents/foto.jpg
//
// O CONTEÚDO do Documents é preservado entre updates, mas o {UUID}
// muda. Se a gente persistir a URI absoluta no MMKV, no próximo
// open do app esse path aponta pra UUID antigo → File not found.
//
// Fix em 2 camadas:
//   1. `toStoredPhoto(absoluteUri)`: extrai SÓ o filename relativo
//   2. `resolvePhotoUri(stored)`: monta URI absoluta com Paths.document.uri
//      do runtime atual. Retro-compatível com URIs absolutas legadas
//      (pega o último segmento depois de "Documents/") e URIs http(s)
//      (passa direto — assume remoto, ex.: Unsplash placeholder antigo).
//
// Strings que entram no resolver:
//   - "cronopet_photo_1234.jpg"  → resolve pra Documents/cronopet_photo_1234.jpg
//   - "file:///.../Documents/cronopet_photo_1234.jpg" (legacy) → re-resolve
//   - "https://..." → retorna como-é (remoto)
//   - "" / undefined → "" (caller decide fallback)

const HTTP_PREFIXES = ['http://', 'https://'];

// toStoredPhoto removido — `persistAndStripPhoto` no store já
// derive o filename inline. Pode voltar se outro callsite precisar.

/**
 * Resolve um valor armazenado (filename, URI legada absoluta, ou URL
 * remota) para uma URI absoluta usável agora. Idempotente — se já
 * for resolvável, retorna como tá.
 */
export function resolvePhotoUri(stored: string | null | undefined): string {
  if (!stored) return '';
  if (HTTP_PREFIXES.some((p) => stored.startsWith(p))) return stored;

  const docUri = Paths.document.uri; // ex.: file:///var/.../Documents/

  // Caso 1: já é file:// — pode ser legado com UUID antigo. Re-anchorar
  // no docUri atual usando apenas o filename.
  if (stored.startsWith('file://')) {
    const filename = stored.slice(stored.lastIndexOf('/') + 1);
    if (!filename) return stored; // garbled, fallback
    return `${docUri}${filename}`;
  }

  // Caso 2: filename relativo (forma canônica nova)
  return `${docUri}${stored}`;
}
