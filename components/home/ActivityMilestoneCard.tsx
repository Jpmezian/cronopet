import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ActionIcon } from '@/components/icons/ActionIcon';
import type { ActionLog, ActionKey } from '@/types/pet';

interface ActivityMilestoneCardProps {
  actionHistory: ActionLog[];
  petNome:       string;
  shownMilestones: string[];   // marcos já celebrados (formato "action-count")
  onDismiss?:    (milestoneId: string) => void;
}

// Marcos redondos a celebrar por ação
const ACTION_MILESTONES: Record<ActionKey, number[]> = {
  comida:  [50, 100, 250, 500, 1000],
  agua:    [50, 100, 250, 500, 1000],
  passeio: [10, 25, 50, 100, 200, 500],
  xixi:    [100, 500],
  coco:    [100, 500],
  banho:   [5, 10, 25, 50],
  tosa:    [3, 6, 12, 24],
};

// (Mantido pra labels; ícone vem do componente <ActionIcon /> agora — R3-6).

const ACTION_LABELS: Record<ActionKey, string> = {
  comida:  'refeições',
  agua:    'hidratações',
  passeio: 'passeios',
  xixi:    'registros de xixi',
  coco:    'registros de cocô',
  banho:   'banhos',
  tosa:    'tosas',
};

interface PendingMilestone {
  id:     string;
  action: ActionKey;
  count:  number;
  label:  string;
}

/**
 * Detecta o marco mais recente ainda não celebrado para qualquer ação.
 * Retorna null se não houver marco pendente.
 */
function findPendingMilestone(
  actionHistory: ActionLog[],
  shownMilestones: string[],
): PendingMilestone | null {
  // Conta por ação
  const counts: Record<ActionKey, number> = {
    comida: 0, agua: 0, passeio: 0, xixi: 0, coco: 0, banho: 0, tosa: 0,
  };
  actionHistory.forEach((l) => {
    counts[l.key] = (counts[l.key] ?? 0) + 1;
  });

  // Para cada ação, verifica se bateu algum marco novo
  const candidates: PendingMilestone[] = [];
  (Object.keys(counts) as ActionKey[]).forEach((key) => {
    const count = counts[key];
    const milestones = ACTION_MILESTONES[key];
    // Maior marco atingido
    const reached = milestones.filter((m) => count >= m);
    if (reached.length === 0) return;
    const topMilestone = reached[reached.length - 1];
    const id = `${key}-${topMilestone}`;
    if (shownMilestones.includes(id)) return;
    candidates.push({
      id,
      action: key,
      count:  topMilestone,
      label:  ACTION_LABELS[key],
    });
  });

  // Retorna o marco com maior valor (mais raro = mais impactante)
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0];
}

/**
 * Card celebratório que aparece quando o pet atinge marcos redondos
 * de qualquer ação (ex: 100 passeios, 500 refeições). Usa
 * `shownMilestones` no store para não celebrar 2× o mesmo marco.
 * Se nenhum marco pendente, retorna null (não renderiza).
 */
export function ActivityMilestoneCard({
  actionHistory, petNome, shownMilestones, onDismiss,
}: ActivityMilestoneCardProps) {
  const { colors, actionTheme, isDark } = useThemeColors();

  const milestone = useMemo(
    () => findPendingMilestone(actionHistory, shownMilestones),
    [actionHistory, shownMilestones],
  );

  if (!milestone) return null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Marco atingido: ${milestone.count} ${milestone.label} com ${petNome}`}
      style={{
        backgroundColor: actionTheme.comida.bg,
        borderWidth: 1.5,
        borderColor: actionTheme.comida.border,
        borderRadius: 18,
        paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 6,
        }),
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.55)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ fontSize: 26 }}>🏆</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: actionTheme.coco.primary,
          fontSize: 10, fontWeight: '800',
          letterSpacing: 1.2,
          marginBottom: 2,
        }}>
          MARCO ATINGIDO
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: actionTheme.coco.primary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 14, fontWeight: '800',
            lineHeight: 18,
          }}
        >
          {milestone.count} {milestone.label} com {petNome}!
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5, opacity: 0.85 }}>
          <ActionIcon
            action={milestone.action}
            size={12}
            color={actionTheme.coco.primary}
          />
          <Text style={{
            color: actionTheme.coco.primary,
            fontSize: 11,
          }}>
            Parabéns pela dedicação
          </Text>
        </View>
      </View>
    </View>
  );
}
