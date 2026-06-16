import React from 'react';
import { Text, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';

// ─── Sandbox: tipografia (0d) ─────────────────────────────────
//
// Escala canônica do briefing 03 § Escala tipográfica. Cada amostra
// tem etiqueta "Família / size / peso / tracking" pra QA visual.
//
// O propósito desta tela é validar:
//   • Fontes carregam (Bricolage_800/700, Hanken 400/500/600/700/800)
//   • Tracking negativo do display rende bem em iOS + Android
//   • Hanken corpo legível em 14.5 / 12 / 11

interface Sample {
  family:    string;
  size:      number;
  weight:    '400' | '500' | '600' | '700' | '800';
  tracking:  number;
  upper?:    boolean;
  text:      string;
  role:      string;
}

const DISPLAY: Sample[] = [
  { family: 'BricolageGrotesque_800ExtraBold', size: 42, weight: '800', tracking: -1.6, text: 'Mel',                    role: 'Hero (nome do pet)' },
  { family: 'BricolageGrotesque_800ExtraBold', size: 38, weight: '800', tracking: -1.4, text: 'Histórico',              role: 'H1 de tela' },
  { family: 'BricolageGrotesque_800ExtraBold', size: 26, weight: '800', tracking: -0.8, text: 'Nutrição',               role: 'Título de modal' },
  { family: 'BricolageGrotesque_800ExtraBold', size: 21, weight: '800', tracking: -0.6, text: 'Metas de hoje',          role: 'Título de seção' },
  { family: 'BricolageGrotesque_700Bold',      size: 21, weight: '700', tracking: -0.6, text: 'Vacinas',                role: 'Variante 700' },
];

const NUMBERS: Sample[] = [
  { family: 'BricolageGrotesque_800ExtraBold', size: 62, weight: '800', tracking: -2.5, text: '12',  role: 'Streak (Histórico)' },
  { family: 'BricolageGrotesque_800ExtraBold', size: 52, weight: '800', tracking: -2.0, text: '40',  role: 'Peso (Saúde)' },
  { family: 'BricolageGrotesque_800ExtraBold', size: 40, weight: '800', tracking: -1.4, text: '760', role: 'Kcal (Nutrição)' },
];

const BODY: Sample[] = [
  { family: 'HankenGrotesk_400Regular',  size: 14.5, weight: '400', tracking: 0, text: 'Corpo regular — parágrafo padrão do app.',          role: 'Body 400' },
  { family: 'HankenGrotesk_500Medium',   size: 14.5, weight: '500', tracking: 0, text: 'Corpo medium — feedback TestFlight #6 melhorou.',   role: 'Body 500' },
  { family: 'HankenGrotesk_600SemiBold', size: 14.5, weight: '600', tracking: 0, text: 'Corpo semi — labels e accent inline.',              role: 'Body 600' },
  { family: 'HankenGrotesk_700Bold',     size: 13,   weight: '700', tracking: 0, text: 'Caption — vet. Drauzio · 12/mar',                   role: 'Caption' },
  { family: 'HankenGrotesk_700Bold',     size: 11,   weight: '700', tracking: 0, text: 'Recorde 21 dias seguidos',                          role: 'Caption pequena' },
];

const KICKERS: Sample[] = [
  { family: 'HankenGrotesk_800ExtraBold', size: 12, weight: '800', tracking: 1, upper: true, text: 'De olho',          role: 'Eyebrow 12' },
  { family: 'HankenGrotesk_800ExtraBold', size: 11, weight: '800', tracking: 1, upper: true, text: 'Pro',              role: 'Pill 11' },
  { family: 'HankenGrotesk_800ExtraBold', size: 12, weight: '800', tracking: 1, upper: true, text: '13 de junho',      role: 'Eyebrow date' },
];

export default function TypographySandbox() {
  const router = useRouter();
  const T = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[styles.header, { borderBottomColor: T.ruleSoft }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={22} color={T.ink} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { color: T.ink }]} numberOfLines={1}>
          Tipografia
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }}>
        <Text style={{ color: T.ink3, fontSize: 12, marginBottom: 4 }}>
          Bricolage Grotesque (display) · Hanken Grotesk (corpo) · Nunito coexiste (legacy).
        </Text>

        <Group title="Display" T={T} samples={DISPLAY} />
        <Group title="Números"  T={T} samples={NUMBERS} />
        <Group title="Corpo"    T={T} samples={BODY} />
        <Group title="Kickers"  T={T} samples={KICKERS} />

        <Card padding={16}>
          <Text style={{ color: T.ink3, fontSize: 11, marginBottom: 4 }}>
            CONTRASTE — referência rápida (briefing 03 § Acessibilidade)
          </Text>
          <Text style={{ color: T.ink,  fontSize: 13, fontFamily: 'HankenGrotesk_700Bold' }}>T.ink sobre T.bg</Text>
          <Text style={{ color: T.ink2, fontSize: 13, fontFamily: 'HankenGrotesk_500Medium' }}>T.ink2 sobre T.bg</Text>
          <Text style={{ color: T.ink3, fontSize: 13, fontFamily: 'HankenGrotesk_500Medium' }}>T.ink3 sobre T.bg</Text>
          <Text style={{ color: T.ink4, fontSize: 13, fontFamily: 'HankenGrotesk_500Medium' }}>T.ink4 sobre T.bg (hint)</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, T, samples }: { title: string; T: ReturnType<typeof useTheme>; samples: Sample[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily:    'BricolageGrotesque_800ExtraBold',
          color:         T.ink,
          fontSize:      21,
          fontWeight:    '800',
          letterSpacing: -0.6,
          marginTop:     8,
        }}
      >
        {title}
      </Text>

      {samples.map((s, i) => (
        <Card key={i} padding={14}>
          <Text
            style={{
              fontFamily:    s.family,
              fontSize:      s.size,
              fontWeight:    s.weight,
              letterSpacing: s.tracking,
              color:         T.ink,
              textTransform: s.upper ? 'uppercase' : 'none',
              marginBottom:  6,
            }}
            numberOfLines={2}
          >
            {s.text}
          </Text>
          <Text style={{ color: T.ink3, fontSize: 11, fontFamily: 'HankenGrotesk_500Medium' }}>
            {s.role} · {s.family.replace(/Grotesque_|Grotesk_/, ' ')} · {s.size}/{s.weight}/{s.tracking}
          </Text>
        </Card>
      ))}
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
});
