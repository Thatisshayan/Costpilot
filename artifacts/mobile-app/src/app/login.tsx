import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSignIn, useAuth, useClerk } from '@clerk/clerk-expo';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BRAND_TEAL = '#66FCF1';

export default function LoginScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status !== 'complete' || !attempt.createdSessionId) {
        throw new Error('This sign-in needs an additional verification step. Use the web app to complete it.');
      }
      await setActive({ session: attempt.createdSessionId });
      router.replace('/');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  if (isSignedIn) return <ThemedView style={{ flex: 1, padding: 32, paddingTop: 80 }}><ThemedText>Signed in</ThemedText><Pressable accessibilityRole="button" onPress={() => signOut()}><ThemedText>Sign out</ThemedText></Pressable></ThemedView>;
  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.brandingSection}>
          <ThemedView style={styles.logoContainer}>
            <ThemedText style={styles.logoText}>CostPilot</ThemedText>
          </ThemedView>
          <ThemedText style={styles.tagline}>
            Track your recorded costs,{'\n'}optimize your spend.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featureList}>
          <ThemedView style={styles.featureItem}>
            <ThemedText style={styles.featureIcon}>📊</ThemedText>
            <ThemedView style={styles.featureContent}>
              <ThemedText style={styles.featureTitle}>
                Expense Tracking
              </ThemedText>
              <ThemedText style={styles.featureSubtitle}>
                Manage the expenses you record.
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.featureItem}>
            <ThemedText style={styles.featureIcon}>🔔</ThemedText>
            <ThemedView style={styles.featureContent}>
              <ThemedText style={styles.featureTitle}>
                Your records
              </ThemedText>
              <ThemedText style={styles.featureSubtitle}>
                Get notified when spend exceeds budgets
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.featureItem}>
            <ThemedText style={styles.featureIcon}>📈</ThemedText>
            <ThemedView style={styles.featureContent}>
              <ThemedText style={styles.featureTitle}>
                AI Insights
              </ThemedText>
              <ThemedText style={styles.featureSubtitle}>
                Automated recommendations to reduce costs
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.actionsSection}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor="#9499C3"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Password"
            placeholderTextColor="#9499C3"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
            ]}
            onPress={handleSignIn}
            disabled={isLoading || !isLoaded || !email.trim() || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B0C10" size="small" />
            ) : (
              <ThemedText style={styles.signInButtonText}>
                Sign in with Clerk
              </ThemedText>
            )}
          </Pressable>

          <ThemedText style={styles.skipButtonText}>Sign in to continue to your workspace.</ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    maxWidth: 800,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    justifyContent: 'space-between',
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: Spacing.six,
    gap: Spacing.three,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: BRAND_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B0C10',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    color: BRAND_TEAL,
  },
  featureList: {
    gap: Spacing.four,
    paddingVertical: Spacing.five,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureContent: {
    flex: 1,
    gap: Spacing.half,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#9499C3',
    lineHeight: 18,
  },
  actionsSection: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#151720',
  },
  signInButton: {
    backgroundColor: BRAND_TEAL,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonPressed: {
    opacity: 0.8,
  },
  signInButtonText: {
    color: '#0B0C10',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222530',
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9499C3',
  },
});
