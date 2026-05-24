import React from 'react';
import { 
  Gauge, 
  AlertCircle 
} from 'lucide-react';

interface BudgetForecastCardProps {
  forecast: number;
  budget: number;
  usedPercent: number;
}

export const BudgetForecastCard: React.FC<BudgetForecastCardProps> = ({ 
  forecast, 
  budget, 
  usedPercent 
}) => {
  const isOver = forecast > budget;
  const overage = forecast - budget;

  return (
    <div className={`bg-white/[0.02] border ${isOver ? 'border-red-500/30' : 'border-white/[0.05]'} rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Budget Velocity</h3>
          <div className="text-2xl font-bold text-white tracking-tight">
            {usedPercent}% Used
          </div>
        </div>
        <div className={`p-2 rounded-xl ${isOver ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          <Gauge size={20} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs font-medium">
          <div className="text-slate-500">
            Budget: <span className="text-white font-bold">${budget.toLocaleString()}</span>
          </div>
          <div className={isOver ? 'text-red-400' : 'text-emerald-400'}>
            Forecast: <span className="font-bold">${forecast.toLocaleString()}</span>
          </div>
        </div>

        {isOver && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <div className="text-[10px] font-bold text-red-200 uppercase tracking-wider">
              ${overage.toLocaleString()} over budget detected
            </div>
          </div>
        )}
      </div>
      
      {/* Background glow */}
      {isOver && <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />}
    </div>
  );
};
