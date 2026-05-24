import React from 'react';
import { 
  Compass, 
  ArrowRight, 
  Zap, 
  RefreshCcw 
} from 'lucide-react';

interface AICostAuditCardProps {
  onRunAudit: () => void;
  isAuditing: boolean;
  auditStats?: {
    savingsOps: number;
    renewalRisks: number;
    apiSpikes: number;
    overBudget: number;
  };
}

export const AICostAuditCard: React.FC<AICostAuditCardProps> = ({ 
  onRunAudit, 
  isAuditing, 
  auditStats = { savingsOps: 4, renewalRisks: 2, apiSpikes: 1, overBudget: 3 }
}) => {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(99,102,241,0.3)] flex-1">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Compass size={24} className={isAuditing ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-xl font-bold">CostPilot Audit</h2>
              <p className="text-indigo-200 text-xs">
                {isAuditing ? 'Auditing your spend...' : 'Last run: Today, 10:42 AM'}
              </p>
            </div>
          </div>
          {!isAuditing && (
             <button 
              onClick={onRunAudit}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Rerun Audit"
             >
               <RefreshCcw size={16} />
             </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatBox label="Savings Ops" value={auditStats.savingsOps} />
          <StatBox label="Renewal Risks" value={auditStats.renewalRisks} />
          <StatBox label="API Spike" value={auditStats.apiSpikes} color="text-amber-300" />
          <StatBox label="Over Budget" value={auditStats.overBudget} color="text-red-300" />
        </div>

        <div className="space-y-3">
          <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
            Review Savings <ArrowRight size={16} />
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs transition-colors active:scale-95">Set API Limit</button>
            <button className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs transition-colors active:scale-95">Cancel Unused</button>
          </div>
        </div>
      </div>
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: number, color?: string }> = ({ label, value, color = "text-white" }) => (
  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">{label}</div>
  </div>
);
