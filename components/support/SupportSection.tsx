// ─── SupportSection — canal de contato (bug/sugestão/dúvida) ─
//
// Renderiza 3 botões de canal direto pra contato@cronopet.com.br
// via mailto: nativo (lib/support.ts). Usado em duas variantes:
//
//   - variant="full"    → settings.tsx, título + descrição + 3 botões
//   - variant="compact" → home (índice tabs), card discreto colapsado
//                         que abre bottom sheet com as 3 opções
//
// Por que dois variants e não um só com props: a Home é território
// caro (acima do scroll fold), card precisa caber em <100px de
// altura. Settings é tela de detalhe, pode respirar.

import React, { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bug, Lightbulb, MessageCircleQuestion, LifeBuoy, X } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToastStore } from '@/store/useToastStore';
import { openSupportEmail, SUPPORT_EMAIL, type SupportCategory } from '@/lib/support';

type Variant = 'full' | 'compact';

interface Props {
  variant?: Variant;
}

interface Option {
  category: SupportCategory;
  icon:     React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label:    string;
  hint:     string;
}

const OPTIONS: Option[] = [
  {
    category: 'bug',
    icon:     Bug,
    label:    'Reportar um bug',
    hint:     'Algo não funcionou como deveria',
  },
  {
    category: 'sugestao',
    icon:     Lightbulb,
    label:    'Sugerir melhoria',
    hint:     'Uma ideia pro app ficar melhor',
  },
  {
    category: 'duvida',
    icon:     MessageCircleQuestion,
    label:    'Tirar dúvida',
    hint:     'Não sei como uma função funciona',
  },
];

export function SupportSection({ variant = 'full' }: Props) {
  const { colors } = useThemeColors();
  const showToast = useToastStore((s) => s.showToast);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handlePress = useCallback(
    async (category: SupportCategory) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const opened = await openSupportEmail(category);
      if (!opened) {
        showToast(
          'warning',
          `Não consegui abrir o email. Escreva pra ${SUPPORT_EMAIL}`,
          5000,
        );
      }
      setSheetOpen(false);
    },
    [showToast],
  );

  // ─── Variant "compact": card discreto + bottom sheet ───────
  if (variant === 'compact') {
    return (
      <>
        <ScalePress
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetOpen(true);
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Suporte e feedback"
          accessibilityHint="Abre opções pra reportar bug, sugerir melhoria ou tirar dúvida"
          style={{
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: colors.bgInput,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LifeBuoy size={18} color={colors.textPrimary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
              Encontrou algo? Conta pra gente
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              Bug, sugestão ou dúvida — toque pra abrir
            </Text>
          </View>
        </ScalePress>

        <BottomSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSelect={handlePress}
          colors={colors}
        />
      </>
    );
  }

  // ─── Variant "full": bloco completo em Settings ────────────
  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Suporte e feedback
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
        Seu retorno ajuda a melhorar o app. Toque numa opção pra
        abrir seu app de email com tudo pré-preenchido.
      </Text>
      <View style={{ gap: 8 }}>
        {OPTIONS.map(({ category, icon: Icon, label, hint }) => (
          <ScalePress
            key={category}
            onPress={() => handlePress(category)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={`${hint}. Abre o app de email com o assunto pré-preenchido.`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: colors.bgInput,
              borderRadius: 14,
            }}
          >
            <View
              style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: colors.bgCard,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon size={18} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                {label}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                {hint}
              </Text>
            </View>
          </ScalePress>
        ))}
      </View>
      <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>
        Ou escreva direto pra {SUPPORT_EMAIL}
      </Text>
    </View>
  );
}

// ─── BottomSheet local (não vale extrair pra ui/ ainda) ──────
//
// É específico desse componente — quando precisar de bottom sheet
// em outro lugar, vale generalizar. Por enquanto inline mantém
// coupling baixo.

interface SheetProps {
  visible:  boolean;
  onClose:  () => void;
  onSelect: (category: SupportCategory) => void;
  colors:   ReturnType<typeof useThemeColors>['colors'];
}

function BottomSheet({ visible, onClose, onSelect, colors }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
            gap: 12,
          }}
        >
          {/* drag handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 36, height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              marginBottom: 8,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700' }}>
              Suporte e feedback
            </Text>
            <ScalePress
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
              accessible accessibilityRole="button" accessibilityLabel="Fechar"
              style={{ padding: 4 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </ScalePress>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Toque numa opção pra abrir seu app de email.
          </Text>

          <View style={{ gap: 8, marginTop: 4 }}>
            {OPTIONS.map(({ category, icon: Icon, label, hint }) => (
              <ScalePress
                key={category}
                onPress={() => onSelect(category)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={hint}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  backgroundColor: colors.bgInput,
                  borderRadius: 14,
                }}
              >
                <View
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: colors.bgCard,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={colors.textPrimary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                    {label}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {hint}
                  </Text>
                </View>
              </ScalePress>
            ))}
          </View>

          <Text style={{ color: colors.textTertiary, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            Ou escreva direto pra {SUPPORT_EMAIL}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
