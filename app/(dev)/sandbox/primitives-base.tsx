import React from 'react';
import { Text, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sun, Moon } from 'lucide-react-native';

import { ScalePress } from '@/components/ui/ScalePress';
import { Stamp } from '@/components/ui/Stamp';
import { InkPanel } from '@/components/ui/InkPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Kicker } from '@/components/ui/Kicker';

import { useTheme } from '@/hooks/useTheme';
import { usePetStore } from '@/store/usePetStore';
import type { Tone } from '@/constants/colors';

// ─── Sandbox: primitivos base (0b) ────────────────────────────
//
// Mostra Stamp · InkPanel · Card · Button · Pill · Kicker em todos
// os estados visuais relevantes. Toggle dark/light + picker tom no
// header alteram o store real do app — efeito visível em todo o sandbox
// e (intencionalmente) em qualquer tela aberta depois.

const TONES: Tone[] = ['mint', 'pastel', 'terroso', 'solido'];

export default function PrimitivesBaseSandbox() {
  const router    = useRouter();
  const T         = useTheme();
  const themeMode = usePetStore((s) => s.themeMode);
  const setThemeMode = usePetStore((s) => s.setThemeMode);
  const tone      = usePetStore((s) => s.tone);
  const setTone   = usePetStore((s) => s.setTone);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header sticky com controles */}
      <View style={[styles.header, { borderBottomColor: T.ruleSoft }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={22} color={T.ink} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { color: T.ink }]} numberOfLines={1}>
          Primitivos base
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

      {/* Picker tom */}
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
        <Section title="Stamp" T={T}>
          <Kicker color={T.ink3}>Ações · tintL (default)</Kicker>
          <Row>
            <Stamp glyph="comida" />
            <Stamp glyph="agua" />
            <Stamp glyph="passeio" />
            <Stamp glyph="xixi" />
            <Stamp glyph="coco" />
            <Stamp glyph="banho" />
            <Stamp glyph="tosa" />
          </Row>

          <Kicker color={T.ink3}>Sizes · ação comida</Kicker>
          <Row>
            <Stamp glyph="comida" size="sm" />
            <Stamp glyph="comida" size="md" />
            <Stamp glyph="comida" size="lg" />
            <Stamp glyph="comida" size="xl" />
          </Row>

          <Kicker color={T.ink3}>Tints · ação passeio</Kicker>
          <Row>
            <Stamp glyph="passeio" tint="tintL" />
            <Stamp glyph="passeio" tint="tintD" />
            <Stamp glyph="passeio" tint="solid" />
            <Stamp glyph="passeio" tint="mint" />
            <Stamp glyph="passeio" tint="blk" />
            <Stamp glyph="passeio" tint="beige" />
          </Row>

          <Kicker color={T.ink3}>Modificadores</Kicker>
          <Row>
            <Stamp glyph="agua" bare />
            <Stamp glyph="agua" dim />
            <Stamp glyph="check" tint="solid" />
            <Stamp glyph="flame" tint="solid" />
            <Stamp glyph="sparkle" tint="mint" />
            <Stamp glyph="crown" tint="beige" />
            <Stamp glyph="heart" tint="blk" />
          </Row>
        </Section>

        <Section title="InkPanel" T={T}>
          <InkPanel>
            <Kicker color={T.onBlk}>Metas de hoje</Kicker>
            <Text style={{ color: T.onBlk, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
              2/3 · Dia em andamento
            </Text>
          </InkPanel>
        </Section>

        <Section title="Card" T={T}>
          <Card>
            <Kicker color={T.ink3}>Default — radius 26 · padding 20 · shadow on</Kicker>
            <Text style={{ color: T.ink, marginTop: 8 }}>
              Card padrão com sombra warm-tonalizada do briefing 03.
            </Text>
          </Card>
          <Card shadow={false}>
            <Text style={{ color: T.ink }}>Sem sombra (nested em outro card)</Text>
          </Card>
          <Card padding={12} radius={14}>
            <Text style={{ color: T.ink, fontSize: 13 }}>Padding/radius customizados</Text>
          </Card>
        </Section>

        <Section title="Button" T={T}>
          <Button variant="black"   label="Continuar"             onPress={() => undefined} fullWidth />
          <Button variant="primary" label="Desbloquear com o Pro" onPress={() => undefined} fullWidth />
          <Button variant="mint"    label="Registrar"             onPress={() => undefined} fullWidth />
          <Row>
            <Button variant="black"   label="Loading…" onPress={() => undefined} loading />
            <Button variant="primary" label="Disabled" onPress={() => undefined} disabled />
          </Row>
        </Section>

        <Section title="Pill" T={T}>
          <Row>
            <Pill label="Saudável"      tone="success" />
            <Pill label="Atenção"       tone="warning" />
            <Pill label="13 jun"        tone="info"    />
            <Pill label="Pro"           tone="pro"     />
            <Pill label="Pendente"      tone="neutral" />
          </Row>
          <Row>
            <Pill label="Online" tone="success" dot={T.primary} />
            <Pill label="Beta"   tone="neutral" dot={T.ink3}     />
          </Row>
        </Section>

        <Section title="Kicker" T={T}>
          <Kicker>Resumo semanal</Kicker>
          <Kicker color={T.primary}>De olho</Kicker>
          <Kicker color={T.ink}>Destaque</Kicker>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-componentes locais (mantém o arquivo ≤ 300 linhas) ───

function Section({ title, T, children }: { title: string; T: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.sectionTitle, { color: T.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
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
  sectionTitle:{ fontSize: 21, fontWeight: '800', letterSpacing: -0.6 },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
});

// ScalePress aqui só pra evitar tree-shake warning em buildtypes futuros.
const _useScalePress = ScalePress;
void _useScalePress;
