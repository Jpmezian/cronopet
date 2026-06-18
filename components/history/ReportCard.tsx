import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useToastStore } from '@/store/useToastStore';
import { usePetStore } from '@/store/usePetStore';
import { generateVetReport } from '@/services/PdfReportService';

/**
 * ReportCard Bold v3 (briefing 07 § ReportCard).
 *
 * Card branco com chip mint + título + subtítulo + Button preto "Gerar PDF".
 * Reaproveita `generateVetReport` (já em uso na tab Saúde).
 *
 * Estado de loading muda o label do Button enquanto o PDF é renderizado +
 * partilhado. Falha mostra Toast (sem Alert nativo — pattern Fase 1+).
 */
export const ReportCard = React.memo(function ReportCard() {
  const T = useTheme();
  const showToast = useToastStore((s) => s.showToast);

  const pet           = usePetStore((s) => s.pet);
  const actionHistory = usePetStore((s) => s.actionHistory);
  const medicalEvents = usePetStore((s) => s.medicalEvents);
  const vaccines      = usePetStore((s) => s.vaccines);
  const appointments  = usePetStore((s) => s.appointments);
  const weightHistory = usePetStore((s) => s.weightHistory);

  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await generateVetReport(pet, actionHistory, medicalEvents, vaccines, appointments, weightHistory);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('error', 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  }, [pet, actionHistory, medicalEvents, vaccines, appointments, weightHistory, showToast]);

  return (
    <Card padding={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Chip mint com ícone */}
        <View
          style={{
            width:           48,
            height:          48,
            borderRadius:    16,
            backgroundColor: T.mint,
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <FileText size={24} color={T.blk} strokeWidth={2.2} />
        </View>

        {/* Texto */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily:    'BricolageGrotesque_800ExtraBold',
              fontWeight:    '800',
              fontSize:      16,
              color:         T.ink,
              letterSpacing: -0.3,
            }}
            accessibilityRole="header"
          >
            Relatório pro vet
          </Text>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_500Medium',
              fontSize:   13,
              fontWeight: '500',
              color:      T.ink2,
              marginTop:  1,
            }}
          >
            PDF dos últimos 30 dias
          </Text>
        </View>
      </View>

      <Button
        label={loading ? 'Gerando…' : 'Gerar PDF'}
        onPress={handlePress}
        variant="black"
        fullWidth
        loading={loading}
        accessibilityHint="Gera relatório em PDF e abre opções de compartilhamento"
        style={{ marginTop: 14 }}
      />
    </Card>
  );
});

ReportCard.displayName = 'ReportCard';
