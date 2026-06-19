import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Scale } from 'lucide-react-native';
import { InkPanel } from '@/components/ui/InkPanel';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/Button';
import { Kicker } from '@/components/ui/Kicker';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

interface CalorieHeroProps {
  targetKcal:    number | null;
  intakeKcal:    number;
  ratio:         number;
  remainingKcal: number;
  hasWeight:     boolean;
  onAdjustPlan:  () => void;
  onRegisterWeight: () => void;
}

/**
 * CalorieHero Bold v3 (briefing 09 § CalorieHero).
 *
 * Estados:
 *   • Sem peso → empty state com Button "Cadastrar peso"
 *   • Com peso + target → InkPanel + ProgressRing 120 + número
 *     consumido + label "de {target}" + footer "Restam X kcal" ou
 *     "Excedeu X kcal" (cores semânticas via ACTIONS_V3)
 *
 * ProgressRing fill via Reanimated já cuida do animado 0→ratio.
 * Empty state usa Stamp peso (constants/stampGlyphs Scale Lucide
 * pra empty visual — não temos glyph "peso" em STAMP_GLYPHS).
 */
export const CalorieHero = React.memo(function CalorieHero({
  targetKcal, intakeKcal, ratio, remainingKcal, hasWeight,
  onAdjustPlan, onRegisterWeight,
}: CalorieHeroProps) {
  const T = useTheme();

  if (!hasWeight || targetKcal === null) {
    return (
      <InkPanel padding={22}>
        <View style={s.emptyRow}>
          <View style={[s.emptyIcon, { backgroundColor: T.mint }]}>
            <Scale size={26} color={T.blk} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Kicker color="rgba(246,244,234,0.55)">Hoje</Kicker>
            <Text style={[s.emptyTitle, { color: T.onBlk }]}>Falta o peso</Text>
            <Text style={[s.emptySub, { color: 'rgba(246,244,234,0.62)' }]}>
              Registre o peso pra calcular a meta calórica.
            </Text>
          </View>
        </View>
        <Button
          label="Cadastrar peso"
          onPress={onRegisterWeight}
          variant="mint"
          fullWidth
          style={{ marginTop: 16 }}
          accessibilityHint="Abre o editor de plano nutricional"
        />
      </InkPanel>
    );
  }

  const excedeu = remainingKcal < 0;
  const footerColor = excedeu
    ? ACTIONS_V3.comida.primary  // laranja queimado
    : T.mint;
  const footerCopy = excedeu
    ? `Excedeu ${Math.abs(remainingKcal).toLocaleString('pt-BR')} kcal`
    : `Restam ${remainingKcal.toLocaleString('pt-BR')} kcal`;

  return (
    <InkPanel padding={22}>
      <Kicker color="rgba(246,244,234,0.55)">Hoje</Kicker>

      <View style={s.heroRow}>
        <ProgressRing
          progress={Math.min(1, ratio)}
          size="lg"
          strokeWidth={12}
          color={T.mint}
          trackColor="rgba(255,255,255,0.14)"
        />
        <View style={s.heroAbsolute} pointerEvents="none">
          <Text
            style={[s.bigNumber, { color: T.onBlk }]}
            accessibilityLabel={`${intakeKcal} calorias consumidas`}
          >
            {intakeKcal.toLocaleString('pt-BR')}
          </Text>
          <Text style={[s.ofLabel, { color: 'rgba(246,244,234,0.5)' }]}>
            de {targetKcal.toLocaleString('pt-BR')}
          </Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text
          style={[s.footerCopy, { color: footerColor }]}
          accessibilityLabel={footerCopy}
        >
          {footerCopy}
        </Text>
        <Text style={[s.footerHint, { color: 'rgba(246,244,234,0.5)' }]}>
          {intakeKcal === 0
            ? 'Registre a primeira refeição do dia.'
            : excedeu
              ? 'Tutor pode reduzir a próxima porção.'
              : 'Distribua o restante nas próximas refeições.'}
        </Text>
      </View>

      <Button
        label="Ajustar plano"
        onPress={onAdjustPlan}
        variant="mint"
        fullWidth
        style={{ marginTop: 18 }}
        accessibilityHint="Abre o editor de objetivo, peso ideal e atividade"
      />
    </InkPanel>
  );
});

CalorieHero.displayName = 'CalorieHero';

const s = StyleSheet.create({
  heroRow:      { marginTop: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroAbsolute: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bigNumber:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 32, lineHeight: 34, letterSpacing: -1.2 },
  ofLabel:      { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 10, fontWeight: '800', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  footer:       { marginTop: 18 },
  footerCopy:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 18, letterSpacing: -0.4 },
  footerHint:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 4, lineHeight: 16 },
  emptyRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emptyIcon:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyTitle:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 18, letterSpacing: -0.4, marginTop: 4 },
  emptySub:     { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18 },
});
