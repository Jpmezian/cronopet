import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Stamp } from '@/components/ui/Stamp';
import { ACTION_LABEL } from '@/constants/actionIcons';
import type { ActionLog } from '@/types/pet';

interface TimelineTodayProps {
  /** Logs do pet ativo do dia atual (caller filtra por `tsToLocalYMD`). */
  logs: ActionLog[];
  /** Quantos mostrar antes de cortar com "Ver tudo". Default 10. */
  maxRows?: number;
  /** Tap em "Ver tudo" → caller navega pra History. */
  onSeeAll?: () => void;
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * TimelineToday Bold v3 (briefing 05 § 3.8).
 *
 * Lista vertical das ações do dia em ordem cronológica REVERSA (mais
 * recente em cima). Cada row mostra hora à esquerda + Stamp da ação +
 * label + nota opcional.
 *
 * Estado vazio: micro-card sutil incentivando primeiro registro.
 */
export function TimelineToday({ logs, maxRows = 10, onSeeAll }: TimelineTodayProps) {
  const T = useTheme();

  // Ordena cronológico reverso e limita
  const sorted = useMemo(() => [...logs].sort((a, b) => b.timestamp - a.timestamp), [logs]);
  const visible = sorted.slice(0, maxRows);
  const overflow = sorted.length - visible.length;

  if (sorted.length === 0) {
    return (
      <View
        style={{
          backgroundColor: T.card,
          borderRadius:    20,
          padding:         18,
          alignItems:      'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'HankenGrotesk_500Medium',
            color:      T.ink3,
            fontSize:   13,
            textAlign:  'center',
          }}
        >
          Nenhum registro hoje ainda. Toque num dos selos acima pra começar.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {visible.map((log, i) => (
        <View
          key={log.id ?? `${log.timestamp}-${i}`}
          style={{
            flexDirection: 'row',
            alignItems:    'flex-start',
            gap:           14,
            paddingBottom: i === visible.length - 1 ? 0 : 14,
            borderBottomWidth: i === visible.length - 1 ? 0 : 1,
            borderBottomColor: T.ruleSoft,
          }}
        >
          <Text
            style={{
              fontFamily: 'HankenGrotesk_800ExtraBold',
              color:      T.ink2,
              fontSize:   13,
              fontWeight: '800',
              width:      48,
              marginTop:  6,
            }}
          >
            {formatHour(log.timestamp)}
          </Text>

          <Stamp glyph={log.key} size="sm" tint="tintL" />

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontFamily: 'HankenGrotesk_700Bold',
                color:      T.ink,
                fontSize:   14,
                fontWeight: '700',
              }}
            >
              {ACTION_LABEL[log.key]}
            </Text>
            {!!log.note && (
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_500Medium',
                  color:      T.ink2,
                  fontSize:   13,
                  lineHeight: 17,
                }}
                numberOfLines={2}
              >
                {log.note}
              </Text>
            )}
          </View>
        </View>
      ))}

      {overflow > 0 && onSeeAll && (
        <Text
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={`Ver todos os ${sorted.length} registros de hoje`}
          style={{
            fontFamily: 'HankenGrotesk_700Bold',
            color:      T.primary,
            fontSize:   13,
            fontWeight: '700',
            textAlign:  'center',
            paddingVertical: 8,
          }}
        >
          Ver tudo ({sorted.length})
        </Text>
      )}
    </View>
  );
}
