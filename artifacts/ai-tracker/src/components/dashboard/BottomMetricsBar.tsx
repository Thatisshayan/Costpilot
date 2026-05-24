import React from 'react';
import { Gauge } from 'lucide-react';

interface BottomMetricsBarProps {
  apiSpend: string;
  budgetUsed: string;
  forecast: string;
  savings: string;
  isOverBudget?: boolean;
}

export const BottomMetricsBar: React.FC<BottomMetricsBarProps> = ({ 
  apiSpend, 
  budgetUsed, 
  forecast, 
  savings,
  isOverBudget = false
}) => {
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-8 px-4 py-8 border-t border-white/[0.05]">
      <StatusMetric label="API Spend Today" value={apiSpend} />
      <StatusMetric 
        label="Budget Used" 
        value={budgetUsed} 
        icon={<Gauge size={14} />} 
        isUrgent={isOverBudget} 
      />
      <StatusMetric label="Forecasted Month-End" value={forecast} />
      <StatusMetric label="Savings Identified" value={savings} isPositive />
    </footer>
  );
};

const StatusMetric: React.FC<{ label: string, value: string, icon?: React.ReactNode, isPositive?: boolean, isUrgent?: boolean }> = ({ 
  label, value, icon, isPositive = false, isUrgent = false 
}) => (
  <div className="flex items-center gap-3">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">{label}</div>
    <div className={`flex items-center gap-2 text-sm font-bold ${isUrgent ? 'text-red-400' : isPositive ? 'text-emerald-400' : 'text-white'}`}>
      {icon}
      {value}
    </div>
  </div>
);
