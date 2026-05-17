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

/**
 * Spec puro de animação — independente de Reanimated. Permite testar
 * a decisão de motion sem precisar stubbar a lib nativa inteira.
 */
export type MotionSpec =
  | { kind: 'fade'; durationMs: number }
  | { kind: 'fadeInDownSpring'; delayMs: number };

/**
 * Decisão pura: dado reducedMotion + index/delay, retorna o spec.
 * Reanimated objects são construídos no hook a partir disso.
 *
 *   reducedMotion=true  → sempre fade 150ms (sem stagger, sem spring)
 *   reducedMotion=false → FadeInDown com stagger crescente
 */
export function pickEntering(
  reducedMotion: boolean,
  index = 0,
  delay = 60,
): MotionSpec {
  if (reducedMotion) return { kind: 'fade', durationMs: 150 };
  return { kind: 'fadeInDownSpring', delayMs: index * delay };
}

/** Mesma lógica de pickEntering mas com stagger maior pra seções (100ms). */
export function pickSectionEntering(
  reducedMotion: boolean,
  index = 0,
): MotionSpec {
  if (reducedMotion) return { kind: 'fade', durationMs: 150 };
  return { kind: 'fadeInDownSpring', delayMs: index * 100 };
}

/** Constrói o builder Reanimated a partir do spec puro. */
function specToBuilder(spec: MotionSpec): BaseAnimationBuilder {
  if (spec.kind === 'fade') {
    return FadeIn.duration(spec.durationMs) as unknown as BaseAnimationBuilder;
  }
  return FadeInDown.delay(spec.delayMs).springify() as unknown as BaseAnimationBuilder;
}

export function useMotion() {
  const reducedMotion = useReducedMotion();

  /**
   * Animação de entrada para itens de lista com stagger.
   * @param index  posição do item na lista
   * @param delay  delay base em ms por item (padrão 60ms)
   */
  const entering = (index = 0, delay = 60): BaseAnimationBuilder =>
    specToBuilder(pickEntering(!!reducedMotion, index, delay));

  /**
   * Animação de entrada para seções (stagger maior).
   * @param index  posição da seção
   */
  const sectionEntering = (index = 0): BaseAnimationBuilder =>
    specToBuilder(pickSectionEntering(!!reducedMotion, index));

  return { reducedMotion, entering, sectionEntering };
}
