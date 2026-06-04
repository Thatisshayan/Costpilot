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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

export default function HomeScreen() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Never');
  const [syncDetails, setSyncDetails] = useState<string | null>(null);

  // Live dynamic database states
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [monthSpend, setMonthSpend] = useState('$3,240');
  const [aiTokens, setAiTokens] = useState('14.8M');
  const [trendText, setTrendText] = useState('+12.4% vs last mo');
  const [riskCount, setRiskCount] = useState(3);
  const [providerSpend, setProviderSpend] = useState({
    AWS: 110,
    Azure: 75,
    GCP: 45,
    OpenAI: 95
  });

  // Dynamic Host IP finder to connect the physical iOS phone directly to their running local Express backend.
  const getBackendUrl = () => {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.100:8081"
    if (!hostUri) return 'http://localhost:3000';
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  };

  useEffect(() => {
    const fetchLiveData = async () => {
      const backendUrl = getBackendUrl();
      try {
        // 1. Fetch KPI Summary from local server
        const kpiRes = await fetch(`${backendUrl}/api/dashboard/kpi-summary`, {
          headers: {
            'x-simulated-user-id': 'dev-user-1',
          }
        });
        
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          setMonthSpend(`$${Number(kpiData.monthToDateSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
          
          // Format tokens nicely
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

        // 2. Fetch platform distribution
        const platformRes = await fetch(`${backendUrl}/api/dashboard/expenses-by-platform`, {
          headers: {
            'x-simulated-user-id': 'dev-user-1',
          }
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

        // 3. Fetch active spending alerts
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
        // Fall back silently to mock data if backend server is unreachable
        console.log('Backend server unreachable; running in offline mock sandbox.');
      }
    };

    fetchLiveData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncDetails(null);
    const backendUrl = getBackendUrl();

    try {
      // Execute live incremental mobile sync POST handshake
      const response = await fetch(`${backendUrl}/api/sync/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-user-id': 'dev-user-1', // Default sandbox simulated user
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
      // Safe development fallback if server is not active during scanning
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0C10" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.logoText}>CostPilot</Text>
            <View style={styles.glowingDot} />
          </View>
          <View style={styles.headerSubRow}>
            <Text style={styles.subtitle}>Mobile Telemetry & Sync</Text>
            <View style={[styles.statusBadge, isLiveMode ? styles.liveBadge : styles.sandboxBadge]}>
              <Text style={styles.badgeText}>{isLiveMode ? '● LIVE DB' : '● OFFLINE'}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main KPI Row */}
          <View style={styles.kpiRow}>
            <View style={[styles.glassCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>Month Spend</Text>
              <Text style={styles.kpiValue}>{monthSpend}</Text>
              <Text style={styles.kpiTrend}>{trendText}</Text>
            </View>
            <View style={[styles.glassCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>AI Tokens</Text>
              <Text style={styles.kpiValue}>{aiTokens}</Text>
              <Text style={styles.kpiTrendSecondary}>8.2k avg/req</Text>
            </View>
          </View>

          {/* Anomaly Glowing Banner */}
          <View style={[styles.glassCard, styles.anomalyBanner]}>
            <View style={styles.anomalyHeader}>
              <Text style={styles.anomalyIcon}>⚠️</Text>
              <Text style={styles.anomalyTitle}>Real-Time Spend Audits</Text>
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

          {/* Multi-Cloud Visual Histogram */}
          <View style={[styles.glassCard, styles.graphCard]}>
            <Text style={styles.cardTitle}>Spending by Provider</Text>
            <View style={styles.histogramContainer}>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.AWS, backgroundColor: '#FF9900' }]} />
                <Text style={styles.histogramLabel}>AWS</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.Azure, backgroundColor: '#007FFF' }]} />
                <Text style={styles.histogramLabel}>Azure</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.GCP, backgroundColor: '#34A853' }]} />
                <Text style={styles.histogramLabel}>GCP</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: providerSpend.OpenAI, backgroundColor: '#8A2BE2' }]} />
                <Text style={styles.histogramLabel}>OpenAI</Text>
              </View>
            </View>
          </View>

          {/* Offline Sync Card */}
          <View style={[styles.glassCard, styles.syncCard]}>
            <Text style={styles.cardTitle}>Offline-First Sync Engine</Text>
            <Text style={styles.syncDescription}>
              CostPilot replicates delta changes locally. Pushing changes automatically maps client IDs to secure multi-tenant server IDs.
            </Text>
            
            <View style={styles.syncStatusBlock}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Synced:</Text>
                <Text style={styles.statusValue}>{lastSynced}</Text>
              </View>
              {syncDetails && (
                <Text style={styles.syncDetailsText}>
                  {syncDetails}
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={styles.syncButton} 
              onPress={handleSync}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.syncButtonText}>🔄 Sync Offline Data</Text>
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
    backgroundColor: '#0B0C10',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2833',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  glowingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A2BE2',
    marginLeft: 6,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  subtitle: {
    color: '#66FCF1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  liveBadge: {
    backgroundColor: 'rgba(65, 200, 152, 0.1)',
    borderColor: '#41C898',
  },
  sandboxBadge: {
    backgroundColor: 'rgba(148, 153, 195, 0.1)',
    borderColor: '#9499C3',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  glassCard: {
    backgroundColor: '#15161E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222530',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    justifyContent: 'space-between',
    height: 105,
  },
  kpiLabel: {
    color: '#9499C3',
    fontSize: 12,
    fontWeight: '500',
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  kpiTrend: {
    color: '#41C898',
    fontSize: 10,
    fontWeight: '600',
  },
  kpiTrendSecondary: {
    color: '#9499C3',
    fontSize: 10,
    fontWeight: '400',
  },
  anomalyBanner: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  anomalyIcon: {
    fontSize: 16,
  },
  anomalyTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  anomalyText: {
    color: '#C3C7DB',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  remediateButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  remediateButtonText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  graphCard: {
    height: 190,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
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
    width: 28,
    borderRadius: 6,
    marginBottom: 8,
  },
  histogramLabel: {
    color: '#9499C3',
    fontSize: 10,
    fontWeight: '600',
  },
  syncCard: {
    gap: 12,
  },
  syncDescription: {
    color: '#9499C3',
    fontSize: 12,
    lineHeight: 18,
  },
  syncStatusBlock: {
    backgroundColor: '#0F1015',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1D1E26',
    marginVertical: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#9499C3',
    fontSize: 11,
    fontWeight: '500',
  },
  statusValue: {
    color: '#66FCF1',
    fontSize: 11,
    fontWeight: '700',
  },
  syncDetailsText: {
    color: '#34A853',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  syncButton: {
    backgroundColor: '#8A2BE2',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
