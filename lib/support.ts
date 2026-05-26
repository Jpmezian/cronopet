// ─── support — canal de contato via mailto: ──────────────────
//
// Por que mailto: e não form in-app:
//   - Zero infra (sem Edge Function, sem tabela, sem Resend)
//   - Funciona offline (compose fica salvo no rascunho do email)
//   - Usuário já tem o app de email configurado — sem fricção de
//     criar conta / login num form web
//   - Resposta vem direto do destinatário (não somos intermediários
//     que podem perder a thread)
//
// Quando virar gargalo (ex.: >50 emails/dia, categorização manual
// inviável): migrar pra Edge Function + tabela support_tickets +
// painel admin. Por enquanto, mailto: + filtros no Gmail resolve.

import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

const SUPPORT_EMAIL = 'contato@cronopet.com.br';

export type SupportCategory = 'bug' | 'sugestao' | 'duvida' | 'outro';

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  bug:      'Bug',
  sugestao: 'Sugestão',
  duvida:   'Dúvida',
  outro:    'Outro',
};

const CATEGORY_TEMPLATE: Record<SupportCategory, string> = {
  bug:      'O que aconteceu:\n\nO que eu esperava que acontecesse:\n\nPasso a passo pra reproduzir (se possível):\n1. \n2. \n3. ',
  sugestao: 'Sua ideia:\n\nO problema que ela resolveria:\n\nComo você imagina que funcionaria:',
  duvida:   'Sua dúvida:',
  outro:    'Como podemos ajudar:',
};

/**
 * Monta corpo do email com metadata técnica do device + template
 * por categoria. Coloca o template em primeiro lugar (cursor cai
 * onde o user precisa digitar) e a metadata no rodapé.
 */
function buildBody(category: SupportCategory): string {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const os         = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const osVersion  = String(Platform.Version);

  return [
    CATEGORY_TEMPLATE[category],
    '',
    '',
    '─────────────────────',
    'Não apague as informações abaixo (ajudam a investigar):',
    `• CronoPet ${appVersion}`,
    `• ${os} ${osVersion}`,
  ].join('\n');
}

/**
 * Abre o app de email padrão com destinatário + assunto + corpo
 * pré-preenchidos. Se nenhum app de email estiver configurado
 * (raro, mas acontece em Android sem Gmail logado), o caller
 * recebe `false` e pode exibir fallback (copiar email pro
 * clipboard, mostrar instruções, etc).
 */
export async function openSupportEmail(
  category: SupportCategory,
): Promise<boolean> {
  const subject = `[CronoPet] ${CATEGORY_LABEL[category]}`;
  const body    = buildBody(category);
  const url     = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export { SUPPORT_EMAIL };
