import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Sparkles, Lock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ScalePress } from '@/components/ui/ScalePress';
import type { HealthInsight } from '@/services/HealthInsights';

interface InsightsPremiumGateProps {
  /** Quantidade de insights detectados (mostra como "preview locked") */
  insightCount: number;
  /** O primeiro insight (preview) — title é mostrado borrado/teaser */
  previewInsight?: HealthInsight;
}

/**
 * Gate para a feature Health Insights.
 *
 * Feedback TestFlight R2-10: detecção automática de padrões na rotina
 * (queda de apetite, deficit de exercício, polidipsia, anormalidades)
 * é o tipo de feature que justifica Pro — usa heurística clínica,
 * roda em todo update do histórico, e o user "free" não precisa pra
 * o app funcionar.
 *
 * UX: NÃO esconder a feature. Mostrar que ela existe, deixar o user
 * VER que tem `N` sinais detectados (sem revelar quais), e CTA pro
 * paywall. Isso é o padrão Spotify/Strava/Headspace pra premium tease.
 *
 * Quando `insightCount === 0`, o componente não renderiza (não tem
 * por que mostrar gate sem nada a oferecer).
 */
export function InsightsPremiumGate({ insightCount, previewInsight }: InsightsPremiumGateProps) {
  const router = useRouter();
  const T = useTheme();

  if (insightCount === 0) return null;

  return (
    <ScalePress
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/premium', params: { source: 'insights_gate' } });
      }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${insightCount} ${insightCount === 1 ? 'sinal de saúde detectado' : 'sinais de saúde detectados'}. Toque pra desbloquear com Pro.`}
      accessibilityHint="Abre a tela de assinatura premium"
      style={{
        backgroundColor: T.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.5,
        borderColor: T.mint,
        ...(Platform.OS === 'android' ? { elevation: 3 } : {
          shadowColor: T.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: T.isDark ? 0.35 : 0.12,
          shadowRadius: 12,
        }),
      }}
    >
      {/* Header com badge Pro */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 12,
          backgroundColor: T.mint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={18} color={T.primaryDeep} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: T.ink,
            fontFamily: 'Nunito_700Bold',
            fontSize: 14, fontWeight: '700',
          }}>
            Sinais de saúde detectados
          </Text>
          <Text style={{
            color: T.ink2,
            fontSize: 12, marginTop: 2,
          }}>
            Análise automática da rotina do seu pet
          </Text>
        </View>
        <View style={{
          backgroundColor: T.primary,
          paddingHorizontal: 8, paddingVertical: 3,
          borderRadius: 999,
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 9, fontWeight: '800',
            letterSpacing: 0.6,
          }}>
            PRO
          </Text>
        </View>
      </View>

      {/* Preview blur — mostra título do 1º insight mas borra */}
      {previewInsight && (
        <View style={{
          backgroundColor: T.surfaceTint,
          borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          marginBottom: 10,
        }}>
          <Lock size={14} color={T.ink3} strokeWidth={2} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: T.ink3,
              fontSize: 13,
              fontWeight: '600',
              // Truque pra "borrar" sem usar filter: trunca depois de
              // 18 chars + reticências, dá sensação de "tem mais ali"
              // sem revelar conteúdo. Funciona em iOS e Android.
            }}
          >
            {previewInsight.title.length > 18
              ? `${previewInsight.title.slice(0, 18)}…`
              : previewInsight.title}
          </Text>
          {insightCount > 1 && (
            <Text style={{
              color: T.primary,
              fontSize: 11, fontWeight: '700',
            }}>
              +{insightCount - 1} {insightCount - 1 === 1 ? 'sinal' : 'sinais'}
            </Text>
          )}
        </View>
      )}

      {/* CTA discreto */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
      }}>
        <Text style={{
          color: T.primary,
          fontFamily: 'Nunito_700Bold',
          fontSize: 13, fontWeight: '700',
        }}>
          Desbloquear com CronoPet Pro
        </Text>
        <ChevronRight size={16} color={T.primary} strokeWidth={2.4} />
      </View>
    </ScalePress>
  );
}
