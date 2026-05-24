import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, Platform,
  Image, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Trash2, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolvePhotoUri } from '@/lib/photoPath';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { usePetStore } from '@/store/usePetStore';
import { useToastStore } from '@/store/useToastStore';
import type { ActionKey, Acceptance, Consistency, Appearance } from '@/types/pet';

// ─── Metadados das ações ──────────────────────────────────────

// Só labels — o ícone vem do <ActionIcon> que centraliza PoopIcon vs emojis.
// Antes este arquivo tinha emoji: '💩' direto, ficou inconsistente quando
// migramos o ícone do cocô pra SVG (R3-6).
const ACTION_LABEL: Record<ActionKey, string> = {
  comida:  'Comida',
  agua:    'Água',
  passeio: 'Passeio',
  xixi:    'Xixi',
  coco:    'Cocô',
  banho:   'Banho',
  tosa:    'Tosa',
};

function acceptanceLabel(acceptance: Acceptance): string {
  switch (acceptance) {
    case 'full':    return '😋 Comeu tudo';
    case 'partial': return '🥄 Parcial';
    case 'refused': return '🙅 Recusou';
  }
}

function consistencyLabel(consistency: Consistency): string {
  switch (consistency) {
    case 'normal': return '✅ Normal';
    case 'soft':   return '〰️ Mole';
    case 'liquid': return '💧 Líquida';
    case 'hard':   return '⬛ Dura';
  }
}

function appearanceLabel(appearance: Appearance): string {
  return appearance === 'normal' ? '✅ Normal' : '⚠️ Alterada';
}

function formatFullDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

function tsToTimeString(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function applyTimeString(ts: number, timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  const d = new Date(ts);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// ─── Tela ─────────────────────────────────────────────────────

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, actionTheme } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);

  const actionHistory    = usePetStore((s) => s.actionHistory);
  const updateActionLog  = usePetStore((s) => s.updateActionLog);
  const removeActionLog  = usePetStore((s) => s.removeActionLog);

  const log = useMemo(
    () => actionHistory.find((l) => l.id === id),
    [actionHistory, id],
  );

  const meta  = log ? ACTION_LABEL[log.key]  : null;
  const theme = log ? actionTheme[log.key]  : null;

  const [note, setNote]               = useState(log?.note ?? '');
  const [timeStr, setTimeStr]         = useState(log ? tsToTimeString(log.timestamp) : '');
  const [editQuantity, setEditQuantity] = useState(log?.quantity?.toString() ?? '');
  const [editDuration, setEditDuration] = useState(log?.duration?.toString() ?? '');
  const [dirty, setDirty]             = useState(false);

  if (!log || !meta || !theme) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Registro não encontrado.</Text>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    const newTimestamp = applyTimeString(log.timestamp, timeStr);
    if (newTimestamp === null) {
      showToast('error', 'Horário inválido. Use o formato HH:MM.');
      return;
    }

    const updates: Record<string, any> = {
      note:      note.trim() || undefined,
      timestamp: newTimestamp,
    };

    if (log.key === 'comida') {
      const q = parseInt(editQuantity, 10);
      updates.quantity = q > 0 ? q : undefined;
    }
    if (log.key === 'passeio') {
      const d = parseInt(editDuration, 10);
      updates.duration = d > 0 ? d : undefined;
    }

    updateActionLog(log.id, updates);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('success', 'Registro atualizado!');
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir registro',
      `Deseja excluir este registro de ${meta.toLowerCase()}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeActionLog(log.id);
            showToast('info', 'Registro excluído.');
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <ScalePress
            onPress={() => router.back()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft size={22} strokeWidth={2} color={colors.textPrimary} />
          </ScalePress>

          <Text style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'Nunito_700Bold',
            fontSize: 17,
            color: colors.textPrimary,
          }}>
            Detalhe do Registro
          </Text>

          <ScalePress
            onPress={handleDelete}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Excluir este registro"
          >
            <Trash2 size={20} strokeWidth={2} color="#dc2626" />
          </ScalePress>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Card de identidade da ação ── */}
          <View style={{
            backgroundColor: theme.bg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: colors.bgCard,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ActionIcon action={log.key} size={30} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 17,
                color: theme.primary,
              }}>
                {meta}
              </Text>
              <Text style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
                textTransform: 'capitalize',
              }}>
                {formatFullDateTime(log.timestamp)}
              </Text>
            </View>
          </View>

          {/* ── Foto (se houver) ── */}
          {log.photo && (
            <View style={{
              borderRadius: 16, overflow: 'hidden',
              ...(Platform.OS === 'android' ? { elevation: 2 } : {
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8,
              }),
            }}>
              <Image
                source={{ uri: resolvePhotoUri(log.photo) }}
                style={{ width: '100%', height: 220 }}
                resizeMode="cover"
                accessible={true}
                accessibilityRole="image"
                accessibilityLabel={`Foto do registro de ${meta}`}
              />
            </View>
          )}

          {/* ── Editar horário ── */}
          <View style={{ gap: 8 }}>
            <Text style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: 14,
              color: colors.textSecondary,
            }}>
              Horário
            </Text>
            <TextInput
              value={timeStr}
              onChangeText={(v) => { setTimeStr(v); setDirty(true); }}
              placeholder="HH:MM"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: colors.textPrimary,
                fontWeight: '600',
              }}
              accessible={true}
              accessibilityLabel="Horário do registro"
              accessibilityHint="Digite o horário no formato horas e minutos"
            />
          </View>

          {/* ── Quantidade (somente comida) ── */}
          {log.key === 'comida' && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Quantidade (gramas)
              </Text>
              <TextInput
                value={editQuantity}
                onChangeText={(v) => { setEditQuantity(v); setDirty(true); }}
                placeholder="Ex: 150"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: colors.textPrimary,
                  fontWeight: '600',
                }}
                accessible={true}
                accessibilityLabel="Quantidade em gramas"
                accessibilityHint="Digite a quantidade de comida em gramas"
              />
            </View>
          )}

          {/* ── Duração (somente passeio) ── */}
          {log.key === 'passeio' && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Duração (minutos)
              </Text>
              <TextInput
                value={editDuration}
                onChangeText={(v) => { setEditDuration(v); setDirty(true); }}
                placeholder="Ex: 30"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.bgCard,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: colors.textPrimary,
                  fontWeight: '600',
                }}
                accessible={true}
                accessibilityLabel="Duração em minutos"
                accessibilityHint="Digite a duração do passeio em minutos"
              />
            </View>
          )}

          {/* ── Volume em ml (read-only, somente água) ── */}
          {log.key === 'agua' && log.volumeMl != null && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Volume
              </Text>
              <View style={{
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}>
                <Text style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  fontWeight: '600',
                }}>
                  💧 {log.volumeMl} ml
                </Text>
              </View>
            </View>
          )}

          {/* ── Aceitação (read-only) ── */}
          {log.acceptance && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Aceitação
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{
                  backgroundColor: actionTheme.comida.bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: actionTheme.comida.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: actionTheme.comida.primary,
                  }}>
                    {acceptanceLabel(log.acceptance)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Consistência (read-only, somente cocô) ── */}
          {log.key === 'coco' && log.consistency && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Consistência
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{
                  backgroundColor: actionTheme.coco.bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: actionTheme.coco.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: actionTheme.coco.primary,
                  }}>
                    {consistencyLabel(log.consistency)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Aparência (read-only) ── */}
          {log.appearance && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Aparência
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{
                  backgroundColor: log.appearance === 'normal' ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: log.appearance === 'normal' ? '#bbf7d0' : '#fecaca',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: log.appearance === 'normal' ? '#059669' : '#dc2626',
                  }}>
                    {appearanceLabel(log.appearance)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Sub-ações (read-only chips) ── */}
          {log.subActions && log.subActions.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Sub-ações
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {log.subActions.map((s) => {
                  const subLabel = ACTION_LABEL[s as ActionKey];
                  const subTheme = actionTheme[s as ActionKey];
                  return (
                    <View
                      key={s}
                      style={{
                        backgroundColor: subTheme?.bg ?? colors.bgInput,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: subTheme?.border ?? colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ActionIcon
                        action={s as ActionKey}
                        size={14}
                        color={subTheme?.primary ?? colors.textSecondary}
                      />
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: subTheme?.primary ?? colors.textSecondary,
                      }}>
                        {subLabel ?? s}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Nota ── */}
          <View style={{ gap: 8 }}>
            <Text style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: 14,
              color: colors.textSecondary,
            }}>
              Nota
            </Text>
            <TextInput
              value={note}
              onChangeText={(v) => { setNote(v); setDirty(true); }}
              placeholder="Ex: comeu tudo, bebeu pouco..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: colors.textPrimary,
                minHeight: 80,
              }}
              accessible={true}
              accessibilityLabel="Nota sobre o registro"
              accessibilityHint="Adicione observações opcionais sobre esta ação"
            />
          </View>

          {/* ── Botão Salvar ── */}
          <ScalePress
            onPress={handleSave}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Salvar alterações"
            style={{
              backgroundColor: theme.primary,
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <Check size={18} strokeWidth={2.5} color="#ffffff" />
            <Text style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: 16,
              color: '#ffffff',
            }}>
              Salvar
            </Text>
          </ScalePress>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
