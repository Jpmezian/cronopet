import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { Home, BarChart2, HeartPulse } from 'lucide-react-native';

function TabIcon({
  Icon,
  label,
  focused,
  color,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Icon
        size={22}
        color={focused ? '#2C2B27' : '#A09684'}
        strokeWidth={focused ? 2.5 : 2}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          marginTop: 3,
          color: focused ? '#2C2B27' : '#A09684',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 70,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Home} label="Início" focused={focused} color="#2C2B27" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BarChart2} label="Histórico" focused={focused} color="#2C2B27" />
          ),
        }}
      />
      <Tabs.Screen
        name="medical"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={HeartPulse} label="Saúde" focused={focused} color="#2C2B27" />
          ),
        }}
      />
    </Tabs>
  );
}
