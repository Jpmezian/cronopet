import React, { forwardRef } from 'react';
import type { ComponentType } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Bath, Calendar, Drumstick, Droplet, Footprints, Pill } from 'lucide-react-native';
import { resolvePhotoUri } from '@/lib/photoPath';
import { brand, verdigrisDeep } from '@/constants/colors';

// Lucide icon prop signature comum a todos os 6 stats.
type StatIconProps = { size?: number; color?: string; strokeWidth?: number };

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
  dailyGrid: DayData[];       // 7 items — usado pra derivar daysAcompanhados
  totals: WeeklyTotals;
  streak:       number;
  /** Texto livre do "destaque da semana" — se não fornecido, derivado
   *  automaticamente do contexto (streak ou primeira semana). */
  highlight?: string;
  /** Counter de dias com pelo menos 1 log. Se não fornecido, deduzido
   *  do dailyGrid. */
  daysAcompanhados?: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function deriveDaysAcompanhados(grid: DayData[]): number {
  return grid.filter((d) => d.isComplete || Object.values(d.actions).some(Boolean)).length;
}

function deriveHighlight(args: {
  streak: number;
  totalWalks: number;
  weekIsEmpty: boolean;
}): string {
  if (args.weekIsEmpty) return 'Primeira semana com seu pet!';
  if (args.streak >= 2) return `Maior streak: ${args.streak} dias seguidos`;
  if (args.streak === 1) return 'Streak de 1 dia — primeira sequência';
  if (args.totalWalks >= 7) return `${args.totalWalks} passeios na semana`;
  return 'Semana acompanhada';
}

// ─── Sub-componente: StatCard 2×3 ─────────────────────────────
//
// Icon: Lucide SVG line outline. Verdigris #04A29B sobre fundo Celadon
// claro #E9F1CF, stroke-width 1.6 (combinação testada no HTML
// cronopet-semana-bidu, mantém leveza editorial). Override do
// CLAUDE.md "emojis em ações do pet" foi decisão consciente do CTO
// pro card de share — emojis seguem usados em ActionButton e outros
// pontos do app.

function StatCard({
  Icon,
  value,
  label,
}: {
  Icon: ComponentType<StatIconProps>;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.statIconBox}>
          <Icon size={20} color={C.accent} strokeWidth={1.6} />
        </View>
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
    streak,
    highlight,
    daysAcompanhados,
  }, ref) => {
    const hasFoto = !!petFoto;

    // "Primeira semana": tudo zerado.
    const weekIsEmpty =
      totals.meals === 0 &&
      totals.water === 0 &&
      totals.walks === 0 &&
      streak === 0;

    // Stats novos derivados / fallback
    const banhos = totals.banhos ?? 0;
    const medicamentos = totals.medicamentos ?? 0;
    const diasContados = daysAcompanhados ?? deriveDaysAcompanhados(dailyGrid);
    const highlightText = highlight ?? deriveHighlight({
      streak,
      totalWalks: totals.walks,
      weekIsEmpty,
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
              {/* ── STATS 2×3 grid (Lucide outline Verdigris) ── */}
              <View style={styles.statsGrid}>
                <View style={styles.statsRow}>
                  <StatCard Icon={Calendar}   value={String(diasContados)}   label="dias" />
                  <StatCard Icon={Drumstick}  value={String(totals.meals)}   label="refeições" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard Icon={Droplet}    value={String(totals.water)}   label="hidratações" />
                  <StatCard Icon={Footprints} value={String(totals.walks)}   label="passeios" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard Icon={Bath}       value={String(banhos)}         label="banho" />
                  <StatCard Icon={Pill}       value={String(medicamentos)}   label="medic." />
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
    // absoluteFillObject pra Image ocupar a área cheia do photoFrame
    // (168x168), ignorando o "box-shrink" causado por borderWidth: 4.
    // Sem isso, Image fica 160x160 e cover crop perde respiro do focinho.
    ...StyleSheet.absoluteFillObject,
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
    // Reserva espaço pro footer absoluto (~44px) + respiro.
    paddingBottom: 56,
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

  // Footer — position absolute pra ficar ancorado ao bottom sem
  // depender do flex flow do body (que pode estourar com conteúdo
  // dinâmico). Bug 1 corrigido em 2026-06-13.
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'center',
    // Fundo beige inferior pra footer não vazar visual do gradient.
    backgroundColor: C.bgBottom,
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

