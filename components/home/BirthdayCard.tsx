import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gift } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScalePress } from '@/components/ui/ScalePress';

interface BirthdayCardProps {
  petNome:      string;
  nascimento:   string;  // YYYY-MM-DD
  onPress?:     () => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcula dias até o próximo aniversário do pet e retorna:
 * - null se nascimento inválido
 * - { daysUntil, isToday, turningAge } em qualquer outra situação
 *
 * Usa meses/dias (ignora ano) para calcular o próximo aniversário.
 */
function computeBirthday(nascimento: string): { daysUntil: number; isToday: boolean; turningAge: number } | null {
  const [y, m, d] = nascimento.split('-').map(Number);
  if (!y || !m || !d) return null;

  const now = new Date();
  const todayY = now.getFullYear();

  // Próximo aniversário (ano atual ou ano que vem)
  let next = new Date(todayY, m - 1, d);
  const today = new Date(todayY, now.getMonth(), now.getDate());
  if (next.getTime() < today.getTime()) {
    next = new Date(todayY + 1, m - 1, d);
  }

  const daysUntil = Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
  const isToday = daysUntil === 0;
  const turningAge = next.getFullYear() - y;

  return { daysUntil, isToday, turningAge };
}

/**
 * Card que aparece SÓ quando o aniversário do pet está a ≤ 30 dias.
 * Retorna null fora dessa janela (não renderiza nada).
 */
export function BirthdayCard({ petNome, nascimento, onPress }: BirthdayCardProps) {
  const { colors, actionTheme, isDark } = useThemeColors();

  const bday = useMemo(() => computeBirthday(nascimento), [nascimento]);

  if (!bday || bday.daysUntil > 30) return null;

  const emoji = bday.isToday ? '🎂' : bday.daysUntil <= 7 ? '🎁' : '🎈';
  const title = bday.isToday
    ? `Hoje é aniversário do ${petNome}!`
    : bday.daysUntil === 1
    ? `Amanhã é aniversário do ${petNome}!`
    : `Faltam ${bday.daysUntil} dias para o aniversário do ${petNome}`;

  const subtitle = bday.isToday
    ? `Está fazendo ${bday.turningAge} ${bday.turningAge === 1 ? 'ano' : 'anos'} 🎉 Celebre!`
    : `Vai fazer ${bday.turningAge} ${bday.turningAge === 1 ? 'ano' : 'anos'}`;

  return (
    <ScalePress
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${title}. ${subtitle}`}
      disabled={!onPress}
      scaleValue={0.98}
      style={{
        backgroundColor: actionTheme.xixi.bg,
        borderWidth: 1.5,
        borderColor: bday.isToday ? actionTheme.xixi.primary : actionTheme.xixi.border,
        borderRadius: 18,
        paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        ...(Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 6,
        }),
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.55)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={{
            color: actionTheme.xixi.primary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 13, fontWeight: '800',
            lineHeight: 17,
          }}
        >
          {title}
        </Text>
        <Text style={{
          color: actionTheme.xixi.primary,
          fontSize: 12,
          marginTop: 2,
        }}>
          {subtitle}
        </Text>
      </View>
      {bday.isToday && (
        <Gift size={20} color={actionTheme.xixi.primary} strokeWidth={2.2} />
      )}
    </ScalePress>
  );
}
