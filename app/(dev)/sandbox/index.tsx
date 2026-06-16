import React from 'react';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

// ─── Menu da nova hierarquia de sandbox (Bold v3) ─────────────
//
// Cada rota mostra um grupo de componentes em todos os estados
// possíveis (claro/escuro × 4 tons). Sandbox legacy
// `app/(dev)/sandbox.tsx` continua linkado embaixo até deprecação
// formal (provavelmente Fase 9).

interface Route {
  path:  string;
  title: string;
  desc:  string;
}

const ROUTES: Route[] = [
  {
    path:  '/sandbox/primitives-base',
    title: 'Primitivos base (0b)',
    desc:  'Stamp · InkPanel · Card · Button · Pill · Kicker',
  },
  // 0c adiciona: '/sandbox/primitives-comp' (Chip · ProgressRing · MiniBars · SectionHeader v2)
  // Fases 1+ adicionam: '/sandbox/screens-home', '/sandbox/screens-history', etc
];

export default function SandboxIndex() {
  const router = useRouter();
  const T = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={[styles.h1, { color: T.ink }]}>Sandbox</Text>
        <Text style={[styles.sub, { color: T.ink2 }]}>
          Catálogo de componentes do Bold v3. Cada rota mostra um grupo em
          claro/escuro × 4 tons.
        </Text>

        {ROUTES.map((r) => (
          <ScalePress
            key={r.path}
            onPress={() => router.push(r.path as never)}
            style={[styles.row, { backgroundColor: T.card, borderColor: T.ruleSoft }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${r.title}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: T.ink }]}>{r.title}</Text>
              <Text style={[styles.rowDesc, { color: T.ink3 }]} numberOfLines={2}>
                {r.desc}
              </Text>
            </View>
            <ChevronRight size={20} color={T.ink3} strokeWidth={2} />
          </ScalePress>
        ))}

        {/* Sandbox legacy (componentes antigos) */}
        <ScalePress
          onPress={() => router.push('/sandbox-legacy' as never)}
          style={[styles.row, styles.legacy, { borderColor: T.ruleSoft }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Abrir sandbox antigo (componentes pré Bold v3)"
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: T.ink2 }]}>Legacy (pré-Bold v3)</Text>
            <Text style={[styles.rowDesc, { color: T.ink4 }]}>
              Componentes existentes — refatorados por fase.
            </Text>
          </View>
          <ChevronRight size={20} color={T.ink4} strokeWidth={2} />
        </ScalePress>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1:        { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  sub:       { fontSize: 14, marginBottom: 8, lineHeight: 19 },
  row:       {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       16,
    borderRadius:  16,
    borderWidth:   1,
    gap:           12,
  },
  legacy:    { backgroundColor: 'transparent', marginTop: 16 },
  rowTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowDesc:   { fontSize: 13 },
});
