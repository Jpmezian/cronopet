import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

// R5-1 (TestFlight): Ilustração anterior era um SVG vetorial do
// "cachorro" feito à mão que ficou parecendo um rato. Reclamação
// repetida de beta testers. Substituída pela logo do CronoPet —
// identidade da marca, o user acabou de tocar nesse mesmo ícone no
// Springboard, então funciona como continuidade visual.
//
// Animação: float vertical sutil (±6pt em 2.8s). Respeita reduced-
// motion (sem animação se on). Sombra teal característica reforça
// que é "o app", não só uma imagem random.

export function IllustrationWelcome() {
  const float = useSharedValue(0);
  const isReduced = useReducedMotion();

  useEffect(() => {
    if (isReduced) return;
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400 }),
        withTiming(0,  { duration: 1400 }),
      ),
      -1,
      true,
    );
  }, [isReduced, float]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            width: 128, height: 128, borderRadius: 32,
            overflow: 'hidden',
            shadowColor: '#04A29B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35, shadowRadius: 18,
            elevation: 12,
          },
          style,
        ]}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={{ width: 128, height: 128 }}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logo CronoPet"
        />
      </Animated.View>
    </View>
  );
}
