import React, { type ComponentType } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface StatIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

interface StatItem {
  /** Ícone Lucide. Renderizado dentro de um chip de marca acima do número. */
  Icon: ComponentType<StatIconProps>;
  value: string;
  label: string;
  /** Cor de acento opcional pro ícone (default: verdigris da marca) */
  accent?: string;
}

interface QuickStatsProps {
  stats: StatItem[];
}

/**
 * Strip horizontal de 3 KPIs no topo da Home.
 *
 * Estética: cards do tamanho de cartão de vacinação, ícone Lucide num
 * chip suave da marca acima do número grande Nunito 800. Sem emoji.
 */
export function QuickStats({ stats }: QuickStatsProps) {
  const T = useTheme();

  return (
    <View style={{ flexDirection: 'row' }}>
      {stats.map((stat, i) => {
        const tint = stat.accent ?? T.primary;
        const Icon = stat.Icon;
        return (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ width: 8 }} />}
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${stat.label}: ${stat.value}`}
              style={{
                flex: 1,
                backgroundColor: T.card,
                borderRadius: 16,
                paddingVertical: 14, paddingHorizontal: 12,
                alignItems: 'center',
                ...(Platform.OS === 'android' ? { elevation: 2 } : {
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: T.isDark ? 0.22 : 0.05, shadowRadius: 6,
                }),
              }}
            >
              {/* Chip do ícone — calor visual sem cair em emoji */}
              <View style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: T.isDark
                  ? 'rgba(155, 228, 198, 0.18)'
                  : '#EAFAF1',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                <Icon size={18} strokeWidth={2.2} color={tint} />
              </View>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: T.ink,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 18, fontWeight: '800',
                  lineHeight: 22,
                }}
              >
                {stat.value}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: T.ink3,
                  fontSize: 10, fontWeight: '600',
                  marginTop: 1,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {stat.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
