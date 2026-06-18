import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Syringe } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { VaccineWithStatus, VaccineStatus } from '@/hooks/useHealthData';

interface VaccineListProps {
  vaccines:    VaccineWithStatus[];
  onAdd:       () => void;
  onPressItem: (id: string) => void;
}

/**
 * VaccineList Bold v3 (briefing 08 § VaccineRow).
 *
 * Card branco com rows separadas por T.rule. Cada row:
 *   • Chip syringe (cor depende do status: success/warning/danger)
 *   • Nome + data aplicada
 *   • Status à direita (Pill ou "Próxima YYYY-MM-DD")
 *
 * Empty: Card simples com Button "Adicionar vacina" → modal existente.
 */
export const VaccineList = React.memo(function VaccineList({
  vaccines, onAdd, onPressItem,
}: VaccineListProps) {
  const T = useTheme();

  if (vaccines.length === 0) {
    return (
      <Card padding={20}>
        <View style={s.emptyHeader}>
          <View style={[s.iconBox, { backgroundColor: T.surfaceTint }]}>
            <Syringe size={22} color={T.ink2} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.emptyTitle, { color: T.ink }]}>Carteira vazia</Text>
            <Text style={[s.emptySub, { color: T.ink2 }]}>
              Registre as vacinas pra acompanhar reforços.
            </Text>
          </View>
        </View>
        <Button
          label="Adicionar vacina"
          onPress={onAdd}
          variant="black"
          fullWidth
          style={{ marginTop: 14 }}
          accessibilityHint="Abre o modal de adicionar vacina"
        />
      </Card>
    );
  }

  return (
    <Card padding={20}>
      {vaccines.map((v, i) => (
        <VaccineRow
          key={v.id}
          vaccine={v}
          isLast={i === vaccines.length - 1}
          T={T}
          onPress={() => onPressItem(v.id)}
        />
      ))}
    </Card>
  );
});

VaccineList.displayName = 'VaccineList';

// ─── Row ─────────────────────────────────────────────────────

interface VaccineRowProps {
  vaccine: VaccineWithStatus;
  isLast:  boolean;
  T:       Theme;
  onPress: () => void;
}

const STATUS_TONE: Record<VaccineStatus, 'success' | 'warning' | 'neutral'> = {
  applied:  'success',
  due_soon: 'warning',
  overdue:  'warning',  // Pill warning amber — sem tone='danger' no nosso primitivo
  no_next:  'neutral',
};

const STATUS_LABEL: Record<VaccineStatus, string> = {
  applied:  'Em dia',
  due_soon: 'Próxima',
  overdue:  'Atrasada',
  no_next:  'Aplicada',
};

function VaccineRow({ vaccine, isLast, T, onPress }: VaccineRowProps) {
  const isAlert = vaccine.status === 'overdue' || vaccine.status === 'due_soon';
  // Chip color: success (aplicada/em dia) ou warning (overdue/due_soon)
  const chipBg = isAlert
    ? T.isDark ? 'rgba(194,98,10,0.16)' : ACTIONS_V3.comida.tintL
    : T.isDark ? 'rgba(14,140,90,0.16)' : ACTIONS_V3.passeio.tintL;
  const chipFg = isAlert
    ? ACTIONS_V3.comida.primary
    : ACTIONS_V3.passeio.primary;

  return (
    <ScalePress
      onPress={onPress}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Vacina ${vaccine.nome}. Status: ${STATUS_LABEL[vaccine.status]}.`}
    >
      <View style={[
        s.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: T.rule },
      ]}>
        <View style={[s.chip, { backgroundColor: chipBg }]}>
          <Syringe size={18} color={chipFg} strokeWidth={2.4} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.name, { color: T.ink }]} numberOfLines={1}>
            {vaccine.nome}
          </Text>
          <Text style={[s.sub, { color: T.ink3 }]} numberOfLines={1}>
            {vaccine.status === 'no_next'
              ? `Aplicada ${vaccine.data}`
              : vaccine.status === 'overdue'
                ? `Próxima venceu em ${vaccine.proxima}`
                : vaccine.status === 'due_soon'
                  ? `Próxima ${vaccine.proxima}`
                  : `Aplicada ${vaccine.data}`}
          </Text>
        </View>

        <Pill label={STATUS_LABEL[vaccine.status]} tone={STATUS_TONE[vaccine.status]} />
      </View>
    </ScalePress>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  chip:        { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:        { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
  sub:         { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 1 },
  emptyHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconBox:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyTitle:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  emptySub:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
