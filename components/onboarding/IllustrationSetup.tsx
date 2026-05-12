import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

const BRAND_PRIMARY  = '#04A29B';
const CROWN_SHADE = '#f59e0b';
const JEWEL_RED   = '#ef4444';
const JEWEL_BLUE  = '#3b82f6';
const JEWEL_GREEN = '#04A29B';

export function IllustrationSetup() {
  const scale     = useSharedValue(1);
  const isReduced = useReducedMotion();

  useEffect(() => {
    if (isReduced) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 700 }),
        withTiming(1,   { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [isReduced, scale]);

  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={crownStyle}>
        <Svg width={110} height={90} viewBox="0 0 110 90">
          {/* Crown base band */}
          <Path
            d="M 10 62 L 100 62 L 94 82 L 16 82 Z"
            fill={CROWN_SHADE}
          />
          {/* Crown body */}
          <Polygon
            points="10,62 20,20 42,46 55,10 68,46 90,20 100,62"
            fill={BRAND_PRIMARY}
          />
          {/* Crown outlines */}
          <Polygon
            points="10,62 20,20 42,46 55,10 68,46 90,20 100,62"
            fill="none"
            stroke={CROWN_SHADE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Jewels */}
          <Circle cx={22}  cy={70} r={6} fill={JEWEL_RED}   />
          <Circle cx={55}  cy={70} r={6} fill={JEWEL_BLUE}  />
          <Circle cx={88}  cy={70} r={6} fill={JEWEL_GREEN} />
          {/* Top jewel */}
          <Circle cx={55}  cy={16} r={5} fill={JEWEL_RED}   />
          {/* Side jewels */}
          <Circle cx={21}  cy={26} r={4} fill={JEWEL_BLUE}  />
          <Circle cx={89}  cy={26} r={4} fill={JEWEL_GREEN} />
        </Svg>
      </Animated.View>
    </View>
  );
}
