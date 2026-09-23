import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { APIStatusBar } from '@/components/APIStatusBar';
import { APIConnectivityProvider } from '@/context/APIConnectivityContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootLayoutNav() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <APIStatusBar />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="nutrition" />
          <Stack.Screen name="pumpmatch" />
          <Stack.Screen name="shop" />
          <Stack.Screen name="dms" />
          <Stack.Screen name="chat/[name]" />
        </Stack>
      </View>
    </View>
  );
}

function AppReadyGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  useEffect(() => {
    if (theme.isThemeReady) {
      SplashScreen.hideAsync();
    }
  }, [theme.isThemeReady]);

  // Keep the native splash screen up until the persisted theme (palette +
  // light/dark mode) has been read, so the app never flashes the wrong theme.
  if (!theme.isThemeReady) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <APIConnectivityProvider>
                  <AppReadyGate>
                    <RootLayoutNav />
                  </AppReadyGate>
                </APIConnectivityProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
