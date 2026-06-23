import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Modal, Pressable, Platform } from 'react-native';
import Animated, {
  SlideInDown, SlideOutDown,
  FadeIn, FadeOut,
  useSharedValue, useAnimatedStyle,
  withSequence, withSpring, withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Share2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';
import { ScalePress } from '@/components/ui/ScalePress';
import { SocialCardView } from '@/components/ui/SocialCardView';
import { useToastStore } from '@/store/useToastStore';

// ─── Constantes ───────────────────────────────────────────────
//
// Milestones de streak. Distribuição em curva de retenção:
//   - 7   primeira semana (forma de hábito)
//   - 14  segunda semana (validação do hábito)
//   - 30  primeiro mês (vínculo emocional)
//   - 60  dois meses (rotina internalizada)
//   - 100 três meses e meio (super-usuário)
//   - 365 um ano (lifelong commitment)
//
// 14 e 60 fecham o gap antes existente (30→100 era 70 dias sem celebração,
// momento crítico de potencial churn). 365 é o teto aspiracional.
//
// Mantido sincronizado com STREAK_MILESTONES em app/(tabs)/index.tsx.

export const MILESTONE_DATA: Record<number, { emoji: string; title: string; subtitle: string }> = {
  7:   {
    emoji:    '🏆',
    title:    'Semana Perfeita!',
    subtitle: 'Você e seu pet estão pegando o ritmo. O hábito do cuidado está criado!',
  },
  14:  {
    emoji:    '✨',
    title:    'Duas Semanas Firmes!',
    subtitle: '14 dias seguidos. Não é mais sorte de iniciante — é dedicação real.',
  },
  30:  {
    emoji:    '🌟',
    title:    'Um Mês de Dedicação!',
    subtitle: '30 dias ininterruptos de carinho e registros. Que marco incrível!',
  },
  60:  {
    emoji:    '💎',
    title:    'Dois Meses de Vínculo!',
    subtitle: '60 dias mostrando que o cuidado virou parte da sua rotina. Raríssimo.',
  },
  100: {
    emoji:    '👑',
    title:    'Guardião Supremo!',
    subtitle: '100 dias ininterruptos! O vínculo de vocês é uma inspiração.',
  },
  365: {
    emoji:    '🏅',
    title:    'Um Ano Inteiro!',
    subtitle: '365 dias seguidos cuidando do seu pet. Você entrou pra um clube minúsculo.',
  },
};

// ─── Props ────────────────────────────────────────────────────
interface MilestoneSheetProps {
  milestone: number | null; // valor presente em MILESTONE_DATA, ou null = oculto
  petNome:   string;
  petFoto:   string;
  streak:    number;
  onClose:   () => void;
}

// ─── Componente ───────────────────────────────────────────────
export function MilestoneSheet({ milestone, petNome, petFoto, streak, onClose }: MilestoneSheetProps) {
  const T = useTheme();
  const showToast  = useToastStore((s) => s.showToast);
  const isReduced  = useReducedMotion();

  const badgeScale    = useSharedValue(0);
  const socialCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const data         = milestone ? MILESTONE_DATA[milestone] : null;
  const modalOverlay = T.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(28,25,23,0.35)';

  // ── Animação do badge ao abrir ─────────────────────────────
  useEffect(() => {
    if (milestone) {
      badgeScale.value = 0;
      if (isReduced) {
        badgeScale.value = withTiming(1, { duration: 250 });
      } else {
        badgeScale.value = withSequence(
          withSpring(1.12, { damping: 16, stiffness: 220 }),
          withSpring(1,    { damping: 20, stiffness: 280 }),
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      badgeScale.value = 0;
    }
  }, [milestone, isReduced, badgeScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // ── Compartilhar social card ────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!socialCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(socialCardRef.current, { format: 'jpg', quality: 0.92 });
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
    } catch {
      showToast('error', 'Não foi possível compartilhar.');
    } finally {
      setSharing(false);
    }
  }, [showToast]);

  if (!data) return null;

  const entering = isReduced
    ? FadeIn.duration(200)
    : SlideInDown.springify().damping(20).stiffness(280);
  const exiting = isReduced
    ? FadeOut.duration(150)
    : SlideOutDown.duration(200);

  return (
    <Modal
      visible={milestone !== null}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>

        {/* Overlay dismiss */}
        <Pressable
          style={{ flex: 1, backgroundColor: modalOverlay }}
          onPress={onClose}
        />

        {/* Sheet */}
        <Animated.View
          entering={entering}
          exiting={exiting}
          style={{
            backgroundColor: T.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 48 : 32,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: T.rule, borderRadius: 2 }} />
          </View>

          {/* Badge animado — borda em verdigris (marca), miolo em amber soft */}
          <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 20 }}>
            <Animated.View style={[{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: ACTIONS_V3.comida.tintL,
              borderWidth: 2, borderColor: T.primary,
              alignItems: 'center', justifyContent: 'center',
            }, badgeStyle]}>
              <Text style={{ fontSize: 48 }}>{data.emoji}</Text>
            </Animated.View>
          </View>

          {/* Título */}
          <Text
            accessible
            accessibilityRole="header"
            style={{
              color: T.ink, fontFamily: 'Nunito_800ExtraBold',
              fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10,
            }}
          >
            {data.title}
          </Text>

          {/* Subtítulo */}
          <Text style={{
            color: T.ink2, fontSize: 15,
            textAlign: 'center', lineHeight: 22, marginBottom: 24,
          }}>
            {data.subtitle}
          </Text>

          {/* Streak count */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 8, marginBottom: 28,
          }}>
            <Text style={{ fontSize: 28 }}>🔥</Text>
            <Text style={{
              fontFamily: 'Nunito_800ExtraBold', fontSize: 34,
              color: ACTIONS_V3.comida.primary, fontWeight: '800',
            }}>
              {streak} dias
            </Text>
          </View>

          {/* Compartilhar */}
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleShare();
            }}
            disabled={sharing}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Compartilhar conquista"
            accessibilityHint="Gera uma imagem comemorativa para compartilhar"
            style={{
              backgroundColor: ACTIONS_V3.comida.tintL,
              borderWidth: 1.5, borderColor: T.primary,
              borderRadius: 16, height: 56,
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              marginBottom: 12,
            }}
          >
            <Share2 size={20} color={T.primary} strokeWidth={2} />
            <Text style={{
              fontFamily: 'Nunito_700Bold', fontWeight: '700',
              fontSize: 16, color: T.primary,
            }}>
              {sharing ? 'Gerando...' : 'Compartilhar Conquista'}
            </Text>
          </ScalePress>

          {/* Fechar ghost */}
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Continuar"
            style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: T.ink2, fontSize: 15 }}>
              Continuar
            </Text>
          </ScalePress>
        </Animated.View>

        {/* Social card off-screen para captura */}
        <View
          style={{ position: 'absolute', left: -9999, top: 0 }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <SocialCardView
            ref={socialCardRef}
            petNome={petNome}
            petFoto={petFoto}
            milestone={milestone ?? 7}
            streak={streak}
          />
        </View>
      </View>
    </Modal>
  );
}
