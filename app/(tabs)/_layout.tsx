import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart2, HeartPulse } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

function TabIcon({
  Icon,
  label,
  focused,
  activeColor,
  inactiveColor,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const color = focused ? activeColor : inactiveColor;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 64 }}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: focused ? '700' : '600',
          marginTop: 4,
          color,
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();

  // Antes: height: 70, paddingBottom: 10 hardcoded, sem useSafeAreaInsets.
  // Bug TestFlight: iPhone X+ tem home-indicator de 34pt — a área safe
  // engolia parte dos ícones e cortava as labels. Agora altura cresce
  // com inset.bottom + padding extra de 6 garante respiro. iPhone SE
  // (insets.bottom=0) → 64pt; iPhone 15 → 64+34 = 98pt. Cara e label
  // sempre visíveis. Também troquei cor hardcoded #2C2B27 por
  // colors.tabActive (Verdigris) — agora segue tema.
  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={Home}
              label="Início"
              focused={focused}
              activeColor={colors.tabActive}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={BarChart2}
              label="Histórico"
              focused={focused}
              activeColor={colors.tabActive}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="medical"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              Icon={HeartPulse}
              label="Saúde"
              focused={focused}
              activeColor={colors.tabActive}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
    </Tabs>
  );
}
