import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { Bath, Scissors, Plus, Check, X, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToastStore } from '@/store/useToastStore';
import { usePetStore } from '@/store/usePetStore';
import { getBreedHealthProfile } from '@/data/breed-conditions';
import type { ActionKey, ActionLog } from '@/types/pet';

// ─── GroomingCard ──────────────────────────────────────────────
//
// R8 (TestFlight): banho saiu do dashboard diário porque não é meta
// diária (varia ~quinzenal). Aqui na tab Saúde faz mais sentido:
// counter "dias desde último" + botões pra registrar banho OU tosa.
// Tosa é nova ActionKey separada (frequência ainda menor que banho).
//
// Recomendação de frequência vem de breed-conditions.bathFrequencyDays
// (já existia, só não estava sendo apresentada ao tutor — era usada
// numa heurística que desativamos em R3-2 por causa de falsos
// positivos. Agora vira INFO neutra, sem alerta).

interface GroomingCardProps {
  actionHistory: ActionLog[];
}

interface RegistroModal {
  visible: boolean;
  type:    'banho' | 'tosa' | null;
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function GroomingCard({ actionHistory }: GroomingCardProps) {
  const { colors, actionTheme, isDark } = useThemeColors();
  const pet           = usePetStore((s) => s.pet);
  const addActionLog  = usePetStore((s) => s.addActionLog);
  const removeActionLog = usePetStore((s) => s.removeActionLog);
  const showToast     = useToastStore((s) => s.showToast);

  const [modal, setModal] = useState<RegistroModal>({ visible: false, type: null });
  const [note, setNote]   = useState('');
  const [saving, setSaving] = useState(false);

  // Recomendação de frequência (info-only, sem alerta) baseada na raça
  const breedRec = useMemo(() => {
    if (!pet.raca || pet.tipo !== 'cachorro') return null;
    const profile = getBreedHealthProfile(pet.raca, pet.tipo);
    return profile?.bathFrequencyDays ?? null;
  }, [pet.raca, pet.tipo]);

  // Últimos banhos/tosas (cronológicos)
  const { lastBanho, lastTosa, history } = useMemo(() => {
    const grooming = actionHistory
      .filter((l) => l.key === 'banho' || l.key === 'tosa')
      .sort((a, b) => b.timestamp - a.timestamp);
    return {
      lastBanho: grooming.find((l) => l.key === 'banho') ?? null,
      lastTosa:  grooming.find((l) => l.key === 'tosa')  ?? null,
      history:   grooming.slice(0, 10),
    };
  }, [actionHistory]);

  const openModal = useCallback((type: 'banho' | 'tosa') => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setNote('');
    setModal({ visible: true, type });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ visible: false, type: null });
    setNote('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!modal.type || saving) return;
    setSaving(true);
    try {
      await addActionLog(modal.type as ActionKey, undefined, note.trim() || undefined);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      showToast('success', modal.type === 'banho' ? 'Banho registrado!' : 'Tosa registrada!');
      closeModal();
    } finally {
      setSaving(false);
    }
  }, [modal.type, note, saving, addActionLog, showToast, closeModal]);

  const handleRemove = useCallback((id: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    removeActionLog(id);
    showToast('info', 'Registro removido');
  }, [removeActionLog, showToast]);

  const banhoTheme = actionTheme.banho;
  const tosaTheme  = actionTheme.tosa;

  return (
    <View style={{ gap: 14 }}>
      {/* 2 stats cards lado a lado */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard
          Icon={Bath}
          label="Último banho"
          ts={lastBanho?.timestamp ?? null}
          theme={banhoTheme}
          colors={colors}
          isDark={isDark}
        />
        <StatCard
          Icon={Scissors}
          label="Última tosa"
          ts={lastTosa?.timestamp ?? null}
          theme={tosaTheme}
          colors={colors}
          isDark={isDark}
        />
      </View>

      {/* Recomendação por raça — info-only */}
      {breedRec !== null && breedRec > 0 && (
        <View style={{
          backgroundColor: colors.bgInput,
          borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Bath size={14} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 }}>
            Pra essa raça, banho costuma ser a cada <Text style={{ fontWeight: '700', color: colors.textPrimary }}>~{breedRec} dias</Text>. Varia por clima, lifestyle e tipo de pelagem.
          </Text>
        </View>
      )}

      {/* Botões de ação */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <ScalePress
          onPress={() => openModal('banho')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Registrar banho agora"
          style={{
            flex: 1,
            backgroundColor: banhoTheme.primary,
            borderRadius: 14,
            paddingVertical: 13,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Bath size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={{
            color: '#FFFFFF', fontFamily: 'Nunito_700Bold',
            fontSize: 14, fontWeight: '700',
          }}>
            Registrar banho
          </Text>
        </ScalePress>
        <ScalePress
          onPress={() => openModal('tosa')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Registrar tosa agora"
          style={{
            flex: 1,
            backgroundColor: tosaTheme.primary,
            borderRadius: 14,
            paddingVertical: 13,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Scissors size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={{
            color: '#FFFFFF', fontFamily: 'Nunito_700Bold',
            fontSize: 14, fontWeight: '700',
          }}>
            Registrar tosa
          </Text>
        </ScalePress>
      </View>

      {/* Histórico cronológico */}
      {history.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{
            color: colors.textSecondary,
            fontSize: 12, fontWeight: '700',
            letterSpacing: 1, marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            Histórico
          </Text>
          <View style={{ gap: 8 }}>
            {history.map((log) => {
              const theme = log.key === 'banho' ? banhoTheme : tosaTheme;
              const Icon = log.key === 'banho' ? Bath : Scissors;
              return (
                <View
                  key={log.id}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderWidth: 1, borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: theme.bg,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={theme.primary} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: colors.textPrimary,
                      fontFamily: 'Nunito_700Bold',
                      fontSize: 14, fontWeight: '700',
                    }}>
                      {log.key === 'banho' ? 'Banho' : 'Tosa'}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 1 }}>
                      {fmtDate(log.timestamp)} · há {daysSince(log.timestamp)} {daysSince(log.timestamp) === 1 ? 'dia' : 'dias'}
                    </Text>
                    {!!log.note && (
                      <Text
                        numberOfLines={2}
                        style={{
                          color: colors.textSecondary, fontSize: 12,
                          marginTop: 4, fontStyle: 'italic',
                        }}
                      >
                        {log.note}
                      </Text>
                    )}
                  </View>
                  <ScalePress
                    onPress={() => handleRemove(log.id)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Remover registro de ${log.key === 'banho' ? 'banho' : 'tosa'}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={14} color={colors.textTertiary} strokeWidth={2} />
                  </ScalePress>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Modal de registro */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36,
            gap: 16,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: modal.type === 'banho' ? banhoTheme.bg : tosaTheme.bg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {modal.type === 'banho'
                    ? <Bath size={20} color={banhoTheme.primary} strokeWidth={2.4} />
                    : <Scissors size={20} color={tosaTheme.primary} strokeWidth={2.4} />
                  }
                </View>
                <Text style={{
                  color: colors.textPrimary,
                  fontFamily: 'Nunito_800ExtraBold',
                  fontSize: 18, fontWeight: '800',
                }}>
                  Registrar {modal.type === 'banho' ? 'banho' : 'tosa'}
                </Text>
              </View>
              <ScalePress
                onPress={closeModal}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <X size={20} color={colors.textTertiary} strokeWidth={2.2} />
              </ScalePress>
            </View>

            {/* Note input */}
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Observações <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>(opcional)</Text>
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={modal.type === 'banho'
                  ? 'Ex: usei shampoo hipoalergênico, sem problemas'
                  : 'Ex: tosa higiênica no pet shop X, R$ 80'
                }
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={300}
                accessibilityLabel="Observações do registro"
                style={{
                  backgroundColor: colors.bgInput,
                  borderRadius: 14,
                  paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
                  fontSize: 14,
                  color: colors.textPrimary,
                  minHeight: 80, textAlignVertical: 'top',
                }}
              />
            </View>

            {/* CTA */}
            <ScalePress
              onPress={handleSave}
              disabled={saving}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Salvar registro de ${modal.type === 'banho' ? 'banho' : 'tosa'}`}
              style={{
                backgroundColor: modal.type === 'banho' ? banhoTheme.primary : tosaTheme.primary,
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={{
                color: '#FFFFFF', fontFamily: 'Nunito_700Bold',
                fontSize: 15, fontWeight: '700',
              }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Text>
            </ScalePress>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── StatCard interno ──────────────────────────────────────────

function StatCard({
  Icon, label, ts, theme, colors, isDark,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  ts: number | null;
  theme: { primary: string; bg: string; border: string };
  colors: { textPrimary: string; textSecondary: string; textTertiary: string; bgCard: string; border: string };
  isDark: boolean;
}) {
  const days = ts !== null ? daysSince(ts) : null;
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.bgCard,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
      ...(Platform.OS === 'android' ? { elevation: 1 } : {
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.18 : 0.04, shadowRadius: 6,
      }),
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: theme.bg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={theme.primary} strokeWidth={2.2} />
        </View>
        <Text style={{
          color: colors.textSecondary,
          fontSize: 11, fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      </View>
      {ts === null ? (
        <Text style={{
          color: colors.textTertiary,
          fontSize: 14, fontWeight: '500',
          fontStyle: 'italic',
        }}>
          Nunca registrado
        </Text>
      ) : (
        <View>
          <Text style={{
            color: colors.textPrimary,
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 26, fontWeight: '800',
            lineHeight: 30,
          }}>
            {days === 0 ? 'Hoje' : `${days}`}
          </Text>
          {days !== 0 && (
            <Text style={{
              color: colors.textSecondary,
              fontSize: 12, fontWeight: '600',
            }}>
              {days === 1 ? 'dia atrás' : 'dias atrás'}
            </Text>
          )}
          <Text style={{
            color: colors.textTertiary,
            fontSize: 10, marginTop: 2,
          }}>
            {fmtDate(ts)}
          </Text>
        </View>
      )}
    </View>
  );
}
