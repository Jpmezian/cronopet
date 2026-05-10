import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, Easing, useReducedMotion,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bloco de skeleton com shimmer.
 * Respeita reduced motion: sem animação, apenas cor estática.
 *
 * Uso:
 *   <Skeleton width="100%" height={20} borderRadius={8} />
 *   <Skeleton width={120} height={12} borderRadius={6} />
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useThemeColors();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bgMuted,
        },
        animStyle,
        style,
      ]}
    />
  );
}

// ─── Layouts pré-compostos ────────────────────────────────────

/**
 * Skeleton de um card de membro da família (Premium Dashboard).
 */
export function SkeletonMemberCard() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="55%" height={13} borderRadius={6} />
        <Skeleton width="40%" height={11} borderRadius={5} />
      </View>
    </View>
  );
}

/**
 * Skeleton do dashboard Premium completo (enquanto carrega grupo/membros).
 */
export function SkeletonPremiumDashboard() {
  const { colors, isDark } = useThemeColors();

  // Cartão dark intencional (PRO card)
  const darkCardBg   = isDark ? colors.bgCard  : colors.textPrimary;
  const darkLinePrimary = isDark ? colors.bgMuted : '#44403c';   // stone-700 / bgMuted
  const darkLineSecondary = isDark ? colors.bgInput : '#292524'; // stone-800 / bgInput

  return (
    <View style={{ paddingHorizontal: 20, gap: 20, paddingTop: 4 }}>
      {/* Grupo card */}
      <View style={{
        backgroundColor: darkCardBg, borderRadius: 20, padding: 20, gap: 12,
      }}>
        <Skeleton width="60%" height={18} borderRadius={8} style={{ backgroundColor: darkLinePrimary }} />
        <Skeleton width="40%" height={13} borderRadius={6} style={{ backgroundColor: darkLineSecondary }} />
      </View>

      {/* Invite code card */}
      <View style={{
        backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 16,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8,
        }),
      }}>
        <Skeleton width="45%" height={15} borderRadius={7} />
        <Skeleton width="100%" height={56} borderRadius={14} />
      </View>

      {/* Members card */}
      <View style={{
        backgroundColor: colors.bgCard, borderRadius: 20, padding: 20,
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8,
        }),
      }}>
        <Skeleton width="35%" height={15} borderRadius={7} style={{ marginBottom: 14 }} />
        <SkeletonMemberCard />
        <SkeletonMemberCard />
      </View>
    </View>
  );
}
