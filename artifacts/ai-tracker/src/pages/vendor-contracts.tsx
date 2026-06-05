import React, { useMemo } from 'react';
import { 
  Handshake, 
  FileText, 
  Calendar, 
  TrendingDown, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Plus,
  Settings,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useListPlatforms, useListSubscriptions } from '@workspace/api-client-react';
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_CONTRACTS = [
  { id: 1, vendor: 'OpenAI Enterprise', plan: 'Enterprise', value: '$25,000/yr', period: 'Jan 2026 - Jan 2027', status: 'Active', commitment: 'Used 42%' },
  { id: 2, vendor: 'Anthropic Pro (SLA)', plan: 'Pro', value: '$5,000/yr', period: 'March 2026 - March 2027', status: 'Renewing', commitment: 'Used 12%' },
  { id: 3, vendor: 'Google Cloud (Commit)', plan: 'Commitment', value: '$100,000/yr', period: 'Jan 2025 - Jan 2027', status: 'Healthy', commitment: 'Used 88%' },
];

export default function VendorContracts() {
  const { data: livePlatforms, isLoading: platformsLoading } = useListPlatforms();
  const { data: liveSubscriptions, isLoading: subsLoading } = useListSubscriptions();

  const isLoading = platformsLoading || subsLoading;

  const platforms = useMemo(() => {
    if (!livePlatforms || livePlatforms.length === 0 || !liveSubscriptions || liveSubscriptions.length === 0) {
      return null;
    }
    return livePlatforms.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? '',
      subscriptions: liveSubscriptions
        .filter((s: any) => s.platformId === p.id || s.platformName === p.name)
        .map((s: any) => ({
          id: s.id,
          plan: s.planName ?? 'Standard',
          monthlyCost: s.monthlyCost ?? 0,
          status: s.status ?? 'active',
          renewalDate: s.renewalDate ?? null,
        })),
    })).filter((p: any) => p.subscriptions.length > 0);
  }, [livePlatforms, liveSubscriptions]);

  const statusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s === 'renewing') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Vendor Contracts & Commitments</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Manage your annual commitments and enterprise AI contracts. Track usage against minimum spend requirements and stay ahead of renewals.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          Add Contract
        </button>
      </header>

      {/* Contract Feed */}
      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <Skeleton className="w-16 h-16 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right space-y-2">
                    <Skeleton className="h-3 w-20 ml-auto" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/[0.05]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : platforms && platforms.length > 0 ? (
          platforms.map((platform: any) => (
            <div key={platform.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                    <Building size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{platform.name}</h2>
                    {platform.category && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{platform.category}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {platform.subscriptions.map((sub: any) => (
                  <div key={sub.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{sub.plan}</div>
                        {sub.renewalDate && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                            <Calendar size={10} />
                            Renews: {new Date(sub.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly Cost</div>
                        <div className="text-lg font-black text-white">${(sub.monthlyCost ?? 0).toFixed(2)}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${statusStyle(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Fallback to mock data */
          MOCK_CONTRACTS.map((c) => (
            <div key={c.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                    <Handshake size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-white">{c.vendor}</h2>
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${statusStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar size={12} />
                        {c.period}
                      </div>
                      <div className="flex items-center gap-1 font-black text-indigo-300 uppercase tracking-widest text-[9px]">
                        <Zap size={10} />
                        {c.commitment}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contract Value</div>
                    <div className="text-xl font-black text-white">{c.value}</div>
                  </div>
                  <button className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/[0.05]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ContractDetail label="SLA Uptime" value="99.9%" />
                  <ContractDetail label="Credit Multiplier" value="1.2x" />
                  <ContractDetail label="Notice Period" value="30 Days" />
                </div>
              </div>
            </div>
          ))
        )}

        {!isLoading && !platforms && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-12 backdrop-blur-md text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-6">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Contracts Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Connect your first platform or add a contract to start tracking vendor commitments and renewals.
            </p>
            <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all shadow-lg inline-flex items-center gap-2">
              <Plus size={18} />
              Add Your First Contract
            </button>
          </div>
        )}
      </div>

      {/* Renewal Alert */}
      <div className="mt-8 p-8 bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <AlertCircle size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">Renewal Intelligence</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Your <span className="text-white font-bold">Anthropic Pro</span> contract renews in <span className="text-amber-400 font-bold">14 days</span>. Based on current usage, we recommend upgrading to the <span className="text-indigo-300 font-bold uppercase tracking-widest italic underline underline-offset-4">Enterprise Tier</span> to unlock volume discounts.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2">
              Start Negotiation Deck <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDetail({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}
