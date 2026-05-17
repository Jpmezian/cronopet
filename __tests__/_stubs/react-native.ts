/**
 * Stub mínimo de `react-native`. Apenas APIs que os arquivos testáveis
 * importam no topo (não no callsite — top-level imports forçam o
 * carregamento). Atualmente: useColorScheme + Platform.
 *
 * Hooks que usam essas APIs em render context ainda precisam de um
 * renderHook real pra terem comportamento testado. Esse stub só evita
 * o crash de IMPORT — testes de funções puras extraídas dos hooks
 * continuam não usando o React lifecycle.
 */

/** Stub: sempre retorna 'light'. Testes que dependem disso devem
 *  testar a fn pura extraída (ex: pickIsDark) e não o hook. */
export function useColorScheme(): 'light' | 'dark' | null {
  return 'light';
}

export const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web',
  Version: '17.0',
  select: <T>(specifics: { ios?: T; android?: T; default?: T }): T | undefined =>
    specifics.ios ?? specifics.default,
};
