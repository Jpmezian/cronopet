import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart3, HeartPulse, Settings2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

/**
 * FloatingTabBar Bold v3 (Fase 8 — briefing 12 § FloatingTabBar).
 *
 * Pílula preta abs bottom (safe-area + 12). 4 tabs Home / Histórico /
 * Saúde / Ajustes (decisão CTO F8-Q1).
 *
 * Aba ativa: pill `T.mint` com label visível.
 * Inativas: só ícone, T.ink3 fade sobre T.blk.
 *
 * Custom tabBar via screenOptions.tabBar (callback recebe
 * BottomTabBarProps do React Navigation que Expo Router usa por baixo).
 */
type TabKey = 'index' | 'history' | 'medical' | 'settings';

const TABS: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: 'index',    label: 'Início',    Icon: Home },
  { key: 'history',  label: 'Histórico', Icon: BarChart3 },
  { key: 'medical',  label: 'Saúde',     Icon: HeartPulse },
  { key: 'settings', label: 'Ajustes',   Icon: Settings2 },
];

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const T = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (key: TabKey, routeKey: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(key);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        s.wrap,
        { bottom: insets.bottom + 12 },
      ]}
    >
      <View
        style={[
          s.bar,
          {
            backgroundColor: T.blk,
            shadowColor:     `rgb(${T.shadow})`,
            shadowOpacity:   T.isDark ? 0.42 : 0.28,
          },
        ]}
      >
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.key);
          if (!route) return null;
          const isFocused = state.routes[state.index]?.name === tab.key;
          return (
            <TabPill
              key={tab.key}
              tab={tab}
              isFocused={isFocused}
              tintActive={T.mint}
              tintInactive="rgba(246,244,234,0.55)"
              tintActiveText={T.blk}
              onPress={() => handlePress(tab.key, route.key, isFocused)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── TabPill ─────────────────────────────────────────────────

interface TabPillProps {
  tab:            { key: TabKey; label: string; Icon: typeof Home };
  isFocused:      boolean;
  tintActive:     string;
  tintInactive:   string;
  tintActiveText: string;
  onPress:        () => void;
}

function TabPill({ tab, isFocused, tintActive, tintInactive, tintActiveText, onPress }: TabPillProps) {
  return (
    <ScalePress
      onPress={onPress}
      accessible
      accessibilityRole="tab"
      accessibilityLabel={`Aba ${tab.label}`}
      accessibilityState={{ selected: isFocused }}
      style={[
        s.cell,
        isFocused && [s.cellActive, { backgroundColor: tintActive }],
      ]}
      scaleValue={0.95}
    >
      <tab.Icon
        size={20}
        color={isFocused ? tintActiveText : tintInactive}
        strokeWidth={isFocused ? 2.6 : 2.2}
      />
      {isFocused && (
        <Text style={[s.cellLabel, { color: tintActiveText }]} numberOfLines={1}>
          {tab.label}
        </Text>
      )}
    </ScalePress>
  );
}

const s = StyleSheet.create({
  wrap: {
    position:   'absolute',
    left:       16,
    right:      16,
    alignItems: 'center',
  },
  bar: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius:    999,
    minHeight:       58,
    width:           '100%',
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 34,
    elevation:    Platform.OS === 'android' ? 10 : 0,
  },
  cell: {
    flexShrink:        1,
    minWidth:          46,
    height:            46,
    borderRadius:      999,
    paddingHorizontal: 14,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
  },
  cellActive: { flexGrow: 1.6 },
  cellLabel:  {
    fontFamily:    'HankenGrotesk_700Bold',
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing: 0.1,
  },
});
