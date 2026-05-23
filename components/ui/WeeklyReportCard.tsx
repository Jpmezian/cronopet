import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolvePhotoUri } from '@/lib/photoPath';

// ─── Dimensões 9:16 (Stories) ─────────────────────────────────
// Em iPhone @3x captureRef gera ~1080×1920 nativamente. Mantemos 360×640
// no JS pra layout previsível, escala 3x na captura.
const CARD_W = 360;
const CARD_H = 640;

// ─── Paleta do card ──────────────────────────────────────────
// Exceção à regra de useThemeColors: este componente é renderizado
// offscreen para captura via react-native-view-shot, então precisa
// de cores fixas independentes do tema.
//
// Refeito 2026-05-23 (feedback TestFlight R2-2): o card antigo tinha
// gradient SVG que às vezes não rendia bem no captureRef em iOS — ficava
// fundo branco + elementos soltos. Agora usamos solid color stack (Views
// empilhados) que captura perfeitamente em qualquer device. Cores migradas
// pra paleta brand CronoPet (Verdigris/Celadon/Graphite) em vez de
// emerald genérico — reforça identidade no share.
const C = {
  // Gradient brand: 3 camadas de View empilhadas (mais robusto que SVG)
  bgTop:    '#04A29B',  // Verdigris (brand primary)
  bgMid:    '#036E69',  // Verdigris deep
  bgBottom: '#024A47',  // Quase preto Verdigris

  // Accent: Celadon (mint brand)
  accent:    '#9BE4C6',
  accentDim: 'rgba(155,228,198,0.85)',

  // Neutros
  white:      '#ffffff',
  whiteSoft:  'rgba(255,255,255,0.92)',
  whiteDim:   'rgba(255,255,255,0.68)',
  whiteFaint: 'rgba(255,255,255,0.12)',
  whiteCard:  'rgba(255,255,255,0.15)',
  whiteBord:  'rgba(255,255,255,0.22)',

  // Texto sobre Celadon (rodapé brand)
  graphite:    '#1c1917',
  graphiteSub: 'rgba(28,25,23,0.72)',
};

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
}

interface WeeklyReportCardProps {
  petNome:   string;
  petFoto:   string;
  weekLabel: string;      // ex: "16/05 — 22/05"
  dailyGrid: DayData[];   // 7 items
  totals: WeeklyTotals;
  previousTotals?: WeeklyTotals;
  streak:       number;
  latestWeight: number | null;
  previousWeight?: number | null;
}

// ─── Helper: delta formatado vs semana anterior ──────────────
function formatDelta(current: number, previous: number | undefined): string | null {
  if (previous === undefined || previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return '=';
  const pct = Math.round((diff / previous) * 100);
  if (Math.abs(pct) > 999) return diff > 0 ? '+999%' : '-999%';
  return diff > 0 ? `+${pct}%` : `${pct}%`;
}

// ─── Sub-componente: StatCard 2x2 ────────────────────────────
function StatCard({
  emoji, value, label, delta,
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
    ? C.whiteDim
    : isPositive
    ? C.accent
    : isNegative
    ? '#FCA5A5'
    : C.whiteDim;

  return (
    <View style={{
      flex: 1,
      backgroundColor: C.whiteCard,
      borderWidth: 1, borderColor: C.whiteBord,
      borderRadius: 18,
      paddingVertical: 14, paddingHorizontal: 14,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        {delta && (
          <View style={{ marginLeft: 'auto' }}>
            <Text style={{
              fontSize: 10, color: deltaColor, fontWeight: '700',
              letterSpacing: 0.2,
            }}>
              {delta}
            </Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: 24, fontFamily: 'Nunito_800ExtraBold',
          color: C.white, fontWeight: '800', lineHeight: 26,
        }}
      >
        {value}
      </Text>
      <Text style={{
        fontSize: 10, color: C.whiteDim,
        fontWeight: '600', marginTop: 2,
        letterSpacing: 0.2,
      }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Componente principal ────────────────────────────────────
export const WeeklyReportCard = forwardRef<View, WeeklyReportCardProps>(
  ({
    petNome, petFoto, weekLabel, dailyGrid, totals, previousTotals,
    streak, latestWeight, previousWeight,
  }, ref) => {
    const hasFoto = !!petFoto;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ width: CARD_W, height: CARD_H, overflow: 'hidden', backgroundColor: C.bgMid }}
      >
        {/* ── BG: 3 camadas empilhadas (substitui SVG gradient) ──
            Stack vertical de 3 cores brand. Mais robusto pra captureRef
            que SVG complexo — sempre renderiza igual no Stories. */}
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: C.bgTop, height: CARD_H * 0.35,
        }]} />
        <View style={{
          position: 'absolute', left: 0, right: 0,
          top: CARD_H * 0.30, height: CARD_H * 0.40,
          backgroundColor: C.bgMid,
        }} />
        <View style={{
          position: 'absolute', left: 0, right: 0,
          top: CARD_H * 0.65, bottom: 0,
          backgroundColor: C.bgBottom,
        }} />

        {/* Círculos decorativos pra textura */}
        <View style={{
          position: 'absolute', top: 60, right: -60,
          width: 180, height: 180, borderRadius: 90,
          backgroundColor: C.accent, opacity: 0.10,
        }} />
        <View style={{
          position: 'absolute', bottom: 100, left: -50,
          width: 140, height: 140, borderRadius: 70,
          backgroundColor: C.accent, opacity: 0.08,
        }} />

        {/* ── Conteúdo ── */}
        <View style={{
          flex: 1, paddingHorizontal: 28,
          paddingTop: 36, paddingBottom: 16,
        }}>

          {/* HEADER: label + semana */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Text style={{
              fontSize: 10, color: C.accentDim,
              fontWeight: '700', letterSpacing: 2.8,
            }}>
              R E S U M O   S E M A N A L
            </Text>
            <Text style={{
              fontSize: 13, color: C.white,
              fontFamily: 'Nunito_700Bold',
              fontWeight: '700', marginTop: 6,
              letterSpacing: 0.4,
            }}>
              {weekLabel}
            </Text>
          </View>

          {/* HERO: foto grande + nome */}
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{
              width: 108, height: 108, borderRadius: 54,
              borderWidth: 4, borderColor: C.accent,
              overflow: 'hidden',
              backgroundColor: C.bgBottom,
              // Glow accent
              shadowColor: C.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5, shadowRadius: 12,
              elevation: 8,
            }}>
              {hasFoto && (
                <Image
                  source={{ uri: resolvePhotoUri(petFoto) }}
                  style={{ width: 100, height: 100 }}
                  resizeMode="cover"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 26, fontFamily: 'Nunito_800ExtraBold',
                color: C.white, fontWeight: '800',
                marginTop: 12, lineHeight: 30,
              }}
            >
              {petNome}
            </Text>
          </View>

          {/* STREAK HERO — número dramático + label.
              R3-5: emoji 🔥 posicionado absoluto à direita pra o
              número ficar visualmente centralizado no card. Antes o
              row com emoji empurrava o número pra esquerda. */}
          <View style={{
            backgroundColor: C.whiteFaint,
            borderWidth: 1, borderColor: C.whiteBord,
            borderRadius: 20,
            paddingVertical: 12, paddingHorizontal: 16,
            marginBottom: 14,
            alignItems: 'center',
            position: 'relative',
          }}>
            <Text style={{
              fontSize: 72, fontFamily: 'Nunito_800ExtraBold',
              color: C.accent, fontWeight: '800', lineHeight: 76,
              textAlign: 'center',
            }}>
              {streak}
            </Text>
            {/* Emoji em absolute pra não deslocar o número */}
            <Text style={{
              position: 'absolute',
              right: 22, top: 36,
              fontSize: 24,
            }}>🔥</Text>
            <Text style={{
              fontSize: 11, color: C.whiteSoft,
              fontWeight: '700', letterSpacing: 2,
              marginTop: 2,
            }}>
              {streak === 1 ? 'D I A   D E   S T R E A K' : 'D I A S   D E   S T R E A K'}
            </Text>
          </View>

          {/* 7-DAY GRID — narrativa visual da semana.
              R3-5: labels viraram 3 letras (Dom, Seg, Ter...) em vez
              de só 1 letra (D, S, T) que confundia (D = Dom? Quinta?
              S = Sex? Seg? Sáb?). Largura aumentada de 36 pra 40 pra
              acomodar — mantém respiro entre dias. */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            {dailyGrid.map((day, i) => (
              <View key={i} style={{ alignItems: 'center', width: 40 }}>
                <View style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: day.isComplete ? C.accent : 'transparent',
                  borderWidth: 1.5,
                  borderColor: day.isComplete ? C.accent : C.whiteBord,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontSize: day.isComplete ? 14 : 12,
                    fontWeight: '800',
                    color: day.isComplete ? C.bgBottom : C.whiteDim,
                    lineHeight: day.isComplete ? 16 : 14,
                  }}>
                    {day.isComplete ? '✓' : '·'}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 10, color: C.whiteSoft,
                  fontWeight: '700', marginTop: 6,
                  letterSpacing: 0.3,
                }}>
                  {day.dayLabel}
                </Text>
              </View>
            ))}
          </View>

          {/* STATS 2x2 — grid disciplinado */}
          <View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <StatCard
                emoji="🍖"
                value={String(totals.meals)}
                label="Refeições"
                delta={formatDelta(totals.meals, previousTotals?.meals)}
              />
              <View style={{ width: 8 }} />
              <StatCard
                emoji="💧"
                value={String(totals.water)}
                label="Hidratações"
                delta={formatDelta(totals.water, previousTotals?.water)}
              />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <StatCard
                emoji="🐾"
                value={String(totals.walks)}
                label="Passeios"
                delta={formatDelta(totals.walks, previousTotals?.walks)}
              />
              <View style={{ width: 8 }} />
              <StatCard
                emoji="⚖️"
                value={
                  latestWeight !== null
                    ? `${latestWeight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}kg`
                    : '—'
                }
                label="Peso"
                delta={
                  latestWeight !== null && previousWeight != null && previousWeight > 0
                    ? formatDelta(latestWeight, previousWeight)
                    : null
                }
              />
            </View>
          </View>
        </View>

        {/* FOOTER branding — wordmark minimal centralizado */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingBottom: 24, paddingTop: 8, alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            gap: 6,
          }}>
            <Text style={{ fontSize: 14 }}>🐾</Text>
            <Text style={{
              color: C.white,
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 14, fontWeight: '800',
              letterSpacing: 0.6,
            }}>
              CronoPet
            </Text>
          </View>
          <Text style={{
            color: C.whiteDim, fontSize: 10, fontWeight: '500',
            marginTop: 2, letterSpacing: 0.3,
          }}>
            cronopet.app
          </Text>
        </View>
      </View>
    );
  },
);

WeeklyReportCard.displayName = 'WeeklyReportCard';
