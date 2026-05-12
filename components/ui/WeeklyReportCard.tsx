import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle as SvgCircle } from 'react-native-svg';

// ─── Dimensões 9:16 ───────────────────────────────────────────
const CARD_W = 360;
const CARD_H = 640;

// ─── Paleta do card ──────────────────────────────────────────
// Exceção à regra de useThemeColors: este componente é renderizado
// offscreen para captura via react-native-view-shot, então precisa
// de cores fixas independentes do tema.
const C = {
  gradTop:    '#10b981',  // emerald-500
  gradMid:    '#047857',  // emerald-700
  gradBottom: '#064e3b',  // emerald-900
  gold:       '#04A29B',  // amber-400
  goldDark:   '#f59e0b',  // amber-500
  white:      '#ffffff',
  whiteSoft:  'rgba(255,255,255,0.88)',
  whiteDim:   'rgba(255,255,255,0.62)',
  whiteFaint: 'rgba(255,255,255,0.10)',
  whiteBord:  'rgba(255,255,255,0.18)',
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
  weekLabel: string;      // ex: "31/03 — 06/04"
  dailyGrid: DayData[];   // 7 items
  totals: WeeklyTotals;
  previousTotals?: WeeklyTotals;  // semana anterior — para mostrar deltas
  streak:       number;
  latestWeight: number | null;
  previousWeight?: number | null; // peso da semana anterior (se houver)
}

// ─── Helper: formata delta vs semana anterior ────────────────
function formatDelta(current: number, previous: number | undefined): string | null {
  if (previous === undefined || previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return '=';
  const pct = Math.round((diff / previous) * 100);
  if (Math.abs(pct) > 999) return diff > 0 ? '+999%' : '-999%';
  return diff > 0 ? `+${pct}%` : `${pct}%`;
}

// ─── Sub-componente: StatCard ────────────────────────────────
function StatCard({ emoji, value, label, delta }: { emoji: string; value: string; label: string; delta?: string | null }) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  const isEqual = delta === '=';
  const deltaColor = isEqual
    ? 'rgba(255,255,255,0.55)'
    : isPositive
    ? '#9BE4C6'  // green-300
    : isNegative
    ? '#fca5a5'  // red-300
    : 'rgba(255,255,255,0.55)';

  return (
    <View style={{
      flex: 1,
      backgroundColor: C.whiteFaint,
      borderWidth: 1, borderColor: C.whiteBord,
      borderRadius: 16,
      paddingVertical: 12, paddingHorizontal: 12,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <Text style={{ fontSize: 24, marginRight: 10 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: 20, fontFamily: 'Nunito_800ExtraBold',
              color: C.white, fontWeight: '800', lineHeight: 22,
              flexShrink: 1,
            }}
          >
            {value}
          </Text>
          {delta && (
            <Text style={{
              fontSize: 10, color: deltaColor, fontWeight: '700', marginLeft: 4,
            }}>
              {delta}
            </Text>
          )}
        </View>
        <Text style={{
          fontSize: 10, color: C.whiteDim,
          fontWeight: '600', marginTop: 1,
        }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─── Componente principal ────────────────────────────────────
export const WeeklyReportCard = forwardRef<View, WeeklyReportCardProps>(
  ({ petNome, petFoto, weekLabel, dailyGrid, totals, previousTotals, streak, latestWeight, previousWeight }, ref) => {
    const hasFoto = !!petFoto;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ width: CARD_W, height: CARD_H, overflow: 'hidden' }}
      >
        {/* ── Background: gradient vibrante ── */}
        <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor={C.gradTop}    />
              <Stop offset="0.5" stopColor={C.gradMid}    />
              <Stop offset="1"   stopColor={C.gradBottom} />
            </LinearGradient>
            <LinearGradient id="shine" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0"   stopColor="rgba(255,255,255,0.15)" />
              <Stop offset="0.5" stopColor="rgba(255,255,255,0)"    />
            </LinearGradient>
          </Defs>
          <Rect width={CARD_W} height={CARD_H} fill="url(#bg)"    />
          <Rect width={CARD_W} height={CARD_H} fill="url(#shine)" />
          {/* Círculos decorativos */}
          <SvgCircle cx={CARD_W + 30}  cy={90}          r={120} fill="rgba(251,191,36,0.10)" />
          <SvgCircle cx={-40}          cy={CARD_H - 80} r={140} fill="rgba(255,255,255,0.06)" />
        </Svg>

        {/* ── Conteúdo ── */}
        <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 20 }}>

          {/* ── TOP: label + semana ── */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{
              fontSize: 10, color: C.whiteDim,
              fontWeight: '700', letterSpacing: 2.4,
            }}>
              R E S U M O   S E M A N A L
            </Text>
            <Text style={{
              fontSize: 12, color: C.gold,
              fontWeight: '700', marginTop: 4, letterSpacing: 0.5,
            }}>
              {weekLabel}
            </Text>
          </View>

          {/* ── HERO: foto + nome ── */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              borderWidth: 3, borderColor: C.gold,
              overflow: 'hidden',
              backgroundColor: C.gradBottom,
            }}>
              {hasFoto && (
                <Image
                  source={{ uri: petFoto }}
                  style={{ width: 88, height: 88 }}
                  resizeMode="cover"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 26, fontFamily: 'Nunito_800ExtraBold',
                color: C.white, fontWeight: '800',
                marginTop: 10, lineHeight: 30,
              }}
            >
              {petNome}
            </Text>
          </View>

          {/* ── STREAK HERO ── */}
          <View style={{
            backgroundColor: C.whiteFaint,
            borderWidth: 1, borderColor: C.whiteBord,
            borderRadius: 22,
            paddingVertical: 14, paddingHorizontal: 20,
            marginBottom: 16,
            alignItems: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                fontSize: 64, fontFamily: 'Nunito_800ExtraBold',
                color: C.gold, fontWeight: '800', lineHeight: 68,
              }}>
                {streak}
              </Text>
              <Text style={{ fontSize: 32, marginLeft: 8 }}>🔥</Text>
            </View>
            <Text style={{
              fontSize: 11, color: C.whiteSoft,
              fontWeight: '700', letterSpacing: 1.8,
              marginTop: 2,
            }}>
              D I A S   D E   S T R E A K
            </Text>
          </View>

          {/* ── GRID 7 DIAS ── */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {dailyGrid.map((day, i) => (
                <View key={i} style={{ alignItems: 'center', width: 36 }}>
                  <View style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: day.isComplete ? C.gold : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderColor: day.isComplete ? C.goldDark : C.whiteBord,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: day.isComplete ? 15 : 11,
                      fontWeight: '800',
                      color: day.isComplete ? C.gradBottom : C.whiteDim,
                      lineHeight: day.isComplete ? 18 : 14,
                    }}>
                      {day.isComplete ? '✓' : '·'}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 10, color: C.whiteDim,
                    fontWeight: '700', marginTop: 4,
                    letterSpacing: 0.3,
                  }}>
                    {day.dayLabel.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── STATS 2x2 ── */}
          <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <StatCard
                emoji="🍖"
                value={String(totals.meals)}
                label="refeições"
                delta={formatDelta(totals.meals, previousTotals?.meals)}
              />
              <View style={{ width: 8 }} />
              <StatCard
                emoji="💧"
                value={String(totals.water)}
                label="hidratações"
                delta={formatDelta(totals.water, previousTotals?.water)}
              />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <StatCard
                emoji="🐾"
                value={String(totals.walks)}
                label="passeios"
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
                label="peso atual"
                delta={
                  latestWeight !== null && previousWeight != null && previousWeight > 0
                    ? formatDelta(latestWeight, previousWeight)
                    : null
                }
              />
            </View>
          </View>
        </View>

        {/* ── Footer branding ── */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingBottom: 22, alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: C.gold,
            borderRadius: 24,
            paddingHorizontal: 20, paddingVertical: 10,
          }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>🐾</Text>
            <View>
              <Text style={{
                color: '#2C2B27', fontFamily: 'Nunito_800ExtraBold',
                fontSize: 14, fontWeight: '800', letterSpacing: 0.3,
              }}>
                CronoPet
              </Text>
              <Text style={{
                color: '#2C2B27', fontSize: 9, fontWeight: '700', opacity: 0.72,
              }}>
                cronopet.app
              </Text>
            </View>
          </View>
          <Text style={{
            color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: '600',
            marginTop: 6,
          }}>
            Baixe grátis · Cuide melhor do seu pet
          </Text>
        </View>
      </View>
    );
  },
);

WeeklyReportCard.displayName = 'WeeklyReportCard';
