import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useTheme } from '@/hooks/useTheme';

interface AccountCardProps {
  email:     string | null;
  nome?:     string;
  isPremium: boolean;
}

/**
 * AccountCard Bold v3 (briefing 11 § AccountCard).
 *
 * Card branco com avatar circular (inicial sobre T.surfaceTint) +
 * nome Bricolage 17 + email Hanken 13 + Pill "Pro" se isPremium.
 *
 * Sem CTA "Gerenciar" inline — edição de perfil tem fluxo próprio
 * (/edit-profile) acessível via outros pontos da nav. Settings é
 * só "mostrar" o estado da conta, não "editar".
 *
 * Estado sem session: retorna null. Caller decide se mostra placeholder
 * ou esconde — provavelmente esconde (settings sem login é raro).
 */
export const AccountCard = React.memo(function AccountCard({
  email, nome, isPremium,
}: AccountCardProps) {
  const T = useTheme();

  if (!email) return null;

  const displayName = nome || email.split('@')[0];
  const initial = (nome || email).charAt(0).toUpperCase();

  return (
    <Card padding={20}>
      <View style={s.row}>
        <View style={[s.avatar, { backgroundColor: T.surfaceTint }]}>
          <Text style={[s.initial, { color: T.ink }]}>{initial}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text
              style={[s.name, { color: T.ink }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {isPremium && <Pill label="Pro" tone="pro" />}
          </View>
          {nome && (
            <Text
              style={[s.email, { color: T.ink3 }]}
              numberOfLines={1}
              accessibilityLabel={`E-mail da conta: ${email}`}
            >
              {email}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
});

AccountCard.displayName = 'AccountCard';

const s = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initial:  { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 22, letterSpacing: -0.4 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:     { flex: 1, fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 17, letterSpacing: -0.3 },
  email:    { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 3 },
});
