/**
 * Stub mínimo de `react-native-reanimated` pra rodar useMotion em Node.
 * Apenas o que o módulo importa no top-level — chainable noop pra
 * evitar crash em tests que importam o hook mas só testam fns puras
 * extraídas (pickEntering / pickSectionEntering).
 */

const chainable: any = new Proxy(() => chainable, {
  get: () => chainable,
});

export const FadeIn: any = chainable;
export const FadeOut: any = chainable;
export const FadeInDown: any = chainable;
export const FadeInUp: any = chainable;
export const FadeOutDown: any = chainable;
export const FadeOutUp: any = chainable;
export const SlideInDown: any = chainable;
export const SlideOutDown: any = chainable;
export const SlideInUp: any = chainable;
export const SlideOutUp: any = chainable;

export type BaseAnimationBuilder = any;

export function useReducedMotion(): boolean {
  return false;
}
