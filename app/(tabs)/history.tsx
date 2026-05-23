import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScalePress } from '@/components/ui/ScalePress';
import { useMotion } from '@/hooks/useMotion';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolvePhotoUri } from '@/lib/photoPath';
import { usePetStore } from '@/store/usePetStore';
import { ACTION_ICON, ACTION_LABEL } from '@/constants/actionIcons';
import { BarChart3, SearchX } from 'lucide-react-native';
import type { ActionKey, ActionLog } from '@/types/pet';

// ─── Metadados estáticos das ações ───────────────────────────
// Migração 2026-05-15: emojis substituídos por Lucide. Fonte única em
// constants/actionIcons.ts.

const ACTION_META = ACTION_KEYS_HELPER();
function ACTION_KEYS_HELPER() {
  const keys: ActionKey[] = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho'];
  return Object.fromEntries(
    keys.map((k) => [k, { Icon: ACTION_ICON[k], label: ACTION_LABEL[k] }]),
  ) as Record<ActionKey, { Icon: typeof ACTION_ICON[ActionKey]; label: string }>;
}

const ACTION_KEYS: ActionKey[] = ['comida', 'agua', 'passeio', 'xixi', 'coco', 'banho'];

type FilterKey = ActionKey | 'all';

// ─── Helpers ─────────────────────────────────────────────────

function toDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDateLabel(dateStr: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today)     return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long',
  });
}

function isDayComplete(logs: ActionLog[]): boolean {
  return logs.some((l) => l.key === 'comida') && logs.some((l) => l.key === 'agua');
}

function acceptanceLabel(acceptance: NonNullable<ActionLog['acceptance']>): string {
  switch (acceptance) {
    case 'full':    return '😋 Comeu tudo';
    case 'partial': return '🥄 Parcial';
    case 'refused': return '🙅 Recusou';
  }
}

function consistencyLabel(consistency: NonNullable<ActionLog['consistency']>): string {
  switch (consistency) {
    case 'normal': return '✅ Normal';
    case 'soft':   return '〰️ Mole';
    case 'liquid': return '💧 Líquida';
    case 'hard':   return '⬛ Dura';
  }
}

// ─── Componente: item de timeline ────────────────────────────

interface TimelineItemProps {
  log: ActionLog;
  index: number;
  isLast: boolean;
}

function TimelineItem({ log, index, isLast }: TimelineItemProps) {
  const router = useRouter();
  const { colors, actionTheme } = useThemeColors();
  const { entering } = useMotion();

  const meta  = ACTION_META[log.key];
  const theme = actionTheme[log.key];

  return (
    <Animated.View entering={entering(index, 40)}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
        {/* ── Linha vertical + nó ── */}
        <View style={{ width: 28, alignItems: 'center' }}>
          {/* Nó colorido */}
          <View style={{
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: theme.primary,
            marginTop: 17,
            borderWidth: 2,
            borderColor: colors.bgScreen,
            zIndex: 1,
          }} />
          {/* Linha abaixo */}
          {!isLast && (
            <View style={{
              flex: 1, width: 2,
              backgroundColor: colors.border,
              marginTop: 2,
            }} />
          )}
        </View>

        {/* ── Card ── */}
        <View style={{ flex: 1, paddingLeft: 12, paddingBottom: 10 }}>
          <ScalePress
            onPress={() => router.push(`/log-detail?id=${log.id}`)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${meta.label} às ${formatTime(log.timestamp)}. ${log.note ? `Nota: ${log.note}` : 'Sem nota.'} Toque para editar.`}
          >
            <View style={{
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              overflow: 'hidden',
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
              }),
            }}>
              {/* Foto — se houver */}
              {log.photo && (
                <Image
                  source={{ uri: resolvePhotoUri(log.photo) }}
                  style={{ width: '100%', height: 120 }}
                  resizeMode="cover"
                  accessible={false}
                />
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                {/* Chip com ícone Lucide — sem emoji */}
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: theme.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <meta.Icon size={20} strokeWidth={2.2} color="#FFFEF8" />
                </View>

                {/* Textos */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: colors.textPrimary,
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                    {meta.label}
                  </Text>
                  <Text style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginTop: 2,
                  }}>
                    às {formatTime(log.timestamp)}
                  </Text>
                  {log.note && (
                    <Text style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginTop: 4,
                      fontStyle: 'italic',
                    }}
                    numberOfLines={2}>
                      "{log.note}"
                    </Text>
                  )}
                  {log.duration != null && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      ⏱ {log.duration} min
                    </Text>
                  )}
                  {log.quantity != null && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      ⚖️ {log.quantity}g
                    </Text>
                  )}
                  {log.subActions && log.subActions.length > 0 && (
                    <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
                      + {log.subActions.map((s) => s === 'xixi' ? 'Xixi' : s === 'coco' ? 'Cocô' : s).join(', ')}
                    </Text>
                  )}
                  {log.volumeMl != null && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      💧 {log.volumeMl}ml
                    </Text>
                  )}
                  {log.acceptance && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {acceptanceLabel(log.acceptance)}
                    </Text>
                  )}
                  {log.consistency && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {consistencyLabel(log.consistency)}
                    </Text>
                  )}
                  {log.appearance === 'abnormal' && (
                    <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                      ⚠️ Aparência alterada
                    </Text>
                  )}
                </View>

                {/* Chevron implícito */}
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: theme.primary,
                  opacity: 0.5,
                }} />
              </View>
            </View>
          </ScalePress>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function HistoryScreen() {
  const { colors, actionTheme } = useThemeColors();
  const { entering } = useMotion();

  const actionHistory = usePetStore((s) => s.actionHistory);
  const petNome       = usePetStore((s) => s.pet.nome);
  const streak        = usePetStore((s) => s.streak);

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // ── Contagens para cards de resumo ──────────────────────────
  const { totalDays, completeDays } = useMemo(() => {
    const perDay: Record<string, ActionLog[]> = {};
    actionHistory.forEach((log) => {
      const k = toDateKey(log.timestamp);
      if (!perDay[k]) perDay[k] = [];
      perDay[k].push(log);
    });
    return {
      totalDays:    Object.keys(perDay).length,
      completeDays: Object.values(perDay).filter(isDayComplete).length,
    };
  }, [actionHistory]);

  // ── Seções agrupadas da timeline ────────────────────────────
  const sections = useMemo(() => {
    const filtered = activeFilter === 'all'
      ? [...actionHistory]
      : actionHistory.filter((l) => l.key === activeFilter);

    const groups: Record<string, ActionLog[]> = {};
    filtered.forEach((log) => {
      const key = toDateKey(log.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, logs]) => ({
        date,
        label:      getDateLabel(date),
        isComplete: isDayComplete(logs),
        logs:       [...logs].sort((a, b) => a.timestamp - b.timestamp),
      }));
  }, [actionHistory, activeFilter]);

  // Índice global para stagger (passa para TimelineItem)
  const flatIndex = useCallback((sectionIndex: number, logIndex: number) => {
    let count = 0;
    for (let s = 0; s < sectionIndex; s++) {
      count += sections[s]?.logs.length ?? 0;
    }
    return count + logIndex;
  }, [sections]);

  const summaryCards = useMemo(() => [
    { value: streak,       label: 'Streak 🔥', color: colors.textPrimary },
    { value: completeDays, label: 'Completos ✅', color: '#059669' },
    { value: totalDays,    label: 'Dias ativos 📅', color: colors.textPrimary },
  ], [streak, completeDays, totalDays, colors.textPrimary]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Cabeçalho ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{
            color: colors.textTertiary, fontSize: 13, fontFamily: 'Nunito_700Bold',
          }}>
            Histórico
          </Text>
          <Text style={{
            color: colors.textPrimary, fontSize: 24,
            fontFamily: 'Nunito_700Bold', marginTop: -2,
          }}>
            {petNome || 'Seu pet'}
          </Text>
        </View>

        {/* ── Cards de resumo ── */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 }}>
          {summaryCards.map((card, index) => (
            <Animated.View key={card.label} entering={entering(index, 60)} style={{ flex: 1 }}>
              <View style={{
                backgroundColor: colors.bgCard,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 12,
                alignItems: 'center',
                ...(Platform.OS === 'android' ? { elevation: 2 } : {
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06, shadowRadius: 8,
                }),
              }}>
                <Text style={{
                  fontSize: 22, fontWeight: '700',
                  color: card.color, fontFamily: 'Nunito_800ExtraBold',
                }}>
                  {card.value}
                </Text>
                <Text style={{
                  color: colors.textTertiary, fontSize: 11,
                  fontWeight: '500', marginTop: 2, textAlign: 'center',
                }}>
                  {card.label}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* ── Filtros (Pills) ── */}
        {actionHistory.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
            style={{ marginBottom: 20 }}
          >
            {/* "Todos" pill */}
            <ScalePress
              onPress={() => setActiveFilter('all')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Filtrar: Todos"
              accessibilityState={{ selected: activeFilter === 'all' }}
              scaleValue={0.95}
              style={{
                backgroundColor: activeFilter === 'all' ? colors.textPrimary : colors.bgCard,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: activeFilter === 'all' ? colors.textPrimary : colors.border,
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeFilter === 'all' ? '#ffffff' : colors.textSecondary,
              }}>
                Todos
              </Text>
            </ScalePress>

            {/* Pills por ação */}
            {ACTION_KEYS.map((key) => {
              const meta   = ACTION_META[key];
              const theme  = actionTheme[key];
              const active = activeFilter === key;
              return (
                <ScalePress
                  key={key}
                  onPress={() => setActiveFilter(key)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar: ${meta.label}`}
                  accessibilityState={{ selected: active }}
                  scaleValue={0.95}
                  style={{
                    backgroundColor: active ? theme.primary : colors.bgCard,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : colors.border,
                  }}
                >
                  <meta.Icon size={14} strokeWidth={2.2} color={active ? '#FFFEF8' : colors.textSecondary} />
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: active ? '#FFFEF8' : colors.textSecondary,
                  }}>
                    {meta.label}
                  </Text>
                </ScalePress>
              );
            })}
          </ScrollView>
        )}

        {/* ── Timeline ── */}
        {actionHistory.length === 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <EmptyState
              Icon={BarChart3}
              title="Histórico vazio"
              subtitle="Registre as ações do seu pet no dashboard. Elas aparecerão aqui em ordem cronológica."
              accentColor={actionTheme.passeio.primary}
              accentBg={actionTheme.passeio.bg}
            />
          </View>
        ) : sections.length === 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <EmptyState
              Icon={SearchX}
              title="Nenhum resultado"
              subtitle="Nenhum registro encontrado para este filtro."
              accentColor={actionTheme.agua.primary}
              accentBg={actionTheme.agua.bg}
            />
          </View>
        ) : (
          sections.map((section, sectionIndex) => (
            <View key={section.date} style={{ marginBottom: 4 }}>
              {/* Cabeçalho de seção */}
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <Text style={{
                  fontFamily: 'Nunito_700Bold',
                  fontSize: 16,
                  color: colors.textPrimary,
                  flex: 1,
                }}>
                  {section.label}
                </Text>
                {section.isComplete && (
                  <View style={{
                    backgroundColor: actionTheme.passeio.bg,
                    borderWidth: 1,
                    borderColor: actionTheme.passeio.border,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}>
                    <Text style={{
                      color: actionTheme.passeio.primary,
                      fontSize: 11,
                      fontWeight: '700',
                    }}>
                      Dia perfeito 🏆
                    </Text>
                  </View>
                )}
              </View>

              {/* Items da timeline */}
              {section.logs.map((log, logIndex) => {
                const globalIndex = flatIndex(sectionIndex, logIndex);
                const isLastOverall =
                  sectionIndex === sections.length - 1 &&
                  logIndex === section.logs.length - 1;

                return (
                  <TimelineItem
                    key={log.id}
                    log={log}
                    index={globalIndex}
                    isLast={isLastOverall}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
