import React, { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, Platform } from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInRight, SlideOutLeft,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X, ChevronRight, ChevronLeft, Plus, BarChart2, HeartPulse,
  Sparkles, Bell, Check,
} from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';
import { ACTIONS_V3 } from '@/constants/colors';

/**
 * Tour de boas-vindas — 5 cards explicando as principais funções do app.
 *
 * Aparece UMA vez só, logo após o onboarding inicial. User pode pular
 * a qualquer momento (botão X). Persiste em `hasCompletedTour` no store
 * pra nunca reaparecer.
 *
 * Pesquisa UX que guiou as decisões (jakob nielsen + appcues 2024):
 *   • Tour de 5 steps no MÁX — taxa de conclusão cai >50% a partir do 6º
 *   • Sempre permitir skip visível no topo, não no rodapé
 *   • Cada card faz UMA coisa: descreve UMA feature com UM ícone
 *   • Linguagem afirmativa ("Toque pra registrar"), não imperativa
 *   • Cores: usa ACTIONS_V3 pra "ensinar" o código visual do app
 *   • Sem screenshots/animações pesadas — texto+ícone é suficiente
 *
 * NÃO desenha tooltips sobre elementos reais (evita medição absoluta
 * e fragilidade com layout). Em vez disso é um carrossel de cards
 * full-screen com setas indicando "onde encontrar". Trade-off: menos
 * pontual, mas robusto a qualquer mudança futura de layout do Home.
 */

interface WelcomeTourProps {
  visible: boolean;
  petNome: string;
  onComplete: () => void;
}

interface Step {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  toneKey: 'comida' | 'agua' | 'passeio' | 'xixi' | 'coco';
  title: string;
  body: string;
}

export function WelcomeTour({ visible, petNome, onComplete }: WelcomeTourProps) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  const nome = petNome?.trim() || 'seu pet';

  const STEPS: Step[] = [
    {
      Icon: Sparkles,
      toneKey: 'comida',
      title: `Bem-vindo(a) ao CronoPet!`,
      body: `Vamos te mostrar como registrar a rotina de ${nome} em 5 passos rápidos. Você pode pular a qualquer momento.`,
    },
    {
      Icon: Plus,
      toneKey: 'agua',
      title: 'Toque pra registrar',
      body: `Na tela inicial você verá botões coloridos pra comida, água, passeio, xixi, cocô e banho. Toque pra registrar — sem fricção, sem formulário gigante.`,
    },
    {
      Icon: BarChart2,
      toneKey: 'passeio',
      title: 'Veja o histórico',
      body: `A aba Histórico mostra tudo que você já registrou. Filtre por dia, semana ou tipo. Exporta em PDF pra levar ao veterinário.`,
    },
    {
      Icon: HeartPulse,
      toneKey: 'xixi',
      title: 'Cuide da saúde',
      body: `A aba Saúde acompanha peso, vacinas, consultas e detecta padrões automaticamente (ex: queda de apetite, deficit de exercício). Sem diagnóstico — só sinais pra você ficar atento.`,
    },
    {
      Icon: Bell,
      toneKey: 'coco',
      title: 'Lembretes opcionais',
      body: `Se quiser, ative lembretes diários no horário que combinar. Nunca enviamos notificação fora do que você programou.`,
    },
  ];

  const isLast = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];
  const accent = ACTIONS_V3[step.toneKey];

  const handleNext = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* haptic ausente */ }
    if (isLast) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch { /* segue */ }
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, onComplete]);

  // R5-3 (TestFlight): "voltar pra anterior caso a pessoa tenha se
  // arrependido de pular". Aparece a partir do 2º step (step 0 não
  // tem onde voltar — primeira tela do tour).
  const handlePrev = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* haptic ausente */ }
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleSkip = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* haptic ausente */ }
    onComplete();
  }, [onComplete]);

  // Animação do card: slide horizontal entre steps. Reduced Motion → fade.
  const cardEnter = isReducedMotion
    ? FadeIn.duration(200)
    : SlideInRight.duration(220);
  const cardExit = isReducedMotion
    ? FadeOut.duration(150)
    : SlideOutLeft.duration(180);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1,
        backgroundColor: T.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(28,25,23,0.72)',
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}>
        {/* Botão skip no topo direito — sempre visível */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <ScalePress
            onPress={handleSkip}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Pular tour"
            accessibilityHint="Fecha o tour e não mostra de novo"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, paddingVertical: 8,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 999,
            }}
          >
            <Text style={{
              color: '#FFFFFF', fontSize: 13, fontWeight: '600',
            }}>
              Pular
            </Text>
            <X size={14} color="#FFFFFF" strokeWidth={2.4} />
          </ScalePress>
        </View>

        {/* Card central com o step atual */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View
            key={stepIndex}
            entering={cardEnter}
            exiting={cardExit}
            style={{
              backgroundColor: T.card,
              borderRadius: 24,
              padding: 28,
              gap: 18,
              ...(Platform.OS === 'android' ? { elevation: 6 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25, shadowRadius: 16,
              }),
            }}
          >
            {/* Ícone grande com fundo color-coded da feature */}
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: accent.tintL,
              borderWidth: 1.5,
              borderColor: accent.tintL,
              alignItems: 'center', justifyContent: 'center',
              alignSelf: 'flex-start',
            }}>
              <step.Icon size={28} color={accent.primary} strokeWidth={2.2} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{
                color: T.ink,
                fontFamily: 'Nunito_800ExtraBold',
                fontSize: 24, fontWeight: '800',
                lineHeight: 28,
              }}>
                {step.title}
              </Text>
              <Text style={{
                color: T.ink2,
                fontSize: 15, lineHeight: 22,
              }}>
                {step.body}
              </Text>
            </View>

            {/* Indicadores de progresso (5 pontinhos) */}
            <View style={{
              flexDirection: 'row', gap: 6, marginTop: 4,
              alignItems: 'center',
            }}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === stepIndex ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === stepIndex ? accent.primary : T.rule,
                  }}
                />
              ))}
              <Text style={{
                marginLeft: 8,
                color: T.ink3,
                fontSize: 12, fontWeight: '600',
              }}>
                {stepIndex + 1} / {STEPS.length}
              </Text>
            </View>

            {/* CTAs: Voltar (só do 2º step em diante) + Próximo/Pronto */}
            <View style={{
              flexDirection: 'row', gap: 8,
              marginTop: 4,
            }}>
              {stepIndex > 0 && (
                <ScalePress
                  onPress={handlePrev}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Voltar pro passo anterior"
                  style={{
                    backgroundColor: T.surfaceTint,
                    borderRadius: 14,
                    paddingVertical: 14, paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ChevronLeft size={16} color={T.ink2} strokeWidth={2.6} />
                  <Text style={{
                    color: T.ink2,
                    fontFamily: 'Nunito_700Bold',
                    fontSize: 14, fontWeight: '700',
                  }}>
                    Anterior
                  </Text>
                </ScalePress>
              )}
              <ScalePress
                onPress={handleNext}
                accessible
                accessibilityRole="button"
                accessibilityLabel={isLast ? 'Concluir tour' : 'Próximo passo'}
                style={{
                  flex: 1,
                  backgroundColor: accent.primary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontFamily: 'Nunito_700Bold',
                  fontSize: 15, fontWeight: '700',
                }}>
                  {isLast ? 'Vamos começar!' : 'Próximo'}
                </Text>
                {isLast
                  ? <Check size={16} color="#FFFFFF" strokeWidth={2.6} />
                  : <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.6} />
                }
              </ScalePress>
            </View>
          </Animated.View>
        </View>

        {/* Dica não-intrusiva no rodapé */}
        <View style={{ alignItems: 'center' }}>
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Pular tour"
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: '500',
            }}>
              Você pode rever em Ajustes &gt; Sobre
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
