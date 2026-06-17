import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Stamp } from '@/components/ui/Stamp';
import { Kicker } from '@/components/ui/Kicker';
import type { ActionKey } from '@/types/pet';
import type { HealthInsight, InsightSeverity } from '@/services/HealthInsights';

interface InsightCardProps {
  /** Insight pré-selecionado pelo caller (priorização de
   *  `useSmartHealthNotifications` ou similar). `null` → não renderiza. */
  insight: HealthInsight | null;
}

// ─── Exceção semantic: âmbar warning fora dos tokens Theme ───
//
// Mesmo débito que `Pill warning` (sub-fase 0b §audit). InsightCard
// usa amber #FBEAD2 + tons quentes pra status de "atenção" — token
// `warning` ainda não existe no Theme bold v3 (apenas success/info via
// mint+verdigris). Fix definitivo: adicionar `T.warningTint/warningInk`
// em sprint dedicada de polish semantic.
const AMBER_BG_LIGHT   = '#FBEAD2';
const AMBER_BG_DARK    = 'rgba(194,98,10,0.18)';
const AMBER_BORDER_LIGHT = '#F0CFA6';
const AMBER_BORDER_DARK  = 'rgba(194,98,10,0.30)';

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  info:    'DE OLHO',
  warning: 'ATENÇÃO',
  alert:   'IMPORTANTE',
};

/**
 * Mapeia a categoria/tag do insight pra um Stamp de ação correspondente.
 * Default: 'agua' (assunto mais comum nos insights heurísticos).
 *
 * Mantido inline pra não criar arquivo de mapping novo enquanto o
 * universo de `insight.category` for pequeno.
 */
function insightToGlyph(insight: HealthInsight): ActionKey | 'heart' {
  const cat = insight.category?.toLowerCase() ?? '';
  if (cat.includes('agua') || cat.includes('water') || cat.includes('hidrat')) return 'agua';
  if (cat.includes('comida') || cat.includes('food') || cat.includes('nutri')) return 'comida';
  if (cat.includes('passeio') || cat.includes('walk') || cat.includes('exerc')) return 'passeio';
  if (cat.includes('banho') || cat.includes('bath') || cat.includes('hyg')) return 'banho';
  return 'heart';
}

/**
 * InsightCard Bold v3 (briefing 05 § 3.7) — substitui HealthInsightsCard
 * legacy. Mostra UM insight por vez (priorização pelo caller).
 *
 * Visual:
 *   ┌── Card âmbar radius 26 padding 18 ──────────────────────┐
 *   │ [Stamp ação]  DE OLHO                                   │
 *   │              <título Bricolage 18 800>                  │
 *   │                                                         │
 *   │ <copy Hanken 14.5 500>                                  │
 *   │ Se persistir, consulte o veterinário na tela de Saúde.  │
 *   └─────────────────────────────────────────────────────────┘
 */
export function InsightCard({ insight }: InsightCardProps) {
  const T = useTheme();
  if (!insight) return null;

  const bg     = T.isDark ? AMBER_BG_DARK     : AMBER_BG_LIGHT;
  const border = T.isDark ? AMBER_BORDER_DARK : AMBER_BORDER_LIGHT;
  const glyph  = insightToGlyph(insight);

  // Texto deduplica: se message já termina com "veterinário", não duplica
  // o disclaimer pra não soar redundante (mantém promessa do briefing
  // mas com elegância).
  const message = (insight.message ?? '').trim();
  const needsDisclaimer = !/veterin/i.test(message);

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor:     border,
        borderWidth:     1,
        borderRadius:    26,
        padding:         18,
      }}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${SEVERITY_LABEL[insight.severity ?? 'info']}. ${insight.title}. ${message}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Stamp
          glyph={glyph === 'heart' ? 'heart' : (glyph as ActionKey)}
          size="sm"
          tint={glyph === 'heart' ? 'beige' : 'solid'}
        />
        <Kicker color={T.ink2}>{SEVERITY_LABEL[insight.severity ?? 'info']}</Kicker>
      </View>

      <Text
        style={{
          fontFamily:    'BricolageGrotesque_800ExtraBold',
          color:         T.ink,
          fontSize:      18,
          fontWeight:    '800',
          letterSpacing: -0.4,
          lineHeight:    22,
          marginBottom:  8,
        }}
      >
        {insight.title}
      </Text>

      {!!message && (
        <Text
          style={{
            fontFamily: 'HankenGrotesk_500Medium',
            color:      T.ink2,
            fontSize:   14.5,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      )}

      {needsDisclaimer && (
        <Text
          style={{
            fontFamily: 'HankenGrotesk_500Medium',
            color:      T.ink3,
            fontSize:   12.5,
            lineHeight: 17,
            marginTop:  8,
          }}
        >
          Se persistir, consulte o veterinário na tela de Saúde.
        </Text>
      )}
    </View>
  );
}
