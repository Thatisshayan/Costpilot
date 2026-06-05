import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';

type Subscription = {
  id: string;
  platformName: string;
  planName: string;
  monthlyCost: number;
  renewalDate: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
};

const STATUS_COLORS: Record<Subscription['status'], { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(65, 200, 152, 0.15)', text: '#41C898', label: 'Active' },
  trial: { bg: 'rgba(102, 252, 241, 0.15)', text: '#66FCF1', label: 'Trial' },
  expired: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Expired' },
  cancelled: { bg: 'rgba(148, 153, 195, 0.15)', text: '#9499C3', label: 'Cancelled' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SubscriptionCard({ item }: { item: Subscription }) {
  const statusInfo = STATUS_COLORS[item.status] || STATUS_COLORS.active;

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.subscriptionCard}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <ThemedText style={styles.platformName}>{item.platformName}</ThemedText>
          <ThemedText style={styles.planName}>{item.planName}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusInfo.text }]}>
            {statusInfo.label}
          </ThemedText>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Monthly</ThemedText>
          <ThemedText style={styles.detailValue}>
            ${item.monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Next Renewal</ThemedText>
          <ThemedText style={styles.detailValue}>{formatDate(item.renewalDate)}</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

export default function SubscriptionsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
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

  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await apiFetch<Subscription[]>('/subscriptions', {
        headers: { 'x-simulated-user-id': 'dev-user-1' },
      });
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleRefresh = () => {
    fetchSubscriptions(true);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#66FCF1" />
        <ThemedText style={styles.loadingText}>Loading subscriptions...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => fetchSubscriptions()}
        >
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: safeAreaInsets.top + Spacing.three,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText style={styles.headerTitle}>Subscriptions</ThemedText>
      </View>

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SubscriptionCard item={item} />}
        contentContainerStyle={[
          styles.listContent,
          contentPlatformStyle,
          subscriptions.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#66FCF1"
            colors={['#66FCF1']}
          />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📋</ThemedText>
            <ThemedText style={styles.emptyTitle}>No subscriptions yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Your active subscriptions will appear here
            </ThemedText>
          </ThemedView>
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  loadingText: {
    fontSize: 14,
    color: '#9499C3',
  },
  errorIcon: {
    fontSize: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#66FCF1',
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  retryButtonText: {
    color: '#0B0C10',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  listContentEmpty: {
    flex: 1,
  },
  subscriptionCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222530',
    gap: Spacing.three,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    gap: 2,
  },
  platformName: {
    fontSize: 17,
    fontWeight: '700',
  },
  planName: {
    fontSize: 13,
    color: '#9499C3',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBottom: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#1F2833',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9499C3',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9499C3',
    textAlign: 'center',
  },
});
