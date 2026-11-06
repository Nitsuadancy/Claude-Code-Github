import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { Gloock_400Regular } from '@expo-google-fonts/gloock/400Regular';
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans/700Bold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { useFonts } from 'expo-font';
import { DarkTheme, type ErrorBoundaryProps, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DialogHost } from '@/components/dialog-host';
import { FallbackScreen } from '@/components/fallback';
import { StoreProvider, useStore } from '@/state/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.gold,
    text: colors.text,
    border: colors.border,
  },
};

function AppStack() {
  const { state } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    Gloock_400Regular,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  const ready = state.hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade_from_bottom',
        }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="foodie" options={{ animation: 'fade' }} />
        <Stack.Screen name="chef" options={{ animation: 'fade' }} />
      </Stack>
      <DialogHost />
    </ThemeProvider>
  );
}

/** Shown instead of a blank screen if something crashes while rendering. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <FallbackScreen
        eyebrow="Something went wrong"
        title="A small kitchen mishap"
        body="Manna hit an unexpected problem. Your cart and orders are saved on this device. Try again in a moment."
        action={{ title: 'Try again', onPress: () => void retry() }}
      />
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
