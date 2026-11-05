import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DarkTheme, DefaultTheme, Redirect, ThemeProvider, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { setApiAuthTokenGetter } from '@/lib/api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthenticatedTabs() {
  const colorScheme = useColorScheme();
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const segments = useSegments();
  const [registeredUser, setRegisteredUser] = useState<string | null | undefined>(undefined);
  const [loaded, error] = useFonts({
    'Clash Display': require('../../assets/fonts/ClashDisplay-Regular.ttf'),
    'Plus Jakarta Sans': require('../../assets/fonts/PlusJakartaSans[wght].ttf'),
    'JetBrains Mono': require('../../assets/fonts/JetBrainsMono[wght].ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    setApiAuthTokenGetter(() => isSignedIn ? getToken() : null);
    setRegisteredUser(userId ?? null);
    return () => setApiAuthTokenGetter(null);
  }, [getToken, isSignedIn, userId]);

  if (!loaded || !isLoaded || registeredUser !== (userId ?? null)) {
    return null;
  }

  if (!isSignedIn && segments[segments.length - 1] !== 'login') {
    return <Redirect href="/login" />;
  }

  const screen = segments[segments.length - 1];
  if (screen && !["index", "expenses", "add-expense", "login"].includes(screen)) return <Redirect href="/" />;
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs key={userId ?? "signed-out"} />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <ThemedText>Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign-in.</ThemedText>;
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthenticatedTabs />
    </ClerkProvider>
  );
}
