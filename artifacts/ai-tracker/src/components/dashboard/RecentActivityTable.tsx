import React from 'react';
import { 
  Filter, 
  MoreHorizontal 
} from 'lucide-react';
import { ActivityLog } from '../../data/costpilotMockData';

interface RecentActivityTableProps {
  activity: ActivityLog[];
  isLoading?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ activity, isLoading = false }) => {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-8 border-b border-white/[0.05] flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Spend Activity & Risk Assessment</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Real-time ledger with intelligence scoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition active:scale-95" aria-label="Filter activity"><Filter size={18} /></button>
          <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition active:scale-95" aria-label="More options"><MoreHorizontal size={18} /></button>
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/[0.1] scrollbar-track-transparent">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-white/[0.01]">
              <th className="py-4 px-8 font-black">Vendor</th>
              <th className="py-4 px-4 font-black">Type</th>
              <th className="py-4 px-4 font-black">Amount</th>
              <th className="py-4 px-4 font-black">Renewal / Date</th>
              <th className="py-4 px-4 font-black">Status</th>
              <th className="py-4 px-8 text-right font-black">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
               [1, 2, 3, 4, 5].map(i => (
                 <tr key={i}>
                   <td className="py-4 px-8"><div className="h-8 bg-white/[0.03] rounded w-32 animate-pulse" /></td>
                   <td className="py-4 px-4"><div className="h-4 bg-white/[0.03] rounded w-20 animate-pulse" /></td>
                   <td className="py-4 px-4"><div className="h-4 bg-white/[0.03] rounded w-16 animate-pulse" /></td>
                   <td className="py-4 px-4"><div className="h-4 bg-white/[0.03] rounded w-24 animate-pulse" /></td>
                   <td className="py-4 px-4"><div className="h-6 bg-white/[0.03] rounded w-20 animate-pulse" /></td>
                   <td className="py-4 px-8"><div className="h-4 bg-white/[0.03] rounded w-12 ml-auto animate-pulse" /></td>
                 </tr>
               ))
            ) : (
              activity.map((row, idx) => (
                <tr key={idx} className="group hover:bg-white/[0.02] transition-colors cursor-default">
                  <td className="py-4 px-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl ${getVendorColor(row.vendor)} flex items-center justify-center font-bold text-white text-xs shadow-lg group-hover:scale-110 transition-transform`}>
                        {row.vendor.charAt(0)}
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{row.vendor}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-400">
                    {row.type}
                  </td>
                  <td className="py-4 px-4 font-mono text-sm font-bold text-white">
                    {row.amount}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-400 font-medium">
                    {row.date}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter ${
                      getStatusStyles(row.status)
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 px-8 text-right">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                      getRiskStyles(row.risk)
                    }`}>
                      {row.risk || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function getStatusStyles(status: string) {
  switch (status) {
    case 'Active': return 'bg-emerald-500/10 text-emerald-400';
    case 'Trial': return 'bg-indigo-500/10 text-indigo-400';
    case 'Renewing': return 'bg-amber-500/10 text-amber-400';
    case 'Infrastructure': return 'bg-violet-500/10 text-violet-400';
    default: return 'bg-slate-500/10 text-slate-400';
  }
}

function getRiskStyles(risk: string) {
  switch (risk) {
    case 'Spike': return 'bg-red-500/20 text-red-400';
    case 'Renewal': return 'bg-amber-500/20 text-amber-400';
    case 'Unused': return 'bg-indigo-500/20 text-indigo-400';
    case 'Duplicate': return 'bg-orange-500/20 text-orange-400';
    default: return 'text-slate-600';
  }
}

function getVendorColor(vendor: string) {
  if (vendor.includes("OpenAI")) return "bg-[#10a37f]";
  if (vendor.includes("Anthropic") || vendor.includes("Claude")) return "bg-[#cc9966]";
  if (vendor.includes("Midjourney")) return "bg-[#1a1b1f]";
  if (vendor.includes("Runway")) return "bg-[#8b5cf6]";
  if (vendor.includes("Cursor")) return "bg-[#10a37f]";
  if (vendor.includes("Perplexity")) return "bg-[#0ea5e9]";
  if (vendor.includes("ElevenLabs")) return "bg-[#ec4899]";
  if (vendor.includes("Vercel")) return "bg-black";
  return "bg-slate-700";
}
