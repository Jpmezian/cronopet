import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface StatItem {
  emoji: string;
  value: string;
  label: string;
}

interface QuickStatsProps {
  stats: StatItem[];
}

export function QuickStats({ stats }: QuickStatsProps) {
  const { colors, isDark } = useThemeColors();

  return (
    <View style={{ flexDirection: 'row' }}>
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={{ width: 8 }} />}
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${stat.label}: ${stat.value}`}
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              paddingVertical: 14, paddingHorizontal: 12,
              alignItems: 'center',
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.22 : 0.05, shadowRadius: 6,
              }),
            }}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{stat.emoji}</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: colors.textPrimary,
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
                color: colors.textTertiary,
                fontSize: 10, fontWeight: '600',
                marginTop: 1,
              }}
            >
              {stat.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}
