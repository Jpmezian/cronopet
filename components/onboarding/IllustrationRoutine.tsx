import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing,
  useReducedMotion,
  SharedValue,
} from 'react-native-reanimated';

const ORBIT_RADIUS = 64;
const CLOCK_R      = 38;
const TWO_PI       = Math.PI * 2;

const ORBIT_ITEMS = [
  { symbol: '🍖', offsetAngle: 0                },
  { symbol: '💧', offsetAngle: TWO_PI / 3       },
  { symbol: '🐾', offsetAngle: (TWO_PI * 2) / 3 },
];

// Sub-component at module scope (hooks rule)
function OrbitEmoji({
  symbol, offsetAngle, orbitAngle,
}: {
  symbol: string;
  offsetAngle: number;
  orbitAngle: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const angle = orbitAngle.value + offsetAngle;
    return {
      transform: [
        { translateX: ORBIT_RADIUS * Math.cos(angle) },
        { translateY: ORBIT_RADIUS * Math.sin(angle) },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <Text style={{ fontSize: 22 }}>{symbol}</Text>
    </Animated.View>
  );
}

export function IllustrationRoutine() {
  const orbitAngle = useSharedValue(-Math.PI / 2); // start at top
  const isReduced  = useReducedMotion();

  useEffect(() => {
    orbitAngle.value = withRepeat(
      withTiming(
        orbitAngle.value + TWO_PI,
        { duration: isReduced ? 0 : 5000, easing: Easing.linear },
      ),
      -1,
      false,
    );
  }, [isReduced, orbitAngle]);

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      {/* Clock face */}
      <Svg width={100} height={100} viewBox="0 0 100 100">
        {/* Clock body */}
        <Circle cx={50} cy={50} r={CLOCK_R} fill="white" stroke="#E0D9C4" strokeWidth={3} />
        {/* Hour markers */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
          const angle = (i / 12) * TWO_PI - Math.PI / 2;
          const inner = i % 3 === 0 ? 28 : 31;
          const outer = 35;
          return (
            <Line
              key={i}
              x1={50 + inner * Math.cos(angle)}
              y1={50 + inner * Math.sin(angle)}
              x2={50 + outer * Math.cos(angle)}
              y2={50 + outer * Math.sin(angle)}
              stroke={i % 3 === 0 ? '#2C2B27' : '#A09684'}
              strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
        {/* Hour hand (pointing ~10 o'clock) */}
        <Path d="M 50 50 L 36 30" stroke="#2C2B27" strokeWidth={3} strokeLinecap="round" />
        {/* Minute hand (pointing ~2 o'clock) */}
        <Path d="M 50 50 L 63 27" stroke="#2C2B27" strokeWidth={2} strokeLinecap="round" />
        {/* Center dot */}
        <Circle cx={50} cy={50} r={3.5} fill="#2C2B27" />
      </Svg>

      {/* Orbiting emojis */}
      {ORBIT_ITEMS.map((item) => (
        <OrbitEmoji
          key={item.symbol}
          symbol={item.symbol}
          offsetAngle={item.offsetAngle}
          orbitAngle={orbitAngle}
        />
      ))}
    </View>
  );
}
