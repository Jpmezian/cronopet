import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center bg-stone-50 p-5">
        <Text className="text-5xl mb-4">🐾</Text>
        <Text className="text-stone-900 text-xl font-bold mb-2">
          Pagina nao encontrada
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-amber-600 font-semibold text-base">
            Voltar para o inicio
          </Text>
        </Link>
      </View>
    </>
  );
}
