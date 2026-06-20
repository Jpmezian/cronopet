import React from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { ScalePress } from '@/components/ui/ScalePress';
import { useTheme } from '@/hooks/useTheme';

interface ModalShellProps {
  visible:    boolean;
  onClose:    () => void;
  title:      string;
  /** Eyebrow opcional acima do título (Kicker-style já formatado). */
  kicker?:    string;
  /** Conteúdo do modal. Embrulha em ScrollView se `scrollable`. */
  children:   React.ReactNode;
  scrollable?: boolean;
  /** Modal full-screen (sheet vs bottom sheet). Default false = bottom
   *  sheet. true = ocupa quase toda a tela com header sticky. */
  fullScreen?: boolean;
  /** Envolve em KeyboardAvoidingView. Use quando o modal tem TextInput
   *  ou outros campos que precisam ficar visíveis sobre o teclado.
   *  iOS: behavior='padding'. Android: 'height'. */
  avoidKeyboard?: boolean;
}

/**
 * ModalShell Bold v3 (Fase 8 — briefing 12 § ModalShell).
 *
 * Wrapper visual unificado: backdrop dim + header (kicker opcional,
 * título Bricolage 26, close X preto) + conteúdo scrollable opcional
 * + respeito safe area.
 *
 * 2 layouts (prop `fullScreen`):
 *   • false (default): bottom sheet — radius top, slide up
 *   • true: full sheet — radius 28 todo, fade in
 *
 * 2 modais migrados nesta fase como prova: NotificationAskSheet +
 * BirthdayPickerField (R-fase-8-modalshell-scope).
 */
export function ModalShell({
  visible, onClose, title, kicker, children, scrollable, fullScreen, avoidKeyboard,
}: ModalShellProps) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const enter = reduced
    ? FadeIn.duration(180)
    : fullScreen
      ? FadeIn.duration(220)
      : SlideInDown.springify().damping(22).stiffness(260);
  const exit = reduced
    ? FadeOut.duration(160)
    : fullScreen
      ? FadeOut.duration(180)
      : SlideOutDown.duration(220);

  const Body = scrollable ? ScrollView : View;
  const bodyProps = scrollable
    ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' as const, contentContainerStyle: { paddingBottom: insets.bottom + 24 } }
    : { style: { paddingBottom: insets.bottom + 24 } };

  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = avoidKeyboard
    ? { behavior: (Platform.OS === 'ios' ? 'padding' : 'height') as 'padding' | 'height', style: { flex: 1 } }
    : { style: { flex: 1 } };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Wrapper {...wrapperProps}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Fechar"
        style={[s.backdrop, { backgroundColor: 'rgba(28,25,23,0.45)' }]}
      />
      <Animated.View
        entering={enter}
        exiting={exit}
        style={[
          fullScreen ? s.fullSheet : s.bottomSheet,
          {
            backgroundColor: T.card,
            shadowColor:     `rgb(${T.shadow})`,
            shadowOpacity:   T.isDark ? 0.4 : 0.22,
          },
          fullScreen && { paddingTop: insets.top + 12 },
        ]}
      >
        {!fullScreen && <View style={[s.handle, { backgroundColor: T.rule }]} />}

        <View style={s.header}>
          <View style={{ flex: 1 }}>
            {kicker && (
              <Text style={[s.kicker, { color: T.ink3 }]}>
                {kicker.toUpperCase()}
              </Text>
            )}
            <Text style={[s.title, { color: T.ink }]} accessibilityRole="header">
              {title}
            </Text>
          </View>
          <ScalePress
            onPress={onClose}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Fechar modal"
            hitSlop={8}
            style={[s.closeBtn, { backgroundColor: T.surfaceTint }]}
            scaleValue={0.92}
          >
            <X size={20} color={T.ink} strokeWidth={2.4} />
          </ScalePress>
        </View>

        <Body {...bodyProps}>
          {children}
        </Body>
      </Animated.View>
      </Wrapper>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { flex: 1 },
  bottomSheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    maxHeight:       '88%',
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop:      8,
    shadowOffset:    { width: 0, height: -8 },
    shadowRadius:    24,
    elevation:       Platform.OS === 'android' ? 12 : 0,
  },
  fullSheet: {
    flex:             1,
    margin:           0,
    paddingHorizontal: 20,
    paddingTop:       0,
  },
  handle:   { alignSelf: 'center', width: 36, height: 4, borderRadius: 2 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 18 },
  kicker:   { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title:    { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
