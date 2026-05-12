import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withSpring,
  useReducedMotion,
} from 'react-native-reanimated';

const BRAND_PRIMARY = '#04A29B';
const DOG_DARK   = '#d97706';
const DOG_FEAT   = '#2C2B27';
const TONGUE     = '#ef4444';
const TAIL_H     = 52;
const TAIL_W     = 32;

export function IllustrationWelcome() {
  const tailRot  = useSharedValue(0);
  const isReduced = useReducedMotion();

  useEffect(() => {
    if (isReduced) return;
    tailRot.value = withRepeat(
      withSequence(
        withSpring(22, { damping: 5, stiffness: 160 }),
        withSpring(-14, { damping: 5, stiffness: 160 }),
      ),
      -1,
      true,
    );
  }, [isReduced, tailRot]);

  // Pivot at the bottom of the tail view
  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: TAIL_H / 2 },
      { rotate: `${tailRot.value}deg` },
      { translateY: -(TAIL_H / 2) },
    ],
  }));

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      {/* Static dog body */}
      <Svg width={160} height={160} viewBox="0 0 160 160">
        {/* Body */}
        <Ellipse cx={78} cy={112} rx={38} ry={28} fill={BRAND_PRIMARY} />
        {/* Head */}
        <Circle cx={78} cy={67} r={28} fill={BRAND_PRIMARY} />
        {/* Left ear */}
        <Ellipse cx={57} cy={49} rx={11} ry={15} fill={DOG_DARK}
          transform="rotate(-15, 57, 49)" />
        {/* Right ear */}
        <Ellipse cx={99} cy={49} rx={11} ry={15} fill={DOG_DARK}
          transform="rotate(15, 99, 49)" />
        {/* Left eye */}
        <Circle cx={69} cy={62} r={5.5} fill={DOG_FEAT} />
        <Circle cx={71} cy={60} r={2}   fill="white" />
        {/* Right eye */}
        <Circle cx={87} cy={62} r={5.5} fill={DOG_FEAT} />
        <Circle cx={89} cy={60} r={2}   fill="white" />
        {/* Nose */}
        <Ellipse cx={78} cy={74} rx={6} ry={4.5} fill={DOG_FEAT} />
        {/* Smile */}
        <Path d="M 72 79 Q 78 86 84 79" stroke={DOG_FEAT} strokeWidth={2.5}
          fill="none" strokeLinecap="round" />
        {/* Tongue */}
        <Path d="M 74 84 Q 78 91 82 84" fill={TONGUE} />
        {/* Front paws */}
        <Ellipse cx={63} cy={135} rx={11} ry={8} fill={BRAND_PRIMARY} />
        <Ellipse cx={93} cy={135} rx={11} ry={8} fill={BRAND_PRIMARY} />
        {/* Paw toes */}
        <Circle cx={57} cy={134} r={3} fill={DOG_DARK} />
        <Circle cx={63} cy={131} r={3} fill={DOG_DARK} />
        <Circle cx={69} cy={134} r={3} fill={DOG_DARK} />
        <Circle cx={87} cy={134} r={3} fill={DOG_DARK} />
        <Circle cx={93} cy={131} r={3} fill={DOG_DARK} />
        <Circle cx={99} cy={134} r={3} fill={DOG_DARK} />
      </Svg>

      {/* Animated tail — separate so pivot can be at its base */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 20,
            right: 10,
            width: TAIL_W,
            height: TAIL_H,
          },
          tailStyle,
        ]}
      >
        <Svg width={TAIL_W} height={TAIL_H} viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}>
          <Path
            d={`M 16 ${TAIL_H} Q 8 ${TAIL_H - 18} 20 ${TAIL_H - 34} Q 26 ${TAIL_H - 44} 28 0`}
            stroke={DOG_DARK}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
