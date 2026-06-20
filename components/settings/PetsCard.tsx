import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScalePress } from '@/components/ui/ScalePress';
import { Kicker } from '@/components/ui/Kicker';
import { Pill } from '@/components/ui/Pill';
import { PetPhoto } from '@/components/PetPhoto';
import { usePetStore } from '@/store/usePetStore';
import { useTheme } from '@/hooks/useTheme';

interface PetsCardProps {
  onAddPet: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  cachorro: 'Cachorro',
  gato:     'Gato',
  outro:    'Outro',
};

/**
 * PetsCard Bold v3 — gerenciamento DB-002.
 *
 * Card branco com lista de pets cadastrados. Pet ativo destacado com
 * border T.primary + Pill "Ativo". Tap em outro pet ativa (haptic).
 * Tap em trash → confirm Alert + remove (preserva fluxo legacy).
 *
 * Empty state implícito: usuário SEMPRE tem ≥1 pet (constraint do
 * onboarding). Botão "Adicionar outro pet" sempre visível.
 */
export const PetsCard = React.memo(function PetsCard({ onAddPet }: PetsCardProps) {
  const T = useTheme();

  const pets         = usePetStore((s) => s.pets);
  const activePetId  = usePetStore((s) => s.activePetId);
  const setActivePet = usePetStore((s) => s.setActivePet);
  const removePet    = usePetStore((s) => s.removePet);

  const petList = Object.values(pets);
  const total   = petList.length;

  const handleSelectPet = useCallback((id: string, isActive: boolean) => {
    if (isActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePet(id);
  }, [setActivePet]);

  const handleRemovePet = useCallback((id: string, nome: string) => {
    if (total === 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Não dá pra remover',
        'Você precisa de pelo menos 1 pet cadastrado. Adicione outro antes de remover este.',
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      `Remover ${nome}?`,
      'Os dados desse pet (histórico, vacinas, peso) ficam preservados localmente, mas o pet some da lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => removePet(id) },
      ],
    );
  }, [total, removePet]);

  return (
    <Card padding={20}>
      <Kicker>Meus pets</Kicker>
      <Text style={[s.desc, { color: T.ink2 }]}>
        {total === 1
          ? 'Você cuida de 1 pet. Adicione mais a qualquer momento.'
          : `Você cuida de ${total} pets. Toque pra trocar o ativo.`}
      </Text>

      <View style={s.list}>
        {petList.map((p) => {
          const isActive = p.id === activePetId;
          return (
            <View
              key={p.id}
              style={[
                s.row,
                {
                  backgroundColor: isActive ? T.surfaceTint : T.sunken,
                  borderColor:     isActive ? T.primary : 'transparent',
                },
              ]}
            >
              <ScalePress
                onPress={() => handleSelectPet(p.id!, isActive)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${p.nome}${isActive ? ', pet ativo' : ', tocar pra ativar'}`}
                style={s.petBtn}
                scaleValue={0.99}
              >
                <PetPhoto foto={p.foto} tipo={p.tipo} nome={p.nome} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.petTitleRow}>
                    <Text
                      style={[s.petName, { color: T.ink }]}
                      numberOfLines={1}
                    >
                      {p.nome}
                    </Text>
                    {isActive && <Pill label="Ativo" tone="success" />}
                  </View>
                  <Text style={[s.petMeta, { color: T.ink3 }]} numberOfLines={1}>
                    {TIPO_LABEL[p.tipo] ?? p.tipo}
                    {p.raca && p.raca !== 'Sem raça definida' ? ` · ${p.raca}` : ''}
                  </Text>
                </View>
              </ScalePress>

              <ScalePress
                onPress={() => handleRemovePet(p.id!, p.nome)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Remover ${p.nome}`}
                hitSlop={6}
                style={[s.trashBtn, { backgroundColor: T.surfaceTint }]}
              >
                <Trash2 size={16} color={T.ink3} strokeWidth={2.2} />
              </ScalePress>
            </View>
          );
        })}
      </View>

      <Button
        label="Adicionar outro pet"
        onPress={onAddPet}
        variant="black"
        fullWidth
        style={{ marginTop: 14 }}
        accessibilityHint="Abre o fluxo de cadastrar novo pet"
      />
    </Card>
  );
});

PetsCard.displayName = 'PetsCard';

const s = StyleSheet.create({
  desc:        { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: '500', marginTop: 8, lineHeight: 18 },
  list:        { gap: 10, marginTop: 14 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, borderWidth: 1.5 },
  petBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  petTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  petName:     { flex: 1, fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
  petMeta:     { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, fontWeight: '500', marginTop: 2 },
  trashBtn:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
