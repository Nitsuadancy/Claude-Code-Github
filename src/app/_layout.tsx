import {
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { Raleway_500Medium, Raleway_600SemiBold } from '@expo-google-fonts/raleway';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/state/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStack() {
  const { state } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Raleway_500Medium,
    Raleway_600SemiBold,
  });
  const ready = state.hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: colors.black } }} />
        <Stack.Screen name="choose-role" options={{ contentStyle: { backgroundColor: colors.black } }} />
        <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: colors.black } }} />
        <Stack.Screen name="foodie" options={{ animation: 'fade' }} />
        <Stack.Screen name="chef" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
