import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { resolvePhotoUri } from '@/lib/photoPath';
import { brand, verdigrisDeep, ACTIONS_V3 } from '@/constants/colors';
import { STAMP_GLYPHS, type StampGlyph } from '@/constants/stampGlyphs';

/**
 * WeeklyReportCard Bold v3 — Fase 8, port oficial do hotfix 19d380b.
 * Card 360×640 Stories. Cores fixed (captureRef precisa render uniforme,
 * sem depender de theme dark/light). Tipografia Bricolage + Hanken.
 * Stamps SVG nas stats. R-hotfix-2/3 desfeitos: foto 168 + petName 36.
 */

const CARD_W = 360;
const CARD_H = 640;

// Cores fixed pra captureRef estável (não troca com theme dark/light).
const C = {
  bgTop:         brand.beige,            // #E9F1CF
  bgBottom:      '#F2F6DE',
  accent:        brand.verdigris,        // #04A29B
  accentDim:     brand.celadon,          // #9BE4C6
  textPrimary:   brand.graphite,         // #2C2B27
  textSecondary: brand.ashBrown,         // #5C493D
  cardBg:        '#FFFFFF',
  cardBorder:    'rgba(92,73,61,0.10)',
  highlightBg:   '#FFF6E5',
  highlightBorder: 'rgba(92,73,61,0.10)',
  ink4:          '#867C6A',
} as const;

// SVG XMLs pré-montados — substituição de __FG__ em module-level
function xml(glyph: StampGlyph, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">${STAMP_GLYPHS[glyph].replace(/__FG__/g, color)}</svg>`;
}

const PAW_VERDIGRIS_XML = xml('passeio', C.accent);
const PAW_WHITE_XML     = xml('passeio', '#FFFFFF');
const SPARKLE_WHITE_XML = xml('sparkle', '#FFFFFF');

// ─── Tipos ────────────────────────────────────────────────────

export interface DayData {
  dayLabel: string;
  date:     string;
  actions:  Record<string, boolean>;
  isComplete: boolean;
}

interface WeeklyTotals {
  meals:        number;
  water:        number;
  walks:        number;
  walkDuration: number;
  foodGrams:    number;
  banhos?:      number;
  medicamentos?:number;
}

interface WeeklyReportCardProps {
  petNome:   string;
  petFoto:   string;
  petTipo?:  string;
  weekLabel: string;
  dailyGrid: DayData[];
  totals:    WeeklyTotals;
  streak:    number;
  highlight?: string;
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

// ─── Sub-componentes ─────────────────────────────────────────

function Header({ weekLabel }: { weekLabel: string }) {
  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <View style={[s.brandLogo, { backgroundColor: C.accent }]}>
          <SvgXml xml={PAW_WHITE_XML} width={16} height={16} />
        </View>
        <View>
          <Text style={s.brandName}>CronoPet</Text>
          <Text style={s.brandTagline}>A semana do seu pet</Text>
        </View>
      </View>
      <View style={s.weekChip}>
        <Text style={s.weekChipText}>{weekLabel}</Text>
      </View>
    </View>
  );
}

interface HeroProps { petNome: string; petFoto?: string; petTipo?: string }

function Hero({ petNome, petFoto, petTipo }: HeroProps) {
  return (
    <View style={s.hero}>
      <View style={s.photoFrame}>
        {petFoto && (
          <Image
            source={{ uri: resolvePhotoUri(petFoto) }}
            style={s.photo}
            resizeMode="cover"
            accessible={false}
          />
        )}
      </View>
      <Text style={s.petName} numberOfLines={1}>{petNome}</Text>
      {petTipo && <Text style={s.petSubtitle} numberOfLines={1}>{petTipo}</Text>}
    </View>
  );
}

interface StatProps {
  glyph: StampGlyph;
  bgColor: string;
  value: string;
  label: string;
}

function StatCard({ glyph, bgColor, value, label }: StatProps) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconBox, { backgroundColor: bgColor }]}>
        <SvgXml xml={xml(glyph, '#FFFFFF')} width={18} height={18} />
      </View>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

interface StatsGridProps {
  totals: WeeklyTotals;
  diasContados: number;
}

function StatsGrid({ totals, diasContados }: StatsGridProps) {
  return (
    <View style={s.statsGrid}>
      <View style={s.statsRow}>
        <StatCard glyph="passeio" bgColor={ACTIONS_V3.passeio.primary} value={String(diasContados)} label="dias" />
        <StatCard glyph="comida"  bgColor={ACTIONS_V3.comida.primary}  value={String(totals.meals)} label="refeições" />
      </View>
      <View style={s.statsRow}>
        <StatCard glyph="agua"    bgColor={ACTIONS_V3.agua.primary}    value={String(totals.water)} label="hidratações" />
        <StatCard glyph="passeio" bgColor={ACTIONS_V3.passeio.primary} value={String(totals.walks)} label="passeios" />
      </View>
      <View style={s.statsRow}>
        <StatCard glyph="banho"   bgColor={ACTIONS_V3.banho.primary}   value={String(totals.banhos ?? 0)}       label="banho" />
        <StatCard glyph="tosa"    bgColor={ACTIONS_V3.coco.primary}    value={String(totals.medicamentos ?? 0)} label="medic." />
      </View>
    </View>
  );
}

function Highlight({ text }: { text: string }) {
  return (
    <View style={s.highlightCard}>
      <View style={[s.highlightStar, { backgroundColor: C.accent }]}>
        <SvgXml xml={SPARKLE_WHITE_XML} width={20} height={20} />
      </View>
      <View style={s.highlightTextBox}>
        <Text style={s.highlightLabel}>DESTAQUE DA SEMANA</Text>
        <Text style={s.highlightValue} numberOfLines={2}>{text}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={[s.footer, { backgroundColor: C.bgBottom }]}>
      <View style={s.footerBrand}>
        <View style={[s.footerLogo, { backgroundColor: C.accent }]}>
          <SvgXml xml={PAW_WHITE_XML} width={12} height={12} />
        </View>
        <Text style={s.footerDomain}>cronopet.com.br</Text>
      </View>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────

export const WeeklyReportCard = forwardRef<View, WeeklyReportCardProps>(
  ({ petNome, petFoto, petTipo, weekLabel, dailyGrid, totals, streak, highlight, daysAcompanhados }, ref) => {
    const hasFoto = !!petFoto;
    const weekIsEmpty =
      totals.meals === 0 && totals.water === 0 && totals.walks === 0 && streak === 0;

    const diasContados = daysAcompanhados ?? deriveDaysAcompanhados(dailyGrid);
    const highlightText = highlight ?? deriveHighlight({
      streak, totalWalks: totals.walks, weekIsEmpty,
    });

    return (
      <View ref={ref} collapsable={false} style={s.root} accessible={false}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bgTop }]} />
        <View style={[StyleSheet.absoluteFill, { top: CARD_H * 0.55, backgroundColor: C.bgBottom }]} />
        {/* Watermark pata mint marca d'água — referência de marca silenciosa */}
        <View style={s.watermark} pointerEvents="none">
          <SvgXml xml={PAW_VERDIGRIS_XML} width={200} height={200} />
        </View>

        <Header weekLabel={weekLabel} />
        <Hero petNome={petNome} petFoto={hasFoto ? petFoto : undefined} petTipo={petTipo} />

        <View style={s.body}>
          {weekIsEmpty ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>Minha primeira semana{'\n'}com {petNome}</Text>
              <Text style={s.emptySubtitle}>
                Os próximos dias começam a contar a partir daqui.
              </Text>
            </View>
          ) : (
            <>
              <StatsGrid totals={totals} diasContados={diasContados} />
              <Highlight text={highlightText} />
            </>
          )}
        </View>

        <Footer />
      </View>
    );
  },
);

WeeklyReportCard.displayName = 'WeeklyReportCard';

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { width: CARD_W, height: CARD_H, overflow: 'hidden', backgroundColor: C.bgTop },
  watermark: { position: 'absolute', right: -40, bottom: 80, opacity: 0.07, transform: [{ rotate: '12deg' }] },
  // Header (h ~52)
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  brandRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandName:     { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 15, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  brandTagline:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 10, fontWeight: '500', color: C.textSecondary, marginTop: 1 },
  weekChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.cardBorder },
  weekChipText:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 10, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.3 },
  // Hero (h ~232)
  hero:          { alignItems: 'center', marginTop: 14 },
  photoFrame: {
    width: 168, height: 168, borderRadius: 84, borderWidth: 4, borderColor: C.accent,
    overflow: 'hidden', backgroundColor: C.accentDim,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  photo:         { ...StyleSheet.absoluteFillObject },
  petName:       { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 36, fontWeight: '800', color: C.textPrimary, marginTop: 12, lineHeight: 40, letterSpacing: -0.8 },
  petSubtitle:   { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', color: C.textSecondary, marginTop: 2 },
  // Body
  body:          { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 66 },
  emptyBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  emptyTitle:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 22, fontWeight: '800', color: C.textPrimary, textAlign: 'center', lineHeight: 28 },
  emptySubtitle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', color: C.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 18, paddingHorizontal: 12 },
  // Stats
  statsGrid:     { marginBottom: 10 },
  statsRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard:      { flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  statIconBox:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue:     { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, fontWeight: '800', color: C.textPrimary, lineHeight: 28, letterSpacing: -0.4 },
  statLabel:     { fontFamily: 'HankenGrotesk_500Medium', fontSize: 10, fontWeight: '500', color: C.textSecondary, marginTop: 1 },
  // Highlight
  highlightCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.highlightBg, borderWidth: 1, borderColor: C.highlightBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  highlightStar:    { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  highlightTextBox: { flex: 1 },
  highlightLabel:   { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 9, fontWeight: '800', color: verdigrisDeep, letterSpacing: 1.6 },
  highlightValue:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 14, fontWeight: '800', color: C.textPrimary, marginTop: 3, lineHeight: 18 },
  // Footer absolute
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, alignItems: 'center' },
  footerBrand:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogo:    { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  footerDomain:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: C.textSecondary },
});
