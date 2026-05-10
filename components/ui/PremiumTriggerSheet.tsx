import React from 'react';
import { View, Text, Modal, Pressable, Platform } from 'react-native';
import Animated, {
  SlideInDown, SlideOutDown, FadeIn, FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import type { PremiumTrigger } from '@/hooks/usePremiumTriggers';

interface PremiumTriggerSheetProps {
  trigger: PremiumTrigger | null;
  onDismiss: () => void;
}

export function PremiumTriggerSheet({ trigger, onDismiss }: PremiumTriggerSheetProps) {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();
  const isReduced = useReducedMotion();

  const modalOverlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(28,25,23,0.35)';
  const darkCardBg = isDark ? colors.bgCard : colors.textPrimary;

  const entering = isReduced ? FadeIn.duration(200) : SlideInDown.springify().damping(20).stiffness(280);
  const exiting  = isReduced ? FadeOut.duration(150) : SlideOutDown.duration(200);

  return (
    <Modal
      visible={trigger !== null}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: modalOverlay }}
          onPress={onDismiss}
        />

        <Animated.View
          entering={entering}
          exiting={exiting}
          style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 40 : 28,
          }}
        >
          {/* Close button */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
            <ScalePress
              onPress={onDismiss}
              accessible accessibilityRole="button"
              accessibilityLabel="Fechar"
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: colors.bgInput,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
            </ScalePress>
          </View>

          {/* Drag handle */}
          <View style={{ alignItems: 'center', position: 'absolute', top: 8, left: 0, right: 0 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>

          {trigger && (
            <>
              {/* Hero icon */}
              <View style={{
                width: 72, height: 72, borderRadius: 20,
                backgroundColor: 'rgba(251,191,36,0.15)',
                borderWidth: 2, borderColor: '#fbbf24',
                alignItems: 'center', justifyContent: 'center',
                alignSelf: 'center',
                marginTop: 4, marginBottom: 20,
              }}>
                <Text style={{ fontSize: 40 }}>{trigger.emoji}</Text>
              </View>

              {/* Copy */}
              <Text style={{
                color: colors.textPrimary,
                fontFamily: 'Nunito_800ExtraBold',
                fontSize: 22, fontWeight: '800',
                textAlign: 'center',
                lineHeight: 28,
                marginBottom: 10,
              }}>
                {trigger.headline}
              </Text>
              <Text style={{
                color: colors.textSecondary,
                fontSize: 14, lineHeight: 20,
                textAlign: 'center',
                marginBottom: 20,
              }}>
                {trigger.subtitle}
              </Text>

              {/* Trial badge */}
              <View style={{
                backgroundColor: 'rgba(251,191,36,0.12)',
                borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
                borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 10,
                marginBottom: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 14, marginRight: 6 }}>🎁</Text>
                <Text style={{
                  color: '#b45309',
                  fontFamily: 'Nunito_700Bold',
                  fontSize: 12, fontWeight: '700',
                  letterSpacing: 0.5,
                }}>
                  7 DIAS GRÁTIS · SEM CARTÃO
                </Text>
              </View>

              {/* Primary CTA */}
              <ScalePress
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDismiss();
                  setTimeout(() => router.push('/premium'), 200);
                }}
                accessible accessibilityRole="button"
                accessibilityLabel={trigger.cta}
                style={{
                  backgroundColor: darkCardBg,
                  borderRadius: 16,
                  height: 54,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{
                  color: '#ffffff',
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 15, fontWeight: '800',
                }}>
                  {trigger.cta} →
                </Text>
              </ScalePress>

              {/* Dismiss ghost */}
              <ScalePress
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDismiss();
                }}
                accessible accessibilityRole="button"
                accessibilityLabel="Talvez mais tarde"
                style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                  Talvez mais tarde
                </Text>
              </ScalePress>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
