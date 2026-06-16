import React, { useState } from 'react';
import { Text, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sun, Moon } from 'lucide-react-native';

import { Chip } from '@/components/ui/Chip';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MiniBars } from '@/components/ui/MiniBars';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScalePress } from '@/components/ui/ScalePress';
import { Card } from '@/components/ui/Card';

import { useTheme } from '@/hooks/useTheme';
import { usePetStore } from '@/store/usePetStore';
import type { Tone } from '@/constants/colors';

// ─── Sandbox: primitivos compostos (0c) ───────────────────────

const TONES: Tone[] = ['mint', 'pastel', 'terroso', 'solido'];

export default function PrimitivesCompSandbox() {
  const router       = useRouter();
  const T            = useTheme();
  const themeMode    = usePetStore((s) => s.themeMode);
  const setThemeMode = usePetStore((s) => s.setThemeMode);
  const tone         = usePetStore((s) => s.tone);
  const setTone      = usePetStore((s) => s.setTone);

  // State local pros demos interativos
  const [activeFilter, setActiveFilter]   = useState<string>('all');
  const [progress, setProgress]           = useState(0.64);

  const PRESS_COUNTER = useState({ a: 0, b: 0, c: 0 });
  const [counter, setCounter] = PRESS_COUNTER;
  const bump = (k: 'a' | 'b' | 'c') => setCounter((p) => ({ ...p, [k]: p[k] + 1 }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[styles.header, { borderBottomColor: T.ruleSoft }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={22} color={T.ink} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { color: T.ink }]} numberOfLines={1}>
          Primitivos compostos
        </Text>
        <Pressable
          onPress={() => setThemeMode(T.isDark ? 'light' : 'dark')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Alternar pra ${T.isDark ? 'claro' : 'escuro'}`}
        >
          {T.isDark ? <Sun size={22} color={T.ink} /> : <Moon size={22} color={T.ink} />}
        </Pressable>
      </View>

      <View style={styles.tonePicker}>
        {TONES.map((t) => {
          const active = tone === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTone(t)}
              style={[
                styles.toneChip,
                { borderColor: active ? T.blk : T.ruleSoft, backgroundColor: active ? T.blk : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Tom ${t}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={{ color: active ? T.onBlk : T.ink2, fontSize: 12, fontWeight: '700' }}>{t}</Text>
            </Pressable>
          );
        })}
        <Text style={{ marginLeft: 'auto', color: T.ink3, fontSize: 11 }}>
          {themeMode}/{tone}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 60 }}>

        {/* Chip */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Chip" />
          <Text style={{ color: T.ink3, fontSize: 12 }}>Filter pill stateless — caller controla selected.</Text>
          <View style={styles.row}>
            {(['all', 'comida', 'agua', 'passeio'] as const).map((k) => (
              <Chip
                key={k}
                label={k === 'all' ? 'Todos' : k}
                selected={activeFilter === k}
                onPress={() => setActiveFilter(k)}
              />
            ))}
            <Chip label="Display only" />
          </View>
        </View>

        {/* ProgressRing */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="ProgressRing"
            actionLabel="Reset"
            onActionPress={() => setProgress(0)}
          />
          <Text style={{ color: T.ink3, fontSize: 12 }}>3 sizes × valor controlado. Tap nos chips muda o progresso.</Text>
          <View style={styles.row}>
            {[0, 0.25, 0.64, 1].map((p) => (
              <Chip key={p} label={`${Math.round(p * 100)}%`} selected={progress === p} onPress={() => setProgress(p)} />
            ))}
          </View>
          <View style={[styles.row, { alignItems: 'flex-end' }]}>
            <ProgressRing progress={progress} size="sm" />
            <ProgressRing progress={progress} size="md" />
            <ProgressRing progress={progress} size="lg" />
            <ProgressRing progress={progress} size="md" color={T.primary} trackColor={T.beige} />
            <ProgressRing progress={progress} size="md" animated={false} />
          </View>
        </View>

        {/* MiniBars */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="MiniBars" />
          <Text style={{ color: T.ink3, fontSize: 12 }}>7 dias da semana. Cor passada por caller.</Text>
          <Card padding={16}>
            <View style={{ gap: 12 }}>
              <Row label="Água"     T={T}>
                <MiniBars data={[2, 3, 4, 3, 5, 2, 4]} color="#0B7BB5" />
              </Row>
              <Row label="Comida"   T={T}>
                <MiniBars data={[3, 3, 2, 3, 2, 3, 3]} color="#C2620A" />
              </Row>
              <Row label="Passeio"  T={T}>
                <MiniBars data={[1, 2, 1, 0, 2, 1, 2]} color="#0E8C5A" />
              </Row>
              <Row label="Zero day" T={T}>
                <MiniBars data={[0, 0, 0, 0, 0, 0, 0]} color={T.ink4} />
              </Row>
            </View>
          </Card>
        </View>

        {/* SectionHeader */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="SectionHeader" />
          <Text style={{ color: T.ink3, fontSize: 12 }}>4 variantes — refactored in-place sem border bottom.</Text>
          <Card padding={16}>
            <View style={{ gap: 16 }}>
              <SectionHeader title="Só título" />
              <SectionHeader title="Com link" actionLabel="Ver tudo" onActionPress={() => undefined} />
              <SectionHeader title="Com subtítulo" subtitle="Deprecated mas funcional" />
              <SectionHeader title="Accent" accent={T.primary} actionLabel="Editar" onActionPress={() => undefined} />
            </View>
          </Card>
        </View>

        {/* ScalePress */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="ScalePress" />
          <Text style={{ color: T.ink3, fontSize: 12 }}>Mantido as-is desde antes da Bold v3 (auditoria 0c: OK).</Text>
          <View style={styles.row}>
            <ScalePress onPress={() => bump('a')} style={[styles.box, { backgroundColor: T.card, borderColor: T.rule }]}>
              <Text style={{ color: T.ink, fontWeight: '700' }}>Padrão ({counter.a})</Text>
              <Text style={{ color: T.ink3, fontSize: 11 }}>scale 0.96</Text>
            </ScalePress>
            <ScalePress onPress={() => bump('b')} scaleValue={0.86} style={[styles.box, { backgroundColor: T.card, borderColor: T.rule }]}>
              <Text style={{ color: T.ink, fontWeight: '700' }}>Custom ({counter.b})</Text>
              <Text style={{ color: T.ink3, fontSize: 11 }}>scale 0.86</Text>
            </ScalePress>
            <ScalePress onPress={() => bump('c')} hitSlop={16} style={[styles.boxSmall, { backgroundColor: T.primary }]}>
              <Text style={{ color: T.onPrimary, fontWeight: '700' }}>+{counter.c}</Text>
            </ScalePress>
          </View>
          <Text style={{ color: T.ink4, fontSize: 11 }}>Box pequeno tem hitSlop 16 — área de toque maior que visual.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, children, T }: { label: string; children: React.ReactNode; T: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: T.ink2, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal:20,
    paddingVertical:  12,
    borderBottomWidth:1,
    gap:              16,
  },
  title:       { flex: 1, fontSize: 16, fontWeight: '700' },
  tonePicker:  {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal:20,
    paddingVertical:  12,
    gap:              8,
  },
  toneChip:    {
    paddingHorizontal:12,
    paddingVertical:  6,
    borderRadius:     999,
    borderWidth:      1,
  },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  box:         {
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderRadius:      16,
    borderWidth:       1,
    minWidth:          110,
    alignItems:        'center',
    gap:               2,
  },
  boxSmall:    {
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      999,
    alignItems:        'center',
    justifyContent:    'center',
    minWidth:          44,
    minHeight:         44,
  },
});
