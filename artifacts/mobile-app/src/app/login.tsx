import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BRAND_TEAL = '#66FCF1';

export default function LoginScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const handleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/');
    }, 800);
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
            Track your cloud costs,{'\n'}optimize your spend.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featureList}>
          <ThemedView style={styles.featureItem}>
            <ThemedText style={styles.featureIcon}>📊</ThemedText>
            <ThemedView style={styles.featureContent}>
              <ThemedText style={styles.featureTitle}>
                Real-time Cost Tracking
              </ThemedText>
              <ThemedText style={styles.featureSubtitle}>
                Monitor spend across all your cloud providers
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.featureItem}>
            <ThemedText style={styles.featureIcon}>🔔</ThemedText>
            <ThemedView style={styles.featureContent}>
              <ThemedText style={styles.featureTitle}>
                Smart Alerts
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
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
            ]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B0C10" size="small" />
            ) : (
              <ThemedText style={styles.signInButtonText}>
                Sign in with Clerk
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={() => router.replace('/')}
          >
            <ThemedText style={styles.skipButtonText}>
              Continue as Guest
            </ThemedText>
          </Pressable>
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
