import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface HeaderAlertProps {
  renewalsCount: number;
  totalAmount: string;
}

export const HeaderAlert: React.FC<HeaderAlertProps> = ({ renewalsCount, totalAmount }) => {
  return (
    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <div className="text-sm font-bold text-white uppercase tracking-wider">Cost Risk Detected</div>
          <div className="text-sm text-red-200/80 italic">
            {renewalsCount} AI tools renew this week. Review before auto-renewal.
          </div>
        </div>
      </div>
      <button 
        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-all uppercase tracking-widest border border-red-500/30 active:scale-95 whitespace-nowrap"
        aria-label={`View ${renewalsCount} upcoming renewals totaling ${totalAmount}`}
      >
        Action Required — {totalAmount} Upcoming
      </button>
    </div>
  );
};
