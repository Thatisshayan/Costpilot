import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Gauge, 
  Zap, 
  Compass, 
  RefreshCcw,
  FileText,
  Download,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';

// Reusable Components
import { HeaderAlert } from '../components/dashboard/HeaderAlert';
import { KpiCard } from '../components/dashboard/KpiCard';
import { AICostAuditCard } from '../components/dashboard/AICostAuditCard';
import { SavingsOpportunitiesCard } from '../components/dashboard/SavingsOpportunitiesCard';
import { SpendBreakdownChart } from '../components/dashboard/SpendBreakdownChart';
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable';
import { BudgetForecastCard } from '../components/dashboard/BudgetForecastCard';
import { ConnectedSourcesCard } from '../components/dashboard/ConnectedSourcesCard';
import { UpcomingRenewalsCard } from '../components/dashboard/UpcomingRenewalsCard';
import { BottomMetricsBar } from '../components/dashboard/BottomMetricsBar';
import OnboardingWizard from '../components/onboarding-wizard';

// Mock Data & Utils
import { costpilotMockData } from '../data/costpilotMockData';
import { formatCurrency } from '../lib/currency';
import CurrencySelector, { useCurrency } from '../components/currency-selector';
import { 
  useGetKpiSummary, 
  useGetMonthlySpending, 
  useListSavingsOpportunities,
  useUpdateWorkspace,
  useCreatePlatform,
  getListWorkspacesQueryKey,
  getListPlatformsQueryKey,
  getGetKpiSummaryQueryKey,
  getListSavingsOpportunitiesQueryKey,
  getListAuditsQueryKey
} from '@workspace/api-client-react';
import { useWorkspace } from '../context/workspace-context';
import { useQueryClient } from '@tanstack/react-query';

export default function Dashboard() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const createPlatformMutation = useCreatePlatform();
  const [currency] = useCurrency();

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const sseUrl = `/api/audits/sse?workspaceId=${activeWorkspaceId}&simulatedUserId=user_1`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const audit = JSON.parse(event.data);
        if (audit && audit.title) {
          toast.warning(`[CostPilot Alert] ${audit.title}`, {
            description: audit.description || 'New spending anomaly detected. Direct remediation action is recommended.',
            duration: 10000,
            action: {
              label: "Review Findings",
              onClick: () => {
                if (audit.remediationPath) {
                  setLocation(audit.remediationPath);
                }
              }
            }
          });

          // Invalidate cache queries to update UI in real-time
          qc.invalidateQueries({ queryKey: getGetKpiSummaryQueryKey() });
          qc.invalidateQueries({ queryKey: getListSavingsOpportunitiesQueryKey() });
          qc.invalidateQueries({ queryKey: getListAuditsQueryKey() });
        }
      } catch (err) {
        // Ignore heartbeats and parsing errors
      }
    };

    eventSource.onerror = () => {
      // EventSource automatically retries connections
    };

    return () => {
      eventSource.close();
    };
  }, [activeWorkspaceId, qc, setLocation]);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);

  // Show wizard if there's an active workspace, it's not onboarded, and we haven't dismissed it locally
  const showWizard = activeWorkspace ? (!activeWorkspace.onboarded && !wizardDismissed) : false;

  const { data: liveSummary, isLoading: kpiLoading } = useGetKpiSummary();
  const { data: liveSpendingTrend, isLoading: trendLoading } = useGetMonthlySpending();
  const { data: liveOpportunities, isLoading: oppsLoading } = useListSavingsOpportunities();
  const liveActivity: any[] | undefined = undefined;
  const activityLoading = false;
  const liveSources: any[] | undefined = undefined;
  const sourcesLoading = false;
  
  // Fallback to mock data if live data is not yet available or empty
  const summary = liveSummary || costpilotMockData.summary;
  const spendingTrend = (liveSpendingTrend && liveSpendingTrend.length > 0) ? liveSpendingTrend : costpilotMockData.spendingTrend;
  const savingsOpportunities = (liveOpportunities && liveOpportunities.length > 0) ? liveOpportunities : costpilotMockData.savingsOpportunities;
  const recentActivity = costpilotMockData.recentActivity;
  const connectedSources = costpilotMockData.connectedSources;

  const isLoading = kpiLoading || trendLoading || oppsLoading || activityLoading || sourcesLoading || isAuditing;

  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const addDays = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
    return [
      { vendor: "Claude Pro",   amount: 20, date: fmt(addDays(2)) },
      { vendor: "Midjourney",   amount: 30, date: fmt(addDays(3)) },
      { vendor: "Runway",       amount: 35, date: fmt(addDays(7)) },
      { vendor: "Perplexity",   amount: 20, date: fmt(addDays(4)) },
      { vendor: "ElevenLabs",   amount: 33, date: fmt(addDays(5)) },
    ];
  }, []);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setAuditComplete(false);
    
    // Simulated audit delay
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
      loading: 'CostPilot is auditing your AI stack...',
      success: () => {
        setIsAuditing(false);
        setAuditComplete(true);
        return 'Audit Complete! Found 4 new savings opportunities.';
      },
      error: 'Failed to run audit. Please try again.',
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {showWizard && (
        <OnboardingWizard
          onComplete={async (source) => {
            if (!activeWorkspaceId) return;
            try {
              setWizardDismissed(true);

              // 1. Create the platform
              const platformName = source === 'stripe' ? 'Stripe' : 'Bank CSV';
              const category = source === 'stripe' ? 'Payment Gateway' : 'Financial Statement';
              await createPlatformMutation.mutateAsync({
                data: {
                  name: platformName,
                  category: category,
                  notes: 'Created during onboarding wizard completion.',
                }
              });

              // 2. Mark workspace as onboarded
              await updateWorkspaceMutation.mutateAsync({
                id: activeWorkspaceId,
                data: { onboarded: true }
              });

              localStorage.setItem("costpilot_onboarding_done", "true");
              qc.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
              qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
              toast.success(`Workspace onboarding completed with ${platformName}!`);
            } catch (err) {
              setWizardDismissed(false);
              toast.error("Failed to complete onboarding.");
            }
          }}
        />
      )}
      
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">CostPilot Intelligence</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Navigate, forecast, and control every AI-related cost with high-fidelity spend intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button 
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
            aria-label="Run AI Cost Audit"
          >
            {isAuditing ? <RefreshCcw size={18} className="animate-spin" /> : <Compass size={18} />}
            Run AI Cost Audit
          </button>
        </div>
      </header>

      {/* High Priority Alerts */}
      <HeaderAlert 
        renewalsCount={summary.renewalsThisWeek} 
        totalAmount={formatCurrency(summary.upcomingRenewalAmount, currency)} 
      />

      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          label="Total AI Spend" 
          value={formatCurrency(summary.totalAiSpend, currency)} 
          subtext={`Across ${summary.activeAiTools} active tools`}
          icon={<CreditCard className="text-indigo-400" size={18} />}
        />
        <KpiCard 
          label="Month-to-Date" 
          value={formatCurrency(summary.monthToDateSpend, currency)} 
          subtext={`+${summary.monthToDateChangePercent}% vs last month`}
          icon={<TrendingUp className="text-emerald-400" size={18} />}
          trend="up"
        />
        <KpiCard 
          label="Budget Velocity" 
          value={`${summary.budgetUsedPercent ?? 0}% Used`} 
          subtext={`$${((summary.forecastTotal ?? 0) - (summary.budgetTotal ?? 0)).toLocaleString()} over budget`}
          icon={<Gauge className="text-red-400" size={18} />}
          isUrgent
          trend="up"
        />
        <KpiCard 
          label="Savings Found" 
          value={formatCurrency(summary.totalSavingsFound ?? 0, currency)} 
          subtext="Potential monthly reduction"
          icon={<Zap className="text-amber-400" size={18} />}
          highlight
        />
      </section>

      {/* Intelligence Row: Audit & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <AICostAuditCard 
            onRunAudit={handleRunAudit} 
            isAuditing={isAuditing} 
          />
          
          <Link href="/reports" className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-md flex items-center justify-between group cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.99]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">Monthly Report Ready</h3>
                <p className="text-xs text-slate-500">Your June AI spend report is ready for export.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-indigo-500 transition-all">
              <Download size={18} />
            </div>
          </Link>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <SavingsOpportunitiesCard 
            opportunities={savingsOpportunities} 
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Analytics Row: Chart & Budget Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-8">
          <SpendBreakdownChart 
            data={spendingTrend} 
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <BudgetForecastCard 
            budget={summary.budgetTotal ?? 0} 
            forecast={summary.forecastTotal ?? 0} 
            usedPercent={summary.budgetUsedPercent ?? 0} 
          />
          <ConnectedSourcesCard sources={connectedSources} />
        </div>
      </div>

      {/* Ledger Row: Recent Activity & Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-9">
          <RecentActivityTable activity={recentActivity as any} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-3">
          <UpcomingRenewalsCard renewals={upcomingRenewals} />
        </div>
      </div>

      {/* Global Status Footer */}
      <BottomMetricsBar 
        apiSpend={formatCurrency(summary.apiSpendToday ?? 0, currency)}
        budgetUsed={`${summary.budgetUsedPercent ?? 0}%`}
        forecast={formatCurrency(summary.forecastTotal ?? 0, currency)}
        savings={`${formatCurrency(summary.totalSavingsFound ?? 0, currency)}/mo`}
        isOverBudget={(summary.budgetUsedPercent ?? 0) > 100}
      />
    </div>
  );
}
