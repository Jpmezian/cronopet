import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { BarChart3 } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kicker } from '@/components/ui/Kicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StreakHero } from '@/components/history/StreakHero';
import { WeekGoalsCard } from '@/components/history/WeekGoalsCard';
import { TrendsCard } from '@/components/history/TrendsCard';
import { ReportCard } from '@/components/history/ReportCard';
import { useTheme } from '@/hooks/useTheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useMotion } from '@/hooks/useMotion';
import { useHistoryData } from '@/hooks/useHistoryData';
import { usePetStore } from '@/store/usePetStore';

/**
 * History — Bold v3 (Fase 3 — briefing 07).
 *
 * Substitui a timeline cronológica legacy por composição analítica:
 *   • Kicker "Relatório · Semana" + heading "Histórico"
 *   • StreakHero (InkPanel preto, número 62 menta, WeekStrip)
 *   • WeekGoalsCard (7 barras verdigris/mint Dom→Sáb)
 *   • TrendsCard (3 rows: Stamp · avg · MiniBars · Delta)
 *   • ReportCard (PDF pro veterinário via PdfReportService)
 *
 * Timeline detalhada por dia foi descartada nesta fase (D-extra-1
 * verdade-do-código). Acesso a log individual via TimelineToday na Home
 * (Fase 1b) continua disponível pra dia corrente. Logs antigos perdem
 * shortcut de edit — R-fase-3-1 documentado.
 *
 * Pet trocado → useHistoryData re-roda via memoKey baseada em
 * `actionHistory.length + petTipo + streak`. Confirmado via grep que
 * usePetStore re-emite actionHistory quando activePetId muda.
 */
export default function HistoryScreen() {
  const T = useTheme();
  const { colors, actionTheme } = useThemeColors();
  const { entering, sectionEntering } = useMotion();

  const pet           = usePetStore((s) => s.pet);
  const actionHistory = usePetStore((s) => s.actionHistory);
  const streak        = usePetStore((s) => s.streak);

  const data = useHistoryData(actionHistory, pet.tipo, streak);

  const petLabel = pet.nome || 'seu pet';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop:        8,
          paddingBottom:     110,
        }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <Animated.View entering={sectionEntering(0)}>
          <Kicker color={T.primary}>Relatório · Semana</Kicker>
          <Text
            style={{
              fontFamily:    'BricolageGrotesque_800ExtraBold',
              fontWeight:    '800',
              fontSize:      32,
              letterSpacing: -1.2,
              color:         T.ink,
              marginTop:     6,
            }}
            accessibilityRole="header"
          >
            Histórico
          </Text>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_500Medium',
              fontSize:   14,
              fontWeight: '500',
              color:      T.ink2,
              marginTop:  4,
            }}
          >
            A rotina de {petLabel}, em padrões.
          </Text>
        </Animated.View>

        {actionHistory.length === 0 ? (
          <View style={{ marginTop: 32 }}>
            <EmptyState
              Icon={BarChart3}
              title="Sem dados ainda"
              subtitle="Registre as ações do seu pet no início da tela. As tendências aparecem aqui depois de 1-2 dias de uso."
              accentColor={actionTheme.passeio.primary}
              accentBg={actionTheme.passeio.bg}
            />
          </View>
        ) : (
          <View style={{ marginTop: 22, gap: 22 }}>
            <Animated.View entering={entering(0)}>
              <StreakHero
                streak={streak}
                record={data.streakRecord}
                week={data.week}
              />
            </Animated.View>

            <Animated.View entering={entering(1)}>
              <WeekGoalsCard
                week={data.week}
                done={data.weekGoalsDone}
                total={data.weekGoalsTotal}
              />
            </Animated.View>

            <Animated.View entering={entering(2)}>
              <SectionHeader title="Tendências" />
              <TrendsCard trends={data.trends} />
            </Animated.View>

            <Animated.View entering={entering(3)}>
              <ReportCard />
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
