import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Stamp } from '@/components/ui/Stamp';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { Meal } from '@/hooks/useNutritionData';

interface MealListProps {
  meals:        Meal[];
  onPressMeal:  (id: string) => void;
  onRegister:   () => void;
}

/**
 * MealList Bold v3 (briefing 09 § MealsList + MealRow).
 *
 * Card branco com SectionHeader "Refeições de hoje". Lista refeições
 * cronologicamente. Cada row = ActionLog comida (não temos slot salvo
 * no log; derivamos do horário no hook).
 *
 * Sem botão "Adicionar refeição" inline — registro acontece via
 * RegisterStrip da Home (consistente com fluxo atual). Empty state
 * leva o tutor pra Home registrar a primeira refeição (R-fase-5-extra).
 */
export const MealList = React.memo(function MealList({
  meals, onPressMeal, onRegister,
}: MealListProps) {
  const T = useTheme();

  if (meals.length === 0) {
    return (
      <View>
        <SectionHeader title="Refeições de hoje" />
        <Card padding={20}>
          <View style={s.emptyHeader}>
            <View style={[s.emptyIcon, { backgroundColor: T.surfaceTint }]}>
              <UtensilsCrossed size={22} color={T.ink2} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.emptyTitle, { color: T.ink }]}>Nada registrado ainda</Text>
              <Text style={[s.emptySub, { color: T.ink2 }]}>
                A primeira refeição entra pela tela inicial.
              </Text>
            </View>
          </View>
          <Button
            label="Ir registrar"
            onPress={onRegister}
            variant="black"
            fullWidth
            style={{ marginTop: 14 }}
            accessibilityHint="Abre a tela inicial pra registrar uma refeição"
          />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title="Refeições de hoje" />
      <Card padding={20}>
        {meals.map((meal, i) => (
          <MealRow
            key={meal.id}
            meal={meal}
            isLast={i === meals.length - 1}
            T={T}
            onPress={() => onPressMeal(meal.id)}
          />
        ))}
      </Card>
    </View>
  );
});

MealList.displayName = 'MealList';

// ─── Row ─────────────────────────────────────────────────────

interface MealRowProps {
  meal:    Meal;
  isLast:  boolean;
  T:       Theme;
  onPress: () => void;
}

function MealRow({ meal, isLast, T, onPress }: MealRowProps) {
  return (
    <ScalePress
      onPress={onPress}
      scaleValue={0.99}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${meal.slotLabel} às ${meal.hora}. ${meal.grams} gramas. ${meal.kcal} calorias.`}
      accessibilityHint="Abre detalhe do registro"
    >
      <View style={[
        s.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: T.rule },
      ]}>
        <Stamp glyph="comida" size="sm" tint="solid" />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <Text style={[s.title, { color: T.ink }]} numberOfLines={1}>
              {meal.slotLabel}
            </Text>
            <Text style={[s.hora, { color: T.ink4 }]}>{meal.hora}</Text>
          </View>
          <Text style={[s.sub, { color: T.ink3 }]} numberOfLines={1}>
            {meal.grams > 0 ? `${meal.grams.toLocaleString('pt-BR')} g` : 'Sem quantidade'}
            {meal.note ? ` · ${meal.note}` : ''}
          </Text>
        </View>

        <View style={s.kcalBox}>
          <Text style={[s.kcal, { color: T.ink }]}>
            {meal.kcal.toLocaleString('pt-BR')}
          </Text>
          <Text style={[s.kcalUnit, { color: T.ink4 }]}>kcal</Text>
        </View>
      </View>
    </ScalePress>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  titleRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 15, letterSpacing: -0.2 },
  hora:        { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  sub:         { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 2 },
  kcalBox:     { alignItems: 'flex-end' },
  kcal:        { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.4 },
  kcalUnit:    { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  emptyHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  emptyIcon:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyTitle:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  emptySub:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2 },
});
