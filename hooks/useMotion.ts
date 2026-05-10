import { useReducedMotion } from 'react-native-reanimated';
import { FadeInDown, FadeIn, BaseAnimationBuilder } from 'react-native-reanimated';

/**
 * Hook para animações de entrada adaptativas.
 * Com "Reduzir Movimento" ativo no sistema:
 *   - sem spring, sem delay, sem stagger
 *   - fade simples de 150ms
 *
 * Uso em listas:
 *   const { entering } = useMotion();
 *   <Animated.View entering={entering(index)}>
 */
export function useMotion() {
  const reducedMotion = useReducedMotion();

  /**
   * Animação de entrada para itens de lista com stagger.
   * @param index  posição do item na lista
   * @param delay  delay base em ms por item (padrão 60ms)
   */
  const entering = (index = 0, delay = 60): BaseAnimationBuilder => {
    if (reducedMotion) {
      return FadeIn.duration(150) as unknown as BaseAnimationBuilder;
    }
    return FadeInDown.delay(index * delay).springify() as unknown as BaseAnimationBuilder;
  };

  /**
   * Animação de entrada para seções (stagger maior).
   * @param index  posição da seção
   */
  const sectionEntering = (index = 0): BaseAnimationBuilder => {
    if (reducedMotion) {
      return FadeIn.duration(150) as unknown as BaseAnimationBuilder;
    }
    return FadeInDown.delay(index * 100).springify() as unknown as BaseAnimationBuilder;
  };

  return { reducedMotion, entering, sectionEntering };
}
