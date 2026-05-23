import React from 'react';
import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { PawPrint } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

// R7-B: reescrito em StyleSheet inline pra remover NativeWind +
// react-native-css-interop (~280kb que iam pro bundle só pra essa
// tela). Layout idêntico, performance melhor, paleta do tema.

export default function NotFoundScreen() {
  const { colors, brand } = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgScreen,
          padding: 20,
          gap: 12,
        }}
      >
        <PawPrint size={56} color={brand.primary} strokeWidth={1.8} />
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: 'Nunito_700Bold',
            fontSize: 20,
            fontWeight: '700',
          }}
        >
          Página não encontrada
        </Text>
        <Link href="/" style={{ marginTop: 4 }}>
          <Text
            style={{
              color: brand.primary,
              fontFamily: 'Nunito_700Bold',
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            Voltar para o início
          </Text>
        </Link>
      </View>
    </>
  );
}
