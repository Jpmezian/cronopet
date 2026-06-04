import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolvePhotoUri } from '@/lib/photoPath';
import { brand, verdigrisDeep } from '@/constants/colors';

// ─── Dimensões 9:16 (Stories) ─────────────────────────────────
// Em iPhone @3x captureRef gera ~1080×1920 nativamente. Mantemos 360×640
// no JS pra layout previsível, escala 3x na captura.
const CARD_W = 360;
const CARD_H = 640;

// ─── Paleta do card ──────────────────────────────────────────
// Exceção à regra de useThemeColors: este componente é renderizado
// offscreen para captura via react-native-view-shot, então precisa
// de cores fixas independentes do tema. Mas TODAS importadas de
// constants/colors.ts — zero hex hardcoded (lei do CLAUDE.md).
//
// Histórico:
//   • R2-2 (2026-05-23): refeito do zero, gradient SVG trocado por
//     stack de cores (mais robusto pra captureRef em iOS).
//   • R3-5 (2026-05-25): polish primeira semana, labels 3 letras
//     no grid, streak hero posicionamento centralizado.
//   • P2-B1/B2 (2026-05-30): semana Dom→Sáb, fix footer/streak/empty.
//   • Refresh visual (2026-06-03): adoção do design Beige claro
//     conforme HTML cronopet-semana-bidu. Mantém streak hero +
//     7-day grid + delta + weekIsEmpty (decisões CTO).
//     Stats expandem de 4 (refeições/água/passeios/peso) pra 6
//     (refeições/água/passeios/banhos/medicamentos/dias-acompanhados).
const C = {
  // Background brand beige (gradient stack 2 camadas)
  bgTop:    brand.beige,     // #E9F1CF
  bgBottom: '#F2F6DE',       // beige clareado p/ profundidade suave

  // Accent / texto principal
  accent:    brand.verdigris, // #04A29B
  accentDim: brand.celadon,   // #9BE4C6

  // Texto sobre fundo beige
  textPrimary:   brand.graphite,  // #2C2B27 — H1/H2 e números
  textSecondary: brand.ashBrown,  // #5C493D — subtítulos/labels

  // Cards brancos sobre o beige (separação leve)
  cardBg:     '#FFFFFF',
  cardBorder: 'rgba(92,73,61,0.10)',  // ashBrown @ 10% — borda sutil

  // Highlight ("destaque da semana") — fundo creme warm
  highlightBg:     '#FFF6E5',
  highlightBorder: 'rgba(92,73,61,0.10)',

  // Hex auxiliares com alpha (impossível derivar de tokens sem RGBA helper)
  whiteSoft:  'rgba(255,255,255,0.92)',
  textOnAccent: '#FFFFFF',

  // Bg de ícone sobre card branco (celadon diluído)
  iconBg: brand.beige,
} as const;

// ─── Tipos ────────────────────────────────────────────────────

export interface DayData {
  dayLabel: string;
  date:     string;      // DD/MM
  actions:  Record<string, boolean>;
  isComplete: boolean;
}

interface WeeklyTotals {
  meals:        number;
  water:        number;
  walks:        number;
  walkDuration: number;
  foodGrams:    number;
  /** Adicionado no refresh visual 2026-06-03. Optional pra back-compat.
   *  Counter de logs com key='banho' na semana. */
  banhos?:      number;
  /** Adicionado no refresh visual 2026-06-03. Optional pra back-compat.
   *  App não rastreia medicamento como ActionKey hoje (TODO P3 documentado
   *  em docs/TODO.md). Caller pode derivar de medicalEvents/vaccines se
   *  fizer sentido; default 0. */
  medicamentos?: number;
}

interface WeeklyReportCardProps {
  petNome:   string;
  petFoto:   string;
  petTipo?:  string;          // ex: "Golden Retriever · 3 anos" (formatado pelo caller)
  weekLabel: string;          // ex: "28 mai – 03 jun"
  dailyGrid: DayData[];       // 7 items
  totals: WeeklyTotals;
  previousTotals?: WeeklyTotals;
  streak:       number;
  latestWeight: number | null;
  previousWeight?: number | null;
  /** Adicionado no refresh visual 2026-06-03. Texto livre do "destaque
   *  da semana" — se não fornecido, derivado automaticamente do
   *  contexto (streak ou peso ou primeira semana). */
  highlight?: string;
  /** Adicionado no refresh visual 2026-06-03. Counter de dias com
   *  pelo menos 1 log. Se não fornecido, deduzido do dailyGrid. */
  daysAcompanhados?: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDelta(current: number, previous: number | undefined): string | null {
  if (previous === undefined || previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return '=';
  const pct = Math.round((diff / previous) * 100);
  if (Math.abs(pct) > 999) return diff > 0 ? '+999%' : '-999%';
  return diff > 0 ? `+${pct}%` : `${pct}%`;
}

function deriveDaysAcompanhados(grid: DayData[]): number {
  return grid.filter((d) => d.isComplete || Object.values(d.actions).some(Boolean)).length;
}

function deriveHighlight(args: {
  streak: number;
  totalWalks: number;
  weekIsEmpty: boolean;
  latestWeight: number | null;
  previousWeight: number | null | undefined;
}): string {
  if (args.weekIsEmpty) return 'Primeira semana com seu pet!';
  if (args.streak >= 7) return `Maior streak: ${args.streak} dias seguidos`;
  if (args.streak >= 3) return `${args.streak} dias de sequência`;
  if (args.totalWalks >= 7) return `${args.totalWalks} passeios na semana`;
  if (args.latestWeight !== null && args.previousWeight != null && args.previousWeight > 0) {
    const diff = args.latestWeight - args.previousWeight;
    if (Math.abs(diff) >= 0.1) {
      return diff > 0
        ? `Ganhou ${diff.toFixed(1)}kg na semana`
        : `Perdeu ${Math.abs(diff).toFixed(1)}kg na semana`;
    }
  }
  return 'Semana acompanhada';
}

// ─── Sub-componente: StatCard 2×3 ─────────────────────────────

function StatCard({
  emoji,
  value,
  label,
  delta,
}: {
  emoji: string;
  value: string;
  label: string;
  delta?: string | null;
}) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  const isEqual = delta === '=';
  const deltaColor = isEqual
    ? C.textSecondary
    : isPositive
    ? C.accent
    : isNegative
    ? '#B45309'  // amber-700 — semantic warn no card claro
    : C.textSecondary;

  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.statIconBox}>
          <Text style={styles.statEmoji}>{emoji}</Text>
        </View>
        {delta && (
          <View style={styles.statDeltaPill}>
            <Text style={[styles.statDeltaText, { color: deltaColor }]}>
              {delta}
            </Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.statValue}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────

export const WeeklyReportCard = forwardRef<View, WeeklyReportCardProps>(
  ({
    petNome,
    petFoto,
    petTipo,
    weekLabel,
    dailyGrid,
    totals,
    previousTotals,
    streak,
    latestWeight,
    previousWeight,
    highlight,
    daysAcompanhados,
  }, ref) => {
    const hasFoto = !!petFoto;

    // ── "Primeira semana": tudo zerado, sem streak, sem peso ──────
    const weekIsEmpty =
      totals.meals === 0 &&
      totals.water === 0 &&
      totals.walks === 0 &&
      streak === 0 &&
      latestWeight == null;

    // Stats novos derivados / fallback
    const banhos = totals.banhos ?? 0;
    const medicamentos = totals.medicamentos ?? 0;
    const diasContados = daysAcompanhados ?? deriveDaysAcompanhados(dailyGrid);
    const highlightText = highlight ?? deriveHighlight({
      streak,
      totalWalks: totals.walks,
      weekIsEmpty,
      latestWeight,
      previousWeight,
    });

    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.root}
        accessible={false}
      >
        {/* ── BG: 2 camadas beige empilhadas (substitui linear-gradient) ──
            Estável pra captureRef em iOS — sempre renderiza igual. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bgTop }]} />
        <View style={[StyleSheet.absoluteFill, {
          top: CARD_H * 0.55,
          backgroundColor: C.bgBottom,
        }]} />

        {/* ── HEADER: wordmark + chip data ── */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoGlyph}>🐾</Text>
            </View>
            <View>
              <Text style={styles.brandName}>CronoPet</Text>
              <Text style={styles.brandTagline}>A semana do seu pet</Text>
            </View>
          </View>
          <View style={styles.weekChip}>
            <Text style={styles.weekChipText}>{weekLabel}</Text>
          </View>
        </View>

        {/* ── HERO: foto grande + nome ── */}
        <View style={styles.hero}>
          <View style={styles.photoFrame}>
            {hasFoto && (
              <Image
                source={{ uri: resolvePhotoUri(petFoto) }}
                style={styles.photo}
                resizeMode="cover"
                accessible={false}
              />
            )}
          </View>
          <Text style={styles.petName} numberOfLines={1}>
            {petNome}
          </Text>
          {petTipo && (
            <Text style={styles.petSubtitle} numberOfLines={1}>
              {petTipo}
            </Text>
          )}
        </View>

        {/* ── BODY: condicional weekIsEmpty vs full ── */}
        <View style={styles.body}>
          {weekIsEmpty ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                Minha primeira semana{'\n'}com {petNome}
              </Text>
              <Text style={styles.emptySubtitle}>
                Os próximos dias começam a contar a partir daqui.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Streak hero (mantido das 3 sprints — R2-2/R3-5/P2-B2) ── */}
              {streak > 0 && (
                <View style={styles.streakHero}>
                  <Text style={styles.streakNumber}>{streak}</Text>
                  <Text style={styles.streakFlame}>🔥</Text>
                  <Text style={styles.streakLabel}>
                    {streak === 1 ? 'DIA DE STREAK' : 'DIAS DE STREAK'}
                  </Text>
                </View>
              )}

              {/* ── 7-day grid (R3-5: labels 3 letras Dom→Sáb) ── */}
              <View style={styles.weekGrid}>
                {dailyGrid.map((day, i) => (
                  <View key={i} style={styles.weekDay}>
                    <View style={[
                      styles.weekDot,
                      day.isComplete
                        ? styles.weekDotComplete
                        : styles.weekDotEmpty,
                    ]}>
                      <Text style={[
                        styles.weekDotMark,
                        { color: day.isComplete ? C.textOnAccent : C.textSecondary },
                      ]}>
                        {day.isComplete ? '✓' : '·'}
                      </Text>
                    </View>
                    <Text style={styles.weekDayLabel}>{day.dayLabel}</Text>
                  </View>
                ))}
              </View>

              {/* ── STATS 2×3 grid ── */}
              <View style={styles.statsGrid}>
                <View style={styles.statsRow}>
                  <StatCard
                    emoji="📅"
                    value={String(diasContados)}
                    label="dias"
                    delta={null}
                  />
                  <StatCard
                    emoji="🍖"
                    value={String(totals.meals)}
                    label="refeições"
                    delta={formatDelta(totals.meals, previousTotals?.meals)}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard
                    emoji="💧"
                    value={String(totals.water)}
                    label="hidratações"
                    delta={formatDelta(totals.water, previousTotals?.water)}
                  />
                  <StatCard
                    emoji="🐾"
                    value={String(totals.walks)}
                    label="passeios"
                    delta={formatDelta(totals.walks, previousTotals?.walks)}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard
                    emoji="🛁"
                    value={String(banhos)}
                    label="banho"
                    delta={formatDelta(banhos, previousTotals?.banhos)}
                  />
                  <StatCard
                    emoji="💊"
                    value={String(medicamentos)}
                    label="medic."
                    delta={null}
                  />
                </View>
              </View>

              {/* ── HIGHLIGHT card (destaque da semana) ── */}
              <View style={styles.highlightCard}>
                <View style={styles.highlightStar}>
                  <Text style={styles.highlightStarGlyph}>⭐</Text>
                </View>
                <View style={styles.highlightTextBox}>
                  <Text style={styles.highlightLabel}>
                    DESTAQUE DA SEMANA
                  </Text>
                  <Text style={styles.highlightValue} numberOfLines={2}>
                    {highlightText}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── FOOTER: wordmark + domínio ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <View style={styles.footerLogo}>
              <Text style={styles.footerLogoGlyph}>🐾</Text>
            </View>
            <Text style={styles.footerDomain}>cronopet.com.br</Text>
          </View>
        </View>
      </View>
    );
  },
);

WeeklyReportCard.displayName = 'WeeklyReportCard';

// ─── StyleSheet ──────────────────────────────────────────────
// Sem hex hardcoded — tudo via C.* derivado de constants/colors.ts.
// Spacing múltiplo de 4 conforme CLAUDE.md.

const styles = StyleSheet.create({
  root: {
    width: CARD_W,
    height: CARD_H,
    overflow: 'hidden',
    backgroundColor: C.bgTop,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoGlyph: {
    fontSize: 14,
    color: C.textOnAccent,
  },
  brandName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: 9,
    color: C.textSecondary,
    marginTop: 1,
  },
  weekChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  weekChipText: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginTop: 16,
  },
  photoFrame: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 4,
    borderColor: C.accent,
    overflow: 'hidden',
    backgroundColor: C.accentDim,
    // Glow sutil
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  petName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 36,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 12,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  petSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // weekIsEmpty
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },
  emptySubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: 12,
  },

  // Streak hero
  streakHero: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  streakNumber: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 44,
    fontWeight: '800',
    color: C.textOnAccent,
    lineHeight: 48,
    textAlign: 'center',
  },
  streakFlame: {
    position: 'absolute',
    right: 16,
    top: 14,
    fontSize: 20,
  },
  streakLabel: {
    fontSize: 9,
    color: C.textOnAccent,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -2,
    opacity: 0.92,
  },

  // 7-day grid
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDay: {
    alignItems: 'center',
    width: 40,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotComplete: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  weekDotEmpty: {
    backgroundColor: 'transparent',
    borderColor: C.cardBorder,
  },
  weekDotMark: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  weekDayLabel: {
    fontSize: 9,
    color: C.textSecondary,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Stats grid
  statsGrid: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 16,
  },
  statDeltaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(4,162,155,0.08)',
  },
  statDeltaText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },

  // Highlight
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.highlightBg,
    borderWidth: 1,
    borderColor: C.highlightBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  highlightStar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightStarGlyph: {
    fontSize: 18,
    color: C.textOnAccent,
  },
  highlightTextBox: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: '800',
    // verdigrisDeep #036E69 sobre #FFF6E5 = ~5.5:1 (WCAG AA pra texto
    // pequeno). C.accent #04A29B sobre #FFF6E5 = ~4.0:1 — falha em 9px.
    color: verdigrisDeep,
    letterSpacing: 1.8,
  },
  highlightValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoGlyph: {
    fontSize: 10,
    color: C.textOnAccent,
  },
  footerDomain: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: '600',
  },
});

