import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stethoscope } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { MedicalEvent, MedicalEventType } from '@/types/pet';

interface SymptomCardProps {
  recent:      MedicalEvent[];
  onAdd:       () => void;
  onPressItem: (id: string) => void;
}

const SYMPTOM_LABEL: Record<MedicalEventType, string> = {
  vomito:        'Vômito',
  febre:         'Febre',
  mancando:      'Mancando',
  diarreia:      'Diarreia',
  coceira:       'Coceira',
  perda_apetite: 'Sem apetite',
  outro:         'Outro',
};

/**
 * SymptomCard Bold v3 — preserva fluxo de Ocorrências (R-fase-4-4).
 *
 * Não estava no briefing 08 mas é feature em produção: tutor registra
 * sintomas pra mostrar ao vet. Sem este card o fluxo desapareceria.
 *
 * Composição enxuta: Header título + lista das últimas 3 ocorrências
 * + Button "Registrar ocorrência" embaixo. Modal de detalhe segue
 * legacy (Fase 9 migra).
 *
 * Empty: card simples + Button único.
 */
export const SymptomCard = React.memo(function SymptomCard({
  recent, onAdd, onPressItem,
}: SymptomCardProps) {
  const T = useTheme();

  const top3 = recent.slice(0, 3);

  if (top3.length === 0) {
    return (
      <Card padding={20}>
        <View style={s.emptyHeader}>
          <View style={[s.iconBox, { backgroundColor: T.surfaceTint }]}>
            <Stethoscope size={22} color={T.ink2} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: T.ink }]}>Sem ocorrências</Text>
            <Text style={[s.sub, { color: T.ink2 }]}>
              Registre sintomas pra acompanhar e mostrar ao veterinário.
            </Text>
          </View>
        </View>
        <Button
          label="Registrar ocorrência"
          onPress={onAdd}
          variant="black"
          fullWidth
          style={{ marginTop: 14 }}
          accessibilityHint="Abre o modal de registro de sintoma"
        />
      </Card>
    );
  }

  return (
    <Card padding={20}>
      <Text style={[s.cardTitle, { color: T.ink }]}>Últimas ocorrências</Text>

      {top3.map((e, i) => (
        <SymptomRow
          key={e.id}
          event={e}
          isLast={i === top3.length - 1}
          T={T}
          onPress={() => onPressItem(e.id)}
        />
      ))}

      <Button
        label="Registrar ocorrência"
        onPress={onAdd}
        variant="black"
        fullWidth
        style={{ marginTop: 16 }}
      />
    </Card>
  );
});

SymptomCard.displayName = 'SymptomCard';

// ─── Row ─────────────────────────────────────────────────────

interface SymptomRowProps {
  event:   MedicalEvent;
  isLast:  boolean;
  T:       Theme;
  onPress: () => void;
}

function SymptomRow({ event, isLast, T, onPress }: SymptomRowProps) {
  const date = new Date(event.timestamp);
  const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <ScalePress
      onPress={onPress}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${SYMPTOM_LABEL[event.type]}. Registrado em ${dateLabel}.`}
    >
      <View style={[
        s.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: T.rule },
      ]}>
        <View style={[s.dot, { backgroundColor: T.ink3 }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.rowTitle, { color: T.ink }]} numberOfLines={1}>
            {SYMPTOM_LABEL[event.type]}
          </Text>
          {event.note ? (
            <Text style={[s.rowNote, { color: T.ink3 }]} numberOfLines={1}>
              "{event.note}"
            </Text>
          ) : null}
        </View>
        <Text style={[s.rowDate, { color: T.ink4 }]}>{dateLabel}</Text>
      </View>
    </ScalePress>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  cardTitle:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 18, letterSpacing: -0.4, marginBottom: 12 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowTitle:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
  rowNote:     { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', fontStyle: 'italic', marginTop: 1 },
  rowDate:     { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  emptyHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconBox:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  sub:         { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
