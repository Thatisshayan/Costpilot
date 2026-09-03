import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Fonts, Colors, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreenPremium() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Never');
  const [syncDetails, setSyncDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [totalSpend, setTotalSpend] = useState('$0');
  const [monthSpend, setMonthSpend] = useState('$3,240');
  const [aiTokens, setAiTokens] = useState('14.8M');
  const [trendText, setTrendText] = useState('+12.4% vs last mo');
  const [activeTools, setActiveTools] = useState('0');
  const [riskCount, setRiskCount] = useState(3);
  const [providerSpend, setProviderSpend] = useState({
    AWS: 110,
    Azure: 75,
    GCP: 45,
    OpenAI: 95
  });

  const getBackendUrl = () => {
    const hostUri = Constants.expoConfig?.hostUri;
    if (!hostUri) return 'http://localhost:3000';
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  };

  useEffect(() => {
    const fetchLiveData = async () => {
      setIsLoading(true);
      setError(null);
      const backendUrl = getBackendUrl();
      try {
        const kpiRes = await fetch(`${backendUrl}/api/dashboard/kpi-summary`, {
          headers: { 'x-simulated-user-id': 'dev-user-1' }
        });

        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          const mtd = Number(kpiData.monthToDateSpend || 0);
          setMonthSpend(`$${mtd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
          setTotalSpend(`$${Number(kpiData.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
          setActiveTools(String(kpiData.activeTools || kpiData.activeSubscriptions || '0'));

          const tokens = Number(kpiData.totalAiSpend || 0);
          if (tokens >= 1000000) {
            setAiTokens(`${(tokens / 1000000).toFixed(1)}M`);
          } else if (tokens >= 1000) {
            setAiTokens(`${(tokens / 1000).toFixed(0)}k`);
          } else {
            setAiTokens(tokens.toString());
          }

          const change = kpiData.monthToDateChangePercent || 0;
          setTrendText(`${change >= 0 ? '+' : ''}${change}% vs last mo`);
          setIsLiveMode(true);
        }

        const platformRes = await fetch(`${backendUrl}/api/dashboard/expenses-by-platform`, {
          headers: { 'x-simulated-user-id': 'dev-user-1' }
        });
        if (platformRes.ok) {
          const platformData = await platformRes.json();
          const newSpend = { AWS: 0, Azure: 0, GCP: 0, OpenAI: 0 };

          platformData.forEach((p: any) => {
            const name = p.platformName?.toUpperCase() || '';
            if (name.includes('AWS')) newSpend.AWS += p.total;
            else if (name.includes('AZURE')) newSpend.Azure += p.total;
            else if (name.includes('GCP') || name.includes('GOOGLE')) newSpend.GCP += p.total;
            else if (name.includes('OPENAI')) newSpend.OpenAI += p.total;
          });

          const maxVal = Math.max(newSpend.AWS, newSpend.Azure, newSpend.GCP, newSpend.OpenAI, 1);
          setProviderSpend({
            AWS: Math.max(20, (newSpend.AWS / maxVal) * 115),
            Azure: Math.max(20, (newSpend.Azure / maxVal) * 115),
            GCP: Math.max(20, (newSpend.GCP / maxVal) * 115),
            OpenAI: Math.max(20, (newSpend.OpenAI / maxVal) * 115),
          });
        }

        const auditRes = await fetch(`${backendUrl}/api/audits?workspaceId=1`, {
          headers: {
            'x-simulated-user-id': 'dev-user-1',
            'x-simulated-workspace-role': 'owner'
          }
        });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setRiskCount(auditData.length || 0);
        }
      } catch (err) {
        console.log('Backend server unreachable; running in offline mock sandbox.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    const fetchLiveData = async () => {
      const backendUrl = getBackendUrl();
      try {
        const kpiRes = await fetch(`${backendUrl}/api/dashboard/kpi-summary`, {
          headers: { 'x-simulated-user-id': 'dev-user-1' }
        });
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          const mtd = Number(kpiData.monthToDateSpend || 0);
          setMonthSpend(`$${mtd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
          setTotalSpend(`$${Number(kpiData.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
          setActiveTools(String(kpiData.activeTools || kpiData.activeSubscriptions || '0'));
          const tokens = Number(kpiData.totalAiSpend || 0);
          if (tokens >= 1000000) setAiTokens(`${(tokens / 1000000).toFixed(1)}M`);
          else if (tokens >= 1000) setAiTokens(`${(tokens / 1000).toFixed(0)}k`);
          else setAiTokens(tokens.toString());
          const change = kpiData.monthToDateChangePercent || 0;
          setTrendText(`${change >= 0 ? '+' : ''}${change}% vs last mo`);
          setIsLiveMode(true);
        }
      } catch (err) {
        console.log('Retry failed; using offline data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiveData();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncDetails(null);
    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/api/sync/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-user-id': 'dev-user-1',
        },
        body: JSON.stringify({
          created: [
            {
              id: 'local-exp-' + Date.now(),
              amount: 145.20,
              category: 'ai-tokens',
              description: 'Mobile offline LLM token usage',
              spentAt: new Date().toISOString(),
            }
          ],
          updated: [],
          deleted: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const dateStr = new Date().toLocaleTimeString();
        setLastSynced(dateStr);
        setSyncDetails(`Synchronized ${data.reconciledIds?.length || 1} local offline changes with Server.`);
        Alert.alert(
          'Sync Success! 🔄',
          `Successfully pushed 1 offline expense to Server.\nReconciled Server Transaction ID: ${data.reconciledIds?.[0]?.server || 'id-reconciled'}`
        );
      } else {
        throw new Error('Server returned error status');
      }
    } catch (error) {
      const dateStr = new Date().toLocaleTimeString();
      setLastSynced(dateStr);
      setSyncDetails('Local Simulation Mode (Backend Offline)');
      Alert.alert(
        'Sandbox Sync Active 🔄',
        `Sync simulated successfully in Offline Mode.\nBackend target: ${backendUrl}\n(Start your api-server locally to test live replication!)`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.dark.accentAction} />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
      <SafeAreaView style={styles.safeArea}>

        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.logoText}>CostPilot</Text>
            <View style={styles.glowingDot} />
          </View>
          <View style={styles.headerSubRow}>
            <Text style={styles.subtitle}>Cloud Cost Intelligence</Text>
            <View style={[styles.statusBadge, isLiveMode ? styles.liveBadge : styles.sandboxBadge]}>
              <Text style={styles.badgeText}>{isLiveMode ? '● LIVE DB' : '● OFFLINE'}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Premium KPI Row with Enhanced Typography */}
          <View style={styles.kpiRow}>
            <View style={[styles.premiumCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>Month Spend</Text>
              <Text style={[styles.kpiValue, { fontFamily: Fonts.clashDisplay }]}>{monthSpend}</Text>
              <Text style={styles.kpiTrend}>{trendText}</Text>
            </View>
            <View style={[styles.premiumCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>AI Tokens</Text>
              <Text style={[styles.kpiValue, { fontFamily: Fonts.clashDisplay }]}>{aiTokens}</Text>
              <Text style={styles.kpiTrendSecondary}>8.2k avg/req</Text>
            </View>
          </View>

          {/* Secondary KPI Row */}
          <View style={styles.kpiRow}>
            <View style={[styles.premiumCard, styles.kpiCardSmall]}>
              <Text style={styles.kpiLabel}>Total Spend</Text>
              <Text style={[styles.kpiValue, { fontFamily: Fonts.clashDisplay }]}>{totalSpend}</Text>
            </View>
            <View style={[styles.premiumCard, styles.kpiCardSmall]}>
              <Text style={styles.kpiLabel}>Active Tools</Text>
              <Text style={[styles.kpiValue, { fontFamily: Fonts.clashDisplay }]}>{activeTools}</Text>
            </View>
          </View>

          {/* Premium Anomaly Banner */}
          <View style={[styles.premiumCard, styles.anomalyBanner]}>
            <View style={styles.anomalyHeader}>
              <Text style={styles.anomalyIcon}>⚠️</Text>
              <Text style={[styles.anomalyTitle, { fontFamily: Fonts.clashDisplay }]}>Real-Time Spend Audits</Text>
            </View>
            <Text style={styles.anomalyText}>
              {riskCount > 0
                ? `${riskCount} active spending spikes flagged on your production workspaces.`
                : 'No severe cloud billing anomalies detected on your workspaces.'}
            </Text>
            <TouchableOpacity style={styles.remediateButton} activeOpacity={0.8}>
              <Text style={styles.remediateButtonText}>Review Spikes</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Quick Actions */}
          <View style={[styles.premiumCard, styles.quickActionsCard]}>
            <Text style={[styles.cardTitle, { fontFamily: Fonts.clashDisplay }]}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/add-expense')}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionLabel}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/expenses')}
              >
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionLabel}>View Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Budget', 'Budget tracking coming soon.')}
              >
                <Text style={styles.actionIcon}>💰</Text>
                <Text style={styles.actionLabel}>Check Budget</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Premium Multi-Cloud Histogram */}
          <View style={[styles.premiumCard, styles.graphCard]}>
            <Text style={[styles.cardTitle, { fontFamily: Fonts.clashDisplay }]}>Spending by Provider</Text>
            <View style={styles.histogramContainer}>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.AWS, backgroundColor: Colors.dark.accentAWS }]} />
                <Text style={styles.histogramLabel}>AWS</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.Azure, backgroundColor: Colors.dark.accentAzure }]} />
                <Text style={styles.histogramLabel}>Azure</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.GCP, backgroundColor: Colors.dark.accentGCP }]} />
                <Text style={styles.histogramLabel}>GCP</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.OpenAI, backgroundColor: Colors.dark.accentOpenAI }]} />
                <Text style={styles.histogramLabel}>OpenAI</Text>
              </View>
            </View>
          </View>

          {/* Premium Sync Card */}
          <View style={[styles.premiumCard, styles.syncCard]}>
            <Text style={[styles.cardTitle, { fontFamily: Fonts.clashDisplay }]}>Offline-First Sync Engine</Text>
            <Text style={styles.syncDescription}>
              Seamlessly sync your cloud expenses across all devices. Real-time reconciliation with your cloud providers.
            </Text>
            <View style={styles.syncStatusBlock}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Synced</Text>
                <Text style={styles.statusValue}>{lastSynced}</Text>
              </View>
            </View>
            {syncDetails && <Text style={styles.syncDetailsText}>{syncDetails}</Text>}
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.syncButtonText}>Sync Now</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
    marginTop: 12,
    fontFamily: Fonts.plusJakartaSans,
  },
  errorText: {
    color: Colors.dark.accentWarning,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Fonts.plusJakartaSans,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: Colors.dark.accentAction,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222530',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.text,
    fontFamily: Fonts.clashDisplay,
    letterSpacing: -0.5,
  },
  glowingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accentAction,
    shadowColor: Colors.dark.accentAction,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.plusJakartaSans,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveBadge: {
    backgroundColor: 'rgba(102, 252, 241, 0.1)',
    borderColor: 'rgba(102, 252, 241, 0.3)',
  },
  sandboxBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.accentAction,
    fontFamily: Fonts.jetBrainsMono,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  premiumCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E3135',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    justifyContent: 'space-between',
    height: 120,
  },
  kpiCardSmall: {
    flex: 1,
    justifyContent: 'space-between',
    height: 90,
  },
  kpiLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.plusJakartaSans,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: -1,
  },
  kpiTrend: {
    color: Colors.dark.accentAction,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  kpiTrendSecondary: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    fontFamily: Fonts.plusJakartaSans,
  },
  anomalyBanner: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.accentWarning,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  anomalyIcon: {
    fontSize: 18,
  },
  anomalyTitle: {
    color: Colors.dark.accentWarning,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  anomalyText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: Fonts.plusJakartaSans,
  },
  remediateButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  remediateButtonText: {
    color: Colors.dark.accentWarning,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  quickActionsCard: {
    gap: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(102, 252, 241, 0.05)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 252, 241, 0.15)',
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  graphCard: {
    height: 210,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  histogramContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
    paddingBottom: 8,
  },
  histogramColumn: {
    alignItems: 'center',
    width: 50,
  },
  histogramBar: {
    width: 32,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  histogramLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.jetBrainsMono,
  },
  syncCard: {
    gap: 14,
    marginBottom: 20,
  },
  syncDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.plusJakartaSans,
  },
  syncStatusBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2E3135',
    marginVertical: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.plusJakartaSans,
  },
  statusValue: {
    color: Colors.dark.accentAction,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.jetBrainsMono,
  },
  syncDetailsText: {
    color: Colors.dark.accentGCP,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Fonts.plusJakartaSans,
  },
  syncButton: {
    backgroundColor: Colors.dark.accentAI,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: Colors.dark.accentAI,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.plusJakartaSans,
  },
});
