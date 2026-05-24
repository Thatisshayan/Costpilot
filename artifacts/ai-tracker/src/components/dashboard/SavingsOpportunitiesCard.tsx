import React from 'react';
import { 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import { SavingsOpportunity } from '../../data/costpilotMockData';

interface SavingsOpportunitiesCardProps {
  opportunities: SavingsOpportunity[];
  isLoading?: boolean;
}

export const SavingsOpportunitiesCard: React.FC<SavingsOpportunitiesCardProps> = ({ 
  opportunities, 
  isLoading = false 
}) => {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-md flex-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Intelligence Opportunities</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Actionable insights to reduce overhead</p>
        </div>
        <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-2 py-1">
          View All Insights
        </button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-white/[0.03] border border-white/[0.08] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((op) => (
            <div 
              key={op.id} 
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-indigo-500/40 transition-all group relative overflow-hidden cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Savings opportunity: ${op.issue}. Impact: ${op.impact}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                  op.confidence > 0.95 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {Math.round(op.confidence * 100)}% Confidence
                </div>
                <div className="text-xs font-bold text-white">{op.impact}</div>
              </div>
              <h4 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{op.issue}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{op.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium italic border-t border-white/[0.05] pt-3">
                <AlertCircle size={10} /> {op.evidence}
              </div>
              <button className="absolute bottom-4 right-4 p-2 rounded-lg bg-indigo-500/10 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0" aria-hidden="true">
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
