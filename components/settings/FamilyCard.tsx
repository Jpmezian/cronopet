import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/hooks/useTheme';

interface FamilyCardProps {
  petNome:  string;
  onManage: () => void;
}

/**
 * FamilyCard Bold v3.
 *
 * Estado estático nesta fase — query Supabase de membros vive no
 * /premium ViewSetup/Dashboard (legacy preserved). Aqui só anuncia
 * a feature + Button leva pra lá.
 *
 * R-fase-7-family: query de membros + estado "com família" entra na
 * Fase 9 quando ViewSetup migra. Por enquanto user vê o convite e
 * gerencia tudo pelo Premium.
 */
export const FamilyCard = React.memo(function FamilyCard({
  petNome, onManage,
}: FamilyCardProps) {
  const T = useTheme();

  return (
    <View>
      <SectionHeader title="Família" />
      <Card padding={20}>
        <View style={s.row}>
          <View style={[s.iconBox, { backgroundColor: T.mint }]}>
            <Users size={22} color={T.blk} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: T.ink }]}>Cuidado compartilhado</Text>
            <Text style={[s.sub, { color: T.ink2 }]}>
              Convide quem mais cuida do {petNome || 'pet'} pra ver e registrar
              junto.
            </Text>
          </View>
        </View>
        <Button
          label="Gerenciar família"
          onPress={onManage}
          variant="black"
          fullWidth
          style={{ marginTop: 14 }}
          accessibilityHint="Abre o fluxo de criação ou gerenciamento de grupo familiar"
        />
      </Card>
    </View>
  );
});

FamilyCard.displayName = 'FamilyCard';

const s = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:   { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  sub:     { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 2, lineHeight: 18 },
});
