import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LogOut, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';
import { ACTIONS_V3 } from '@/constants/colors';
import { useTheme, type Theme } from '@/hooks/useTheme';

interface DangerZoneProps {
  onSignOut:       () => void;
  onDeleteAccount: () => void;
}

/**
 * DangerZone Bold v3.
 *
 * 2 ações destrutivas com confirm Alert preservado nas callbacks:
 *   • Sair: LogOut Lucide neutro + texto T.ink2 — não é alarmante
 *   • Excluir conta: Trash2 + cor laranja queimado (ACTIONS_V3.comida
 *     .primary), NÃO red sensacionalista. Subline descritiva curta.
 *
 * R-L1 compliance: confirms vivem no caller (handleSignOut /
 * handleDeleteAccount em app/settings.tsx) — preservado com cópia LGPD
 * completa.
 */
export const DangerZone = React.memo(function DangerZone({
  onSignOut, onDeleteAccount,
}: DangerZoneProps) {
  const T = useTheme();

  return (
    <Card padding={0}>
      <View style={s.headerWrap}>
        <Kicker>Conta</Kicker>
      </View>

      <Row
        T={T}
        Icon={LogOut}
        iconColor={T.ink2}
        label="Sair da conta"
        labelColor={T.ink}
        desc="Desconecta sua sessão. Dados ficam guardados na nuvem."
        onPress={onSignOut}
      />

      <View style={[s.divider, { backgroundColor: T.rule }]} />

      <Row
        T={T}
        Icon={Trash2}
        iconColor={ACTIONS_V3.comida.primary}
        label="Excluir minha conta"
        labelColor={ACTIONS_V3.comida.primary}
        desc="Apaga perfil, histórico, fotos e dados em nuvem permanentemente."
        onPress={onDeleteAccount}
      />
    </Card>
  );
});

DangerZone.displayName = 'DangerZone';

// ─── Row ─────────────────────────────────────────────────────

interface RowProps {
  T:          Theme;
  Icon:       typeof LogOut;
  iconColor:  string;
  label:      string;
  labelColor: string;
  desc:       string;
  onPress:    () => void;
}

function Row({ T, Icon, iconColor, label, labelColor, desc, onPress }: RowProps) {
  return (
    <ScalePress
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={desc}
      style={s.row}
    >
      <Icon size={18} color={iconColor} strokeWidth={2.2} />
      <View style={{ flex: 1 }}>
        <Text style={[s.label, { color: labelColor }]}>{label}</Text>
        <Text style={[s.desc, { color: T.ink3 }]}>{desc}</Text>
      </View>
    </ScalePress>
  );
}

const s = StyleSheet.create({
  headerWrap: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  label:      { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, fontWeight: '700' },
  desc:       { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 17 },
  divider:    { height: 1, marginHorizontal: 20 },
});
