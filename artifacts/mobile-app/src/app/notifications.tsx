import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NotificationChannel = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

const INITIAL_CHANNELS: NotificationChannel[] = [
  {
    id: 'budget-alerts',
    title: 'Budget Alerts',
    description: 'Get notified when you exceed budget thresholds',
    enabled: true,
  },
  {
    id: 'spike-detection',
    title: 'Spending Spikes',
    description: 'Alert on unusual spending patterns or cost spikes',
    enabled: true,
  },
  {
    id: 'subscription-renewals',
    title: 'Subscription Renewals',
    description: 'Reminders before your subscriptions renew',
    enabled: true,
  },
  {
    id: 'weekly-report',
    title: 'Weekly Report',
    description: 'Receive a weekly summary of your cloud spend',
    enabled: false,
  },
  {
    id: 'monthly-report',
    title: 'Monthly Report',
    description: 'Receive a monthly cost analysis report',
    enabled: true,
  },
  {
    id: 'anomaly-alerts',
    title: 'Anomaly Detection',
    description: 'AI-powered anomaly detection notifications',
    enabled: false,
  },
  {
    id: 'team-activity',
    title: 'Team Activity',
    description: 'Notify when team members make changes',
    enabled: false,
  },
];

export default function NotificationsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [channels, setChannels] = useState(INITIAL_CHANNELS);

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

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, enabled: !ch.enabled } : ch
      )
    );
  };

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
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Manage your notification preferences
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          contentPlatformStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {channels.map((channel, index) => (
          <ThemedView
            key={channel.id}
            type="backgroundElement"
            style={[
              styles.channelCard,
              index < channels.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: theme.backgroundSelected,
              },
            ]}
          >
            <View style={styles.channelInfo}>
              <ThemedText style={styles.channelTitle}>
                {channel.title}
              </ThemedText>
              <ThemedText style={styles.channelDescription}>
                {channel.description}
              </ThemedText>
            </View>
            <Switch
              value={channel.enabled}
              onValueChange={() => toggleChannel(channel.id)}
              trackColor={{
                false: theme.backgroundSelected,
                true: '#66FCF1',
              }}
              thumbColor={channel.enabled ? '#0B0C10' : '#9499C3'}
              ios_backgroundColor={theme.backgroundSelected}
            />
          </ThemedView>
        ))}

        <ThemedView style={styles.infoBox}>
          <ThemedText style={styles.infoIcon}>ℹ️</ThemedText>
          <ThemedText style={styles.infoText}>
            Notification preferences are saved locally. Cloud sync coming soon.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  headerSubtitle: {
    fontSize: 13,
    color: '#9499C3',
    marginTop: Spacing.half,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: 0,
    paddingBottom: Spacing.six,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 0,
  },
  channelInfo: {
    flex: 1,
    gap: 2,
    marginRight: Spacing.three,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  channelDescription: {
    fontSize: 12,
    color: '#9499C3',
    lineHeight: 17,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: '#222530',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#9499C3',
    flex: 1,
    lineHeight: 16,
  },
});
