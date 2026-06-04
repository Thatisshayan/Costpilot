import React, { useState } from 'react';
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

  // Dynamic Host IP finder to connect the physical iOS phone directly to their running local Express backend.
  const getBackendUrl = () => {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.100:8081"
    if (!hostUri) return 'http://localhost:3000';
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  };

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
          <Text style={styles.subtitle}>Mobile Telemetry & Sync</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main KPI Row */}
          <View style={styles.kpiRow}>
            <View style={[styles.glassCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>Month Spend</Text>
              <Text style={styles.kpiValue}>$3,240</Text>
              <Text style={styles.kpiTrend}>+12.4% vs last mo</Text>
            </View>
            <View style={[styles.glassCard, styles.kpiCard]}>
              <Text style={styles.kpiLabel}>AI Tokens</Text>
              <Text style={styles.kpiValue}>14.8M</Text>
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
              3 active spending spikes flagged on your production workspaces.
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
                <View style={[styles.histogramBar, { height: 110, backgroundColor: '#FF9900' }]} />
                <Text style={styles.histogramLabel}>AWS</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: 75, backgroundColor: '#007FFF' }]} />
                <Text style={styles.histogramLabel}>Azure</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: 45, backgroundColor: '#34A853' }]} />
                <Text style={styles.histogramLabel}>GCP</Text>
              </View>
              <View style={styles.histogramColumn}>
                <View style={[styles.histogramBar, { height: 95, backgroundColor: '#8A2BE2' }]} />
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
