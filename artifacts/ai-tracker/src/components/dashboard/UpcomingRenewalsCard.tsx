import React from 'react';
import { Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../data/costpilotMockData';

interface RenewalItem {
  vendor: string;
  amount: number;
  date: string;
}

interface UpcomingRenewalsCardProps {
  renewals: RenewalItem[];
}

export const UpcomingRenewalsCard: React.FC<UpcomingRenewalsCardProps> = ({ renewals }) => {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Upcoming Renewals</h3>
        <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
          <Calendar size={16} />
        </button>
      </div>
      
      <div className="space-y-4">
        {renewals.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <CreditCard size={14} />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{item.vendor}</div>
                <div className="text-[9px] text-slate-500 font-medium">{item.date}</div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-white">
              {formatCurrency(item.amount)}
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-2.5 border border-white/[0.08] hover:border-indigo-500/50 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-400 uppercase tracking-widest transition-all flex items-center justify-center gap-2">
        Manage Subscriptions <ArrowRight size={12} />
      </button>
    </div>
  );
};
