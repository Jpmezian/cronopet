import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, Settings } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';

interface TopBarProps {
  /** Nome do pet ativo. Saudação usa "Oi, {nome}" — convenção do
   *  codebase atual (não tem perfil de tutor isolado com nome próprio). */
  petName: string;
  /** Total de insights pendentes pra colorir o badge do sino.
   *  > 0 → badge T.primary visível. */
  alertCount?: number;
  /** Tap no nome do pet abre o switcher (legacy behavior). */
  onPressPet?: () => void;
}

// ─── Helpers de data ──────────────────────────────────────────
const MONTH_PTBR = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
] as const;

function formatToday(): string {
  const d = new Date();
  return `${d.getDate()} DE ${MONTH_PTBR[d.getMonth()]}`;
}

/**
 * TopBar Bold v3 (briefing 05 § 3.2).
 *
 * Layout:
 *   [data verdigris kicker]               [🔔 badge]  [⚙ 44px]
 *   Oi, {petName} ▾  ← Bricolage 26 800 -0.8, tap abre pet switcher
 *
 * Decisões:
 *   • "Avatar" do tutor foi substituído por botão Settings (44px) —
 *     codebase atual não tem foto/nome do tutor; quando avatar real
 *     entrar (Fase 7 Settings rework), vira foto circular.
 *   • Sino com badge usa `alertCount > 0` pra mostrar bolinha. Tap
 *     sem rota dedicada por enquanto (TODO P3 — central de alertas).
 *   • Pet switcher mantém ChevronDown + scaleValue 0.97 do legacy.
 */
export function TopBar({ petName, alertCount = 0, onPressPet }: TopBarProps) {
  const T = useTheme();
  const router = useRouter();
  const hasAlert = alertCount > 0;

  // Settings agora é tab (Fase 8). Usa router.navigate pra fazer SWAP
  // entre tabs em vez de PUSH na stack — evita acumular pilha quando
  // user toca o gear/bell repetidamente.
  const onSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate('/settings');
  };

  const onBell = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Sem rota dedicada — abre Settings (área de notificações)
    router.navigate('/settings');
  };

  const onPet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressPet?.();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Kicker color={T.primary}>{formatToday()}</Kicker>
        <ScalePress
          onPress={onPet}
          disabled={!onPressPet}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Pet atual: ${petName}. Toque para trocar de pet.`}
          scaleValue={0.97}
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4 }}
        >
          <Text
            style={{
              fontFamily: 'BricolageGrotesque_800ExtraBold',
              color: T.ink,
              fontSize: 26,
              fontWeight: '800',
              letterSpacing: -0.8,
            }}
            numberOfLines={1}
          >
            Oi, {petName}
          </Text>
          {onPressPet && (
            <ChevronDown size={20} strokeWidth={2.5} color={T.ink3} style={{ marginLeft: 4 }} />
          )}
        </ScalePress>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onBell}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={hasAlert ? `Sino com ${alertCount} alerta${alertCount === 1 ? '' : 's'}` : 'Sino'}
          style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: T.card,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Bell size={20} color={T.ink} strokeWidth={2} />
          {hasAlert && (
            <View
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: T.primary,
                borderWidth: 2, borderColor: T.card,
              }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>

        <Pressable
          onPress={onSettings}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: T.card,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Settings size={20} color={T.ink} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
