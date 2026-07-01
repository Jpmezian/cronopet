import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { FloatingTabBar } from '@/components/chrome/FloatingTabBar';
import { FAB } from '@/components/chrome/FAB';
import { QuickLogSheet } from '@/components/chrome/QuickLogSheet';
import { LogDetailSheet } from '@/components/home/LogDetailSheet';
import { useLogDetailStore } from '@/store/useLogDetailStore';

/**
 * Tabs layout Bold v3 (Fase 8 — briefing 12).
 *
 * 4 abas (decisão CTO F8-Q1): Home / Histórico / Saúde / Ajustes.
 * Premium continua via push (paywall não fica em chrome persistente).
 *
 * TabBar pílula flutuante via custom `tabBar` prop. Tab bar nativa
 * fica oculta — `tabBarStyle: display:'none'` é equivalente, mas
 * passar componente custom é o caminho documentado do Expo Router.
 *
 * FAB conditional (decisão F8-Q2): SOMENTE em history + medical.
 * Home tem RegisterStrip; settings é configuração (registro não
 * faz sentido lá).
 */
export default function TabsLayout() {
  const segments = useSegments();
  const [sheetOpen, setSheetOpen] = useState(false);
  const openLogDetail = useLogDetailStore((s) => s.open);

  // Long-press no QuickLogSheet → fecha ele + abre o sheet de detalhes
  // (mesmo gesto do RegisterStrip). Consistência entre os 2 pontos
  // de registro rápido.
  const handleSpecify = (key: Parameters<typeof openLogDetail>[0]) => {
    setSheetOpen(false);
    openLogDetail(key);
  };

  // Última segmento dentro de (tabs): index | history | medical | settings
  // segments retorna ["(tabs)"] no Home (index), ["(tabs)","history"], etc.
  const currentTab = segments[1] ?? 'index';
  const showFab = currentTab === 'history' || currentTab === 'medical';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen name="index"    options={{ title: 'Início'    }} />
        <Tabs.Screen name="history"  options={{ title: 'Histórico' }} />
        <Tabs.Screen name="medical"  options={{ title: 'Saúde'     }} />
        <Tabs.Screen name="settings" options={{ title: 'Ajustes'   }} />
      </Tabs>

      {showFab && (
        <FAB
          onPress={() => setSheetOpen(true)}
          accessibilityLabel="Registrar ação rápida"
        />
      )}

      <QuickLogSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSpecify={handleSpecify}
      />

      {/* Sheet de registro detalhado (quantidade/detalhes) — chrome
          global, aberto por long-press no RegisterStrip ou QuickLogSheet
          via useLogDetailStore. */}
      <LogDetailSheet />
    </View>
  );
}
