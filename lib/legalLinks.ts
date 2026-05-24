import { Linking } from 'react-native';

// ─── URLs jurídicas (L6) ──────────────────────────────────────
//
// URLs públicas dos documentos legais. **Placeholder até hospedar
// real em cronopet.com.br/{privacidade,termos,excluir-conta}.**
//
// Plano (parecer jurídico maio/2026):
//   1. Contratar Iubenda Pro pt-BR (€39/mês) + revisão por advogado
//      especializado em direito digital (R$ 2-4k única vez)
//   2. Hospedar páginas estáticas em cronopet.com.br
//   3. Atualizar estas URLs
//
// Apple App Privacy e Google Data Safety EXIGEM URLs idênticas às
// listadas na Privacy Policy do app — mesma URL nos 3 lugares.

// Mantido interno por enquanto — pode virar export se outras telas precisarem
const LEGAL_URLS = {
  privacy:        'https://cronopet.com.br/privacidade',
  terms:          'https://cronopet.com.br/termos',
  accountDelete:  'https://cronopet.com.br/excluir-conta',
  subscription:   'https://cronopet.com.br/assinatura',
} as const;

export type LegalDoc = keyof typeof LEGAL_URLS;

/**
 * Abre o documento no browser do device. Falha gracioso se URL
 * inválida ou navegador indisponível.
 */
export async function openLegal(doc: LegalDoc): Promise<void> {
  const url = LEGAL_URLS[doc];
  try {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  } catch {
    // Engole — usuário pode tentar de novo
  }
}
