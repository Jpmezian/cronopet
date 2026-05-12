/**
 * components/medical/BreedHealthCard.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Card EDUCATIVO mostrando predisposições conhecidas da raça do pet.
 *
 * Filosofia:
 *   • Informa, não alarma — predisposição genética não é diagnóstico
 *   • Sempre fecha com "consulte o veterinário"
 *   • Visualmente neutro (não usa vermelho de "alert")
 *   • Expansível: padrão mostra resumo + 3 condições principais; tap mostra tudo
 *
 * Diferença de HealthInsightsCard:
 *   • HealthInsightsCard = REATIVO (algo aconteceu, alerta)
 *   • BreedHealthCard = INFORMATIVO (sempre visível, conhecimento de base)
 */

import React, { useMemo, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown, ChevronUp, Dna, Bath, Activity, Thermometer, Scale, Heart,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';
import { useMotion } from '@/hooks/useMotion';
import {
  getBreedHealthProfile,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  COMPLIANCE_NOTE,
  type BreedHealthProfile,
  type Predisposition,
} from '@/data/breed-conditions';

interface Props {
  raca: string;
  tipo: 'cachorro' | 'gato' | 'outro';
  petNome: string;
}

export function BreedHealthCard({ raca, tipo, petNome }: Props) {
  const { colors, isDark, brand } = useThemeColors();
  const { reducedMotion } = useMotion();
  const [expanded, setExpanded] = useState(false);

  const profile = useMemo(() => getBreedHealthProfile(raca, tipo), [raca, tipo]);

  if (!profile) return null;

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  };

  const totalPreds = profile.predispositions.length;
  const visible = expanded ? profile.predispositions : profile.predispositions.slice(0, 3);
  const hidden = totalPreds - visible.length;

  return (
    <Animated.View entering={reducedMotion ? FadeIn.duration(150) : FadeIn.springify()}>
      <View style={{
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        gap: 14,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: isDark ? 'rgba(155, 228, 198, 0.18)' : brand.warmBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Dna size={20} color={isDark ? brand.accent : brand.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              Perfil da raça
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
              {profile.displayName}
            </Text>
          </View>
        </View>

        {/* Métricas chave */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <MetricChip
            icon={<Scale size={13} color={colors.textSecondary} strokeWidth={2.2} />}
            label="Peso ideal"
            value={`${profile.weightRange.min}–${profile.weightRange.max} kg`}
            colors={colors}
          />
          <MetricChip
            icon={<Heart size={13} color={colors.textSecondary} strokeWidth={2.2} />}
            label="Vida média"
            value={`${profile.lifeExpectancyYears.min}–${profile.lifeExpectancyYears.max} anos`}
            colors={colors}
          />
          {profile.exerciseMinPerDay > 0 && (
            <MetricChip
              icon={<Activity size={13} color={colors.textSecondary} strokeWidth={2.2} />}
              label="Exercício"
              value={`~${profile.exerciseMinPerDay} min/dia`}
              colors={colors}
            />
          )}
          {profile.bathFrequencyDays > 0 && (
            <MetricChip
              icon={<Bath size={13} color={colors.textSecondary} strokeWidth={2.2} />}
              label="Banho"
              value={`~${profile.bathFrequencyDays} dias`}
              colors={colors}
            />
          )}
          <MetricChip
            icon={<Thermometer size={13} color={colors.textSecondary} strokeWidth={2.2} />}
            label="Calor"
            value={tolLabel(profile.heatTolerance)}
            colors={colors}
          />
        </View>

        {/* Owner note (destaque) */}
        <View style={{
          backgroundColor: isDark ? 'rgba(155, 228, 198, 0.10)' : brand.warmBg,
          borderRadius: 12,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: isDark ? brand.accent : brand.primary,
        }}>
          <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 18 }}>
            <Text style={{ fontWeight: '700' }}>Dica para {petNome}: </Text>
            {profile.ownerNote}
          </Text>
        </View>

        {/* Predisposições */}
        {totalPreds > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.8,
              color: colors.textSecondary,
              textTransform: 'uppercase',
            }}>
              Predisposições da raça ({totalPreds})
            </Text>

            {visible.map((pred, i) => (
              <PredItem key={`${pred.condition}-${i}`} pred={pred} colors={colors} isDark={isDark} />
            ))}

            {hidden > 0 && !expanded && (
              <ScalePress
                accessibilityRole="button"
                accessibilityLabel={`Ver mais ${hidden} predisposições`}
                onPress={toggleExpand}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                  Ver mais {hidden}
                </Text>
                <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2.2} />
              </ScalePress>
            )}

            {expanded && (
              <ScalePress
                accessibilityRole="button"
                accessibilityLabel="Recolher lista"
                onPress={toggleExpand}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                  Mostrar menos
                </Text>
                <ChevronUp size={14} color={colors.textSecondary} strokeWidth={2.2} />
              </ScalePress>
            )}
          </View>
        )}

        {/* Compliance note */}
        <Text style={{
          fontSize: 11,
          color: colors.textTertiary,
          fontStyle: 'italic',
          lineHeight: 15,
        }}>
          {COMPLIANCE_NOTE}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function MetricChip({
  icon, label, value, colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: { bgInput: string; textPrimary: string; textSecondary: string };
}) {
  return (
    <View style={{
      backgroundColor: colors.bgInput,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    }}>
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
        {label}:
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

function PredItem({
  pred, colors, isDark,
}: {
  pred: Predisposition;
  colors: { bgInput: string; textPrimary: string; textSecondary: string; textTertiary: string };
  isDark: boolean;
}) {
  // Cor da pílula de severidade — soft, não alarmista
  const sevTone = pred.severity === 'serious'
    ? (isDark ? 'rgba(220, 38, 38, 0.20)' : '#fee2e2')
    : pred.severity === 'common'
      ? (isDark ? 'rgba(217, 119, 6, 0.18)' : '#fef3c7')
      : (isDark ? 'rgba(122, 111, 95, 0.20)' : '#F2F4DC');
  const sevText = pred.severity === 'serious'
    ? (isDark ? '#fca5a5' : '#991b1b')
    : pred.severity === 'common'
      ? (isDark ? '#04A29B' : '#92400e')
      : colors.textSecondary;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
          {pred.condition}
        </Text>
        <View style={{
          backgroundColor: sevTone,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: sevText, letterSpacing: 0.3 }}>
            {SEVERITY_LABELS[pred.severity].toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600' }}>
        {CATEGORY_LABELS[pred.category]}
        {pred.ageOnsetYears != null ? ` · costuma aparecer ~${pred.ageOnsetYears} ano${pred.ageOnsetYears === 1 ? '' : 's'}` : ''}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
        {pred.brief}
      </Text>
    </View>
  );
}

function tolLabel(t: 'low' | 'medium' | 'high'): string {
  return t === 'low' ? 'baixa' : t === 'medium' ? 'média' : 'alta';
}
