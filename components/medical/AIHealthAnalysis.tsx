/**
 * components/medical/AIHealthAnalysis.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Botão "Analisar saúde com IA" + render do resultado.
 *
 * Estados: idle → loading → success | error | unavailable
 *
 * Em DEV: funciona com stub (services/AIInsights.ts retorna análise simulada)
 * Em PROD sem endpoint configurado: mostra estado "não disponível" educado
 * Em PROD com endpoint: chama Edge Function (supabase/functions/health-analysis)
 *
 * Design:
 *  - Card colapsado por padrão; expande quando o tutor pede análise
 *  - Sempre disclaimers de "não é diagnóstico"
 *  - Cache 24h gerenciado no wrapper — UI não precisa lidar com isso
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { Stethoscope, AlertCircle, RefreshCw, Clock } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { useToastStore } from '@/store/useToastStore';
import {
  analyzeWithAI, isAIAvailable,
  type AIHealthAnalysis as AnalysisResult,
} from '@/services/AIInsights';
import type {
  ActionLog, WeightEntry, MedicalEvent, PetProfile,
} from '@/types/pet';

interface Props {
  pet: Pick<PetProfile, 'tipo' | 'raca' | 'nascimento' | 'idealWeightKg' | 'neutered' | 'petSize' | 'nome'>;
  actionHistory: ActionLog[];
  weightHistory: WeightEntry[];
  medicalEvents: MedicalEvent[];
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; analysis: AnalysisResult }
  | { status: 'error'; reason: string };

const SEVERITY_TONE = {
  low:    { bg: '#EAFAF1', text: '#024A47', label: 'Tudo dentro do esperado' },
  medium: { bg: '#FFF7ED', text: '#9A3412', label: 'Vale acompanhar' },
  high:   { bg: '#FEF2F2', text: '#991B1B', label: 'Considere procurar veterinário' },
} as const;

const SEVERITY_TONE_DARK = {
  low:    { bg: 'rgba(4, 162, 155, 0.22)', text: '#9BE4C6', label: 'Tudo dentro do esperado' },
  medium: { bg: 'rgba(180, 83, 9, 0.22)',  text: '#FBBF24', label: 'Vale acompanhar' },
  high:   { bg: 'rgba(220, 38, 38, 0.22)', text: '#FCA5A5', label: 'Considere procurar veterinário' },
} as const;

export function AIHealthAnalysis({
  pet, actionHistory, weightHistory, medicalEvents,
}: Props) {
  const { colors, isDark, brand } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);
  const [state, setState] = useState<State>({ status: 'idle' });

  const available = isAIAvailable() || __DEV__;

  const runAnalysis = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState({ status: 'loading' });
    try {
      const result = await analyzeWithAI({
        pet: {
          tipo: pet.tipo,
          raca: pet.raca,
          nascimento: pet.nascimento,
          idealWeightKg: pet.idealWeightKg,
          neutered: pet.neutered,
          petSize: pet.petSize,
        },
        actionHistory,
        weightHistory,
        medicalEvents,
      });

      if (result.ok) {
        setState({ status: 'success', analysis: result.analysis });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const friendly = friendlyReason(result.reason);
        setState({ status: 'error', reason: friendly });
        showToast('error', friendly);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { source: 'ai_analysis_ui' } });
      setState({ status: 'error', reason: 'Erro inesperado. Tente novamente.' });
    }
  }, [pet, actionHistory, weightHistory, medicalEvents, showToast]);

  if (!available) {
    return (
      <View style={{
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Stethoscope size={18} color={colors.textTertiary} strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, flex: 1 }}>
            Análise por IA
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 8, lineHeight: 17 }}>
          Em breve: análise inteligente do histórico do seu pet com sugestões personalizadas.
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
        android: { elevation: 2 },
      }),
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: isDark ? 'rgba(4, 162, 155, 0.18)' : brand.warmBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Stethoscope size={20} color={isDark ? brand.accent : brand.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            Análise por IA
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            Cruza histórico com padrões clínicos comuns
          </Text>
        </View>
      </View>

      {/* Estado idle: botão de chamar */}
      {state.status === 'idle' && (
        <>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
            Olha tudo que você registrou no último mês — peso, alimentação, sintomas, predisposições da raça — e devolve um panorama com pontos pra discutir com o veterinário.
          </Text>
          <ScalePress
            accessibilityRole="button"
            accessibilityLabel="Iniciar análise por IA"
            onPress={runAnalysis}
            style={{
              backgroundColor: brand.primary,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Stethoscope size={16} color={brand.warmBg} strokeWidth={2.4} />
            <Text style={{
              color: brand.warmBg,
              fontWeight: '700',
              fontSize: 14,
            }}>
              Analisar agora
            </Text>
          </ScalePress>
          <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>
            Dados anonimizados antes de enviar. Sem nome, foto ou localização.
          </Text>
        </>
      )}

      {/* Loading */}
      {state.status === 'loading' && (
        <Animated.View entering={FadeIn} style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
          <ActivityIndicator color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Analisando padrões…
          </Text>
        </Animated.View>
      )}

      {/* Sucesso */}
      {state.status === 'success' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={{ gap: 14 }}>
          <SeverityChip severity={state.analysis.overallSeverity} isDark={isDark} />

          <View>
            <SectionLabel>Resumo</SectionLabel>
            <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19 }}>
              {state.analysis.summary}
            </Text>
          </View>

          {state.analysis.observations.length > 0 && (
            <View>
              <SectionLabel>O que notei nos dados</SectionLabel>
              {state.analysis.observations.map((obs, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>•</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, flex: 1 }}>
                    {obs}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {state.analysis.suggestions.length > 0 && (
            <View>
              <SectionLabel>Pra falar com o veterinário</SectionLabel>
              {state.analysis.suggestions.map((sug, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>→</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, flex: 1 }}>
                    {sug}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{
            backgroundColor: colors.bgInput,
            borderRadius: 10,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Clock size={12} color={colors.textTertiary} strokeWidth={2.4} />
            <Text style={{ fontSize: 11, color: colors.textTertiary, flex: 1 }}>
              Análise gerada agora · cache válido por 24h · {state.analysis.model}
            </Text>
          </View>

          <ScalePress
            accessibilityRole="button"
            accessibilityLabel="Refazer análise"
            onPress={runAnalysis}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
            }}
          >
            <RefreshCw size={13} color={colors.textSecondary} strokeWidth={2} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
              Analisar de novo
            </Text>
          </ScalePress>

          <Text style={{
            fontSize: 11,
            color: colors.textTertiary,
            fontStyle: 'italic',
            textAlign: 'center',
            lineHeight: 15,
          }}>
            Esta análise não substitui consulta veterinária presencial.
          </Text>
        </Animated.View>
      )}

      {/* Erro */}
      {state.status === 'error' && (
        <Animated.View entering={FadeIn} style={{ gap: 12 }}>
          <View style={{
            backgroundColor: isDark ? 'rgba(220, 38, 38, 0.18)' : '#fef2f2',
            borderColor: isDark ? 'rgba(220, 38, 38, 0.40)' : '#fecaca',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            gap: 10,
          }}>
            <AlertCircle size={18} color={isDark ? '#fca5a5' : '#b91c1c'} strokeWidth={2.2} />
            <Text style={{
              fontSize: 13,
              color: isDark ? '#fca5a5' : '#991b1b',
              flex: 1,
              lineHeight: 17,
            }}>
              {state.reason}
            </Text>
          </View>
          <ScalePress
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            onPress={runAnalysis}
            style={{
              backgroundColor: colors.bgInput,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Tentar novamente
            </Text>
          </ScalePress>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useThemeColors();
  return (
    <Text style={{
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      marginBottom: 6,
    }}>
      {children}
    </Text>
  );
}

function SeverityChip({ severity, isDark }: { severity: 'low' | 'medium' | 'high'; isDark: boolean }) {
  const tone = isDark ? SEVERITY_TONE_DARK[severity] : SEVERITY_TONE[severity];
  return (
    <View style={{
      backgroundColor: tone.bg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: tone.text }}>
        {tone.label}
      </Text>
    </View>
  );
}

function friendlyReason(reason: string): string {
  switch (reason) {
    case 'not_configured': return 'Análise por IA ainda não está disponível neste app.';
    case 'rate_limited':   return 'Muitas análises em pouco tempo. Tenta de novo em alguns minutos.';
    case 'network':        return 'Sem conexão estável. Verifica sua internet e tenta de novo.';
    case 'invalid_response': return 'Resposta inesperada do serviço. Já fomos notificados — tenta de novo.';
    default: return 'Algo deu errado. Tenta de novo em instantes.';
  }
}
