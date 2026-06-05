import { useRouter } from 'expo-router';
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

type Expense = {
  id: string;
  amount: number;
  description: string;
  platformName: string;
  category: string;
  spentAt: string;
};

const PLATFORM_COLORS: Record<string, string> = {
  AWS: '#FF9900',
  AZURE: '#007FFF',
  GCP: '#34A853',
  OPENAI: '#8A2BE2',
};

function getPlatformColor(name: string): string {
  const upper = name.toUpperCase();
  for (const key of Object.keys(PLATFORM_COLORS)) {
    if (upper.includes(key)) return PLATFORM_COLORS[key];
  }
  return '#9499C3';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ExpenseCard({ item }: { item: Expense }) {
  const theme = useTheme();
  const platformColor = getPlatformColor(item.platformName);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.expenseCard, { borderColor: theme.backgroundSelected }]}
    >
      <View style={styles.expenseLeft}>
        <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
        <View style={styles.expenseInfo}>
          <ThemedText style={styles.expenseDescription} numberOfLines={1}>
            {item.description || item.category}
          </ThemedText>
          <ThemedText style={styles.expenseMeta}>
            {item.platformName} · {formatDate(item.spentAt)}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.expenseAmount}>
        ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </ThemedText>
    </ThemedView>
  );
}

export default function ExpensesScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [expenses, setExpenses] = useState<Expense[]>([]);
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

  const fetchExpenses = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await apiFetch<Expense[]>('/expenses', {
        headers: { 'x-simulated-user-id': 'dev-user-1' },
      });
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRefresh = () => {
    fetchExpenses(true);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#66FCF1" />
        <ThemedText style={styles.loadingText}>Loading expenses...</ThemedText>
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
          onPress={() => fetchExpenses()}
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
        <ThemedView style={styles.headerRow}>
          <ThemedText style={styles.headerTitle}>Expenses</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.push('/add-expense')}
          >
            <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
          </Pressable>
        </ThemedView>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard item={item} />}
        contentContainerStyle={[
          styles.listContent,
          contentPlatformStyle,
          expenses.length === 0 && styles.listContentEmpty,
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
            <ThemedText style={styles.emptyIcon}>📭</ThemedText>
            <ThemedText style={styles.emptyTitle}>No expenses yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Tap the + button to add your first expense
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  addButton: {
    backgroundColor: '#66FCF1',
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  addButtonText: {
    color: '#0B0C10',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  listContentEmpty: {
    flex: 1,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  expenseInfo: {
    flex: 1,
    gap: 2,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '600',
  },
  expenseMeta: {
    fontSize: 12,
    color: '#9499C3',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#66FCF1',
    marginLeft: Spacing.three,
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
