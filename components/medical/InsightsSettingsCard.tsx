/**
 * components/medical/InsightsSettingsCard.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Painel de controle dos insights de saúde nas Settings.
 *
 * Inclui:
 *   • Métrica de "consultas marcadas a partir do app" (alertsHandledCount)
 *   • Toggles individuais por categoria de insight (peso, apetite, etc)
 *   • Tom: educativo, sem jargão técnico
 *
 * Princípios:
 *   • Usa Switch nativo pra acessibilidade e familiaridade
 *   • Categorias agrupadas por tema (corpo, comportamento, ambiente)
 *   • Categoria desativada = ZERO alertas dela (banner também silencia)
 */

import React, { useCallback } from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity, Award } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePetStore } from '@/store/usePetStore';
import type { InsightCategory } from '@/services/HealthInsights';

interface CategoryConfig {
  key: InsightCategory;
  label: string;
  description: string;
  group: 'body' | 'behavior' | 'environment';
}

const CATEGORIES: CategoryConfig[] = [
  // Corpo / clínico
  { key: 'weight',     label: 'Mudanças de peso',         description: 'Perda ou ganho significativos no curto prazo',                 group: 'body' },
  { key: 'appetite',   label: 'Apetite',                  description: 'Queda no consumo, refeições recusadas',                        group: 'body' },
  { key: 'hydration',  label: 'Hidratação',               description: 'Gap longo sem registro de água',                               group: 'body' },
  { key: 'stool',      label: 'Fezes',                    description: 'Diarreia, constipação ou aparência alterada',                  group: 'body' },
  { key: 'urine',      label: 'Urina',                    description: 'Aparência ou volume fora do padrão',                           group: 'body' },
  { key: 'medical',    label: 'Sintomas recorrentes',     description: 'Eventos médicos repetidos (vômito, mancada, etc)',             group: 'body' },
  { key: 'breed',      label: 'Predisposições da raça',   description: 'Sintomas que batem com riscos conhecidos da raça',             group: 'body' },

  // Comportamento / cuidado
  { key: 'exercise',   label: 'Exercício insuficiente',   description: 'Passeios abaixo do que a raça precisa',                        group: 'behavior' },
  { key: 'grooming',   label: 'Banho atrasado',           description: 'Quando passa muito do intervalo recomendado',                  group: 'behavior' },

  // Ambiente
  { key: 'thermal',    label: 'Risco térmico',            description: 'Calor ou frio que afeta a raça do pet',                        group: 'environment' },
];

const GROUP_LABELS: Record<CategoryConfig['group'], string> = {
  body: 'Corpo e clínico',
  behavior: 'Cuidado e rotina',
  environment: 'Ambiente',
};

export function InsightsSettingsCard() {
  const { colors, isDark, actionTheme } = useThemeColors();
  const disabled = usePetStore((s) => s.disabledInsightCategories);
  const toggle = usePetStore((s) => s.toggleInsightCategory);
  const handledCount = usePetStore((s) => s.alertsHandledCount);
  const handledLastAt = usePetStore((s) => s.alertsHandledLastAt);

  const onToggle = useCallback((cat: string, currentlyEnabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(cat, !currentlyEnabled);
  }, [toggle]);

  const groups = (['body', 'behavior', 'environment'] as const);

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      overflow: 'hidden',
      ...(Platform.OS === 'android' ? { elevation: 2 } : {
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      }),
    }}>
      {/* Métrica em destaque */}
      <View style={{
        padding: 20,
        backgroundColor: actionTheme.passeio.bg,
        borderBottomWidth: 1,
        borderBottomColor: actionTheme.passeio.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}>
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: isDark ? 'rgba(4, 120, 87, 0.30)' : '#dcfce7',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Award size={22} color={actionTheme.passeio.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          {handledCount === 0 ? (
            <>
              <Text style={{ color: actionTheme.passeio.primary, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>
                Cuidando antes de dar problema
              </Text>
              <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, lineHeight: 17, opacity: 0.85 }}>
                O app vai sugerir consultas quando notar algo que merece atenção.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: actionTheme.passeio.primary, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>
                {handledCount} {handledCount === 1 ? 'consulta marcada' : 'consultas marcadas'} a partir de alertas
              </Text>
              <Text style={{ color: actionTheme.passeio.primary, fontSize: 12, opacity: 0.85 }}>
                {handledLastAt ? `Última: ${formatRelative(handledLastAt)}` : 'Continue acompanhando.'}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Header da lista */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Activity size={16} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
            Tipos de aviso
          </Text>
        </View>
        <Text style={{ color: colors.textTertiary, fontSize: 12, lineHeight: 17 }}>
          Desligue o que não quer ser avisado. As detecções continuam rodando, só param de aparecer.
        </Text>
      </View>

      {/* Categorias agrupadas */}
      {groups.map((group, gIdx) => (
        <View key={group}>
          <Text style={{
            paddingHorizontal: 20,
            paddingTop: gIdx === 0 ? 14 : 18,
            paddingBottom: 6,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.8,
            color: colors.textTertiary,
            textTransform: 'uppercase',
          }}>
            {GROUP_LABELS[group]}
          </Text>
          {CATEGORIES.filter((c) => c.group === group).map((cat, idx, arr) => {
            const enabled = !disabled.includes(cat.key);
            const isLast = idx === arr.length - 1 && group === 'environment';
            return (
              <View
                key={cat.key}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: colors.textPrimary,
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 2,
                  }}>
                    {cat.label}
                  </Text>
                  <Text style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    lineHeight: 17,
                  }}>
                    {cat.description}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`${cat.label}, ${enabled ? 'ativado' : 'desativado'}`}
                  value={enabled}
                  onValueChange={() => onToggle(cat.key, enabled)}
                  trackColor={{
                    false: isDark ? '#3f3f46' : '#e7e5e4',
                    true:  actionTheme.passeio.primary,
                  }}
                  thumbColor={Platform.OS === 'android' ? (enabled ? '#ffffff' : '#a8a29e') : undefined}
                  ios_backgroundColor={isDark ? '#3f3f46' : '#e7e5e4'}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'há 1 mês';
  return `há ${months} meses`;
}
