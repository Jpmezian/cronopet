import React from 'react';
import { View, Text, TextInput, Image, StyleSheet } from 'react-native';
import {
  Camera, CheckCircle2, MinusCircle, XCircle, Waves, Droplet, Square, Droplets,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { ChipGroup, type ChipOption } from '@/components/ui/ChipGroup';
import { PoopIcon } from '@/components/icons/PoopIcon';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import type { ActionKey, Acceptance, Consistency, Appearance } from '@/types/pet';

// ─── Form shape (colapsa os campos num objeto só) ─────────────

export interface LogForm {
  quantity: string; volumeMl: string; duration: string;
  subXixi: boolean; subCoco: boolean;
  acceptance: Acceptance | null;
  consistency: Consistency | null;
  appearance: Appearance | null;
}

export const EMPTY_FORM: LogForm = {
  quantity: '', volumeMl: '', duration: '',
  subXixi: false, subCoco: false,
  acceptance: null, consistency: null, appearance: null,
};

/** Constrói o `extra` de addActionLog a partir do form + ação. */
export function buildExtra(key: ActionKey, f: LogForm): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (key === 'comida') {
    const q = parseInt(f.quantity, 10); if (q > 0) extra.quantity = q;
    if (f.acceptance) extra.acceptance = f.acceptance;
  } else if (key === 'agua') {
    const v = parseInt(f.volumeMl, 10); if (v > 0) extra.volumeMl = v;
    if (f.acceptance) extra.acceptance = f.acceptance;
  } else if (key === 'passeio') {
    const d = parseInt(f.duration, 10); if (d > 0) extra.duration = d;
    const subs: ActionKey[] = [];
    if (f.subXixi) subs.push('xixi');
    if (f.subCoco) subs.push('coco');
    if (subs.length) extra.subActions = subs;
  } else if (key === 'xixi') {
    if (f.appearance) extra.appearance = f.appearance;
  } else if (key === 'coco') {
    if (f.consistency) extra.consistency = f.consistency;
    if (f.appearance) extra.appearance = f.appearance;
  }
  return extra;
}

const ACCEPTANCE_OPTS: ChipOption<Acceptance>[] = [
  { value: 'full', Icon: CheckCircle2, label: 'Comeu tudo' },
  { value: 'partial', Icon: MinusCircle, label: 'Parcial' },
  { value: 'refused', Icon: XCircle, label: 'Recusou' },
];
const WATER_OPTS: ChipOption<Acceptance>[] = [
  { value: 'full', Icon: CheckCircle2, label: 'Bebeu bem' },
  { value: 'partial', Icon: MinusCircle, label: 'Pouca' },
  { value: 'refused', Icon: XCircle, label: 'Recusou' },
];
const CONSISTENCY_OPTS: ChipOption<Consistency>[] = [
  { value: 'normal', Icon: CheckCircle2, label: 'Normal' },
  { value: 'soft', Icon: Waves, label: 'Mole' },
  { value: 'liquid', Icon: Droplet, label: 'Líquida' },
  { value: 'hard', Icon: Square, label: 'Dura' },
];
const APPEARANCE_OPTS: ChipOption<Appearance>[] = [
  { value: 'normal', Icon: CheckCircle2, label: 'Normal' },
  { value: 'abnormal', Icon: MinusCircle, label: 'Alterada' },
];

// ─── Componentes de campo ─────────────────────────────────────

export function FieldLabel({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  const T = useTheme();
  return <Text style={[s.fieldLabel, { color: T.ink2, marginTop: mt ? 16 : 0 }]}>{children}</Text>;
}

export function PhotoField({ photo, onPick }: { photo: string | null; onPick: () => void }) {
  const T = useTheme();
  return (
    <ScalePress
      onPress={onPick} accessible accessibilityRole="button"
      accessibilityLabel={photo ? 'Alterar foto' : 'Adicionar foto opcional'}
      style={[s.photoBtn, { borderColor: T.rule }]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: 120, borderRadius: 12 }} resizeMode="cover" />
      ) : (
        <View style={s.photoPlaceholder}>
          <Camera size={20} color={T.ink3} strokeWidth={2.2} />
          <Text style={[s.photoLabel, { color: T.ink3 }]}>Adicionar foto (opcional)</Text>
        </View>
      )}
    </ScalePress>
  );
}

function AmountField({ label, unit, presets, value, onChange, accent, tint }: {
  label: string; unit: string; presets: number[]; value: string;
  onChange: (v: string) => void; accent: string; tint: string;
}) {
  const T = useTheme();
  const current = value ? parseInt(value, 10) : undefined;
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <View style={s.presetRow}>
        {presets.map((p) => {
          const sel = current === p;
          return (
            <ScalePress
              key={p}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(String(p)); }}
              accessible accessibilityRole="button" accessibilityLabel={`${p} ${unit}`}
              style={[s.preset, { backgroundColor: sel ? accent : tint }]}
            >
              <Text style={[s.presetText, { color: sel ? '#FFFFFF' : T.ink }]}>{p}{unit}</Text>
            </ScalePress>
          );
        })}
      </View>
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={`Ou digite em ${unit}`} placeholderTextColor={T.ink4}
        keyboardType="numeric" maxLength={5}
        style={[s.input, { backgroundColor: T.surfaceTint, color: T.ink }]}
      />
    </>
  );
}

function SubToggle({ active, onToggle, label, Icon, accent }: {
  active: boolean; onToggle: () => void; label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accent: { primary: string; tintL: string; tintD: string };
}) {
  const T = useTheme();
  return (
    <ScalePress
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}
      accessible accessibilityRole="switch" accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={[s.subToggle, {
        backgroundColor: active ? accent.tintL : T.surfaceTint,
        borderColor: active ? accent.tintD : T.rule,
      }]}
    >
      <Icon size={16} color={active ? accent.primary : T.ink3} strokeWidth={2.2} />
      <Text style={[s.subLabel, { color: active ? accent.primary : T.ink2 }]}>{label}</Text>
    </ScalePress>
  );
}

// ─── Campos por ação ──────────────────────────────────────────

interface ActionFieldsProps {
  actionKey: ActionKey;
  form: LogForm;
  patch: (p: Partial<LogForm>) => void;
}

export function ActionFields({ actionKey, form, patch }: ActionFieldsProps) {
  const a = ACTIONS_V3[actionKey];
  const chipColors = { accentColor: a.primary, accentBg: a.tintL, accentBorder: a.tintD };

  if (actionKey === 'comida') return (
    <>
      <AmountField label="Quantidade (g)" unit="g" presets={[50, 100, 150, 200]}
        value={form.quantity} onChange={(v) => patch({ quantity: v })} accent={a.primary} tint={a.tintL} />
      <FieldLabel>Como aceitou?</FieldLabel>
      <ChipGroup options={ACCEPTANCE_OPTS} selected={form.acceptance} onSelect={(v) => patch({ acceptance: v })} {...chipColors} />
    </>
  );
  if (actionKey === 'agua') return (
    <>
      <AmountField label="Quantidade (ml)" unit="ml" presets={[50, 100, 200, 300]}
        value={form.volumeMl} onChange={(v) => patch({ volumeMl: v })} accent={a.primary} tint={a.tintL} />
      <FieldLabel>Como bebeu?</FieldLabel>
      <ChipGroup options={WATER_OPTS} selected={form.acceptance} onSelect={(v) => patch({ acceptance: v })} {...chipColors} />
    </>
  );
  if (actionKey === 'passeio') return (
    <>
      <AmountField label="Duração (min)" unit="min" presets={[15, 30, 45, 60]}
        value={form.duration} onChange={(v) => patch({ duration: v })} accent={a.primary} tint={a.tintL} />
      <FieldLabel>Durante o passeio</FieldLabel>
      <View style={s.subRow}>
        <SubToggle active={form.subXixi} onToggle={() => patch({ subXixi: !form.subXixi })}
          Icon={Droplets} label="Fez xixi" accent={ACTIONS_V3.xixi} />
        <SubToggle active={form.subCoco} onToggle={() => patch({ subCoco: !form.subCoco })}
          Icon={PoopIcon} label="Fez cocô" accent={ACTIONS_V3.coco} />
      </View>
    </>
  );
  if (actionKey === 'xixi') return (
    <>
      <FieldLabel>Aparência</FieldLabel>
      <ChipGroup options={APPEARANCE_OPTS} selected={form.appearance} onSelect={(v) => patch({ appearance: v })} {...chipColors} />
    </>
  );
  if (actionKey === 'coco') return (
    <>
      <FieldLabel>Consistência</FieldLabel>
      <ChipGroup options={CONSISTENCY_OPTS} selected={form.consistency} onSelect={(v) => patch({ consistency: v })} {...chipColors} />
      <FieldLabel mt>Aparência</FieldLabel>
      <ChipGroup options={APPEARANCE_OPTS} selected={form.appearance} onSelect={(v) => patch({ appearance: v })} {...chipColors} />
    </>
  );
  return null;
}

const s = StyleSheet.create({
  fieldLabel:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  photoBtn:    { borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 2, borderStyle: 'dashed' },
  photoPlaceholder: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoLabel:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500' },
  presetRow:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  preset:      { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  presetText:  { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
  input:       { fontFamily: 'HankenGrotesk_500Medium', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  subRow:      { flexDirection: 'row', gap: 8 },
  subToggle:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 12, borderWidth: 1.5 },
  subLabel:    { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700' },
});
