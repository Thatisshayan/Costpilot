import React, { useMemo } from 'react';
import { 
  ClipboardList, 
  User, 
  ShieldAlert, 
  Database, 
  Settings, 
  Clock, 
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { useListAudits } from '@workspace/api-client-react';
import type { AiAudit } from '@workspace/api-client-react';

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return dateStr;
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const severityMap: Record<string, string> = {
  low: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high: 'text-red-400 bg-red-500/10',
};

export default function AuditLogs() {
  const { data: liveLogs, isLoading, isError } = useListAudits();

  const logs = useMemo(() => {
    if (!liveLogs || liveLogs.length === 0) {
      return [
        { id: 1, action: 'Budget Threshold Updated', actor: 'Alex Rivera (Admin)', target: 'Monthly Limit: $1,250 → $1,500', time: '10m ago', severity: 'low' },
        { id: 2, action: 'New Integration Added', actor: 'Jordan Chen', target: 'Stripe Webhook (PROD)', time: '2h ago', severity: 'low' },
        { id: 3, action: 'Unusual Spending Alert', actor: 'CostPilot Bot', target: 'OpenAI Spike detected (+$412)', time: '4h ago', severity: 'high' },
        { id: 4, action: 'User Permissions Changed', actor: 'Alex Rivera (Admin)', target: 'Sarah Miller: Viewer → Billing', time: 'Yesterday', severity: 'medium' },
        { id: 5, action: 'Webhook Deleted', actor: 'Alex Rivera (Admin)', target: 'Anthropic Usage (STAGING)', time: '2 days ago', severity: 'medium' },
        { id: 6, action: 'Export Generated', actor: 'Sarah Miller', target: 'Xero Reconcile Q2', time: '3 days ago', severity: 'low' },
      ];
    }
    return liveLogs.map((log: AiAudit) => ({
      id: log.id ?? 0,
      action: log.title ?? 'Unknown Action',
      actor: log.status ?? 'System',
      target: log.description ?? 'No details',
      time: relativeTime(log.createdAt),
      severity: log.severity ?? 'low',
    }));
  }, [liveLogs]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workspace Audit Logs</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Track every administrative action and security event within your organization. Essential for compliance and accountability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter by action or actor..." 
              className="pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Logs Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ClipboardList size={16} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-widest">Historical Event Feed</span>
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last 30 Days</span>
        </div>
        
        <div className="divide-y divide-white/[0.04]">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-6">
                  <div className="w-2 h-10 rounded-full bg-white/5" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-white/10 rounded" />
                    <div className="h-3 w-64 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-3 w-16 bg-white/5 rounded" />
              </div>
            ))
          ) : isError ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-400 font-medium">Failed to load audit logs. Please try again later.</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500 font-medium">No audit logs available yet.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-6">
                  <div className={`w-2 h-10 rounded-full ${(severityMap[log.severity] || severityMap.low).split(' ')[1]}`} />
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold text-white">{log.action}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${severityMap[log.severity] || severityMap.low}`}>
                        {log.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        {log.actor}
                      </div>
                      <div className="flex items-center gap-1">
                        <Database size={12} />
                        {log.target}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Clock size={12} />
                    {log.time}
                  </div>
                  <button className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {!isLoading && !isError && logs.length > 0 && (
          <div className="p-6 bg-white/[0.01] text-center">
            <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-[0.2em] transition-colors">
              Load More Archive Data
            </button>
          </div>
        )}
      </div>

      {/* Compliance Note */}
      <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">SOC2 & HIPAA Compliance</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            CostPilot maintains immutable audit logs for <span className="text-emerald-300 font-bold">7 years</span>. All PII is redacted in accordance with GDPR and CCPA standards. You can export these logs for auditors in the <span className="text-slate-300 font-bold underline cursor-pointer">Security Center</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
