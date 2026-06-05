import React, { useEffect, useRef, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight 
} from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
  isUrgent?: boolean;
  highlight?: boolean;
  isLoading?: boolean;
  sparklineData?: number[];
}

function useAnimatedNumber(target: string, duration = 800) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const numeric = parseFloat(target.replace(/[^0-9.-]/g, ""));
    if (isNaN(numeric)) {
      setDisplay(target);
      return;
    }

    const prefix = target.match(/^[^0-9.-]+/)?.[0] || "";
    const suffix = target.match(/[^0-9.-]+$/)?.[0] || "";
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;

      setDisplay(`${prefix}${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`);

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return display;
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  subtext, 
  icon, 
  trend, 
  trendValue = "12.7%",
  isUrgent = false, 
  highlight = false,
  isLoading = false,
  sparklineData
}) => {
  const animatedValue = useAnimatedNumber(value);

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-6 animate-pulse">
        <div className="w-10 h-10 bg-white/[0.05] rounded-xl mb-4" />
        <div className="h-8 bg-white/[0.05] rounded-lg mb-2 w-3/4" />
        <div className="h-4 bg-white/[0.05] rounded-lg w-1/2" />
      </div>
    );
  }

  return (
    <div className={`glass-card border ${
      isUrgent 
        ? 'border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.04)] bg-gradient-to-b from-red-500/[0.02] to-transparent' 
        : highlight 
          ? 'border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.04)] bg-gradient-to-b from-indigo-500/[0.02] to-transparent' 
          : 'border-white/[0.06]'
      } rounded-3xl p-6 backdrop-blur-md hover:bg-white/[0.04] hover:shadow-card-hover transition-all group relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform ${highlight ? 'text-indigo-400' : ''}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${trend === 'up' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
            {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white tracking-tight kpi-value">{animatedValue}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</div>
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 h-8">
          <svg viewBox={`0 0 ${sparklineData.length - 1} 32`} className="w-full h-full opacity-40">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-400"
              points={sparklineData.map((d, i) => `${i},${32 - (d / Math.max(...sparklineData)) * 28}`).join(' ')}
            />
          </svg>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/[0.03] text-[10px] font-medium text-slate-500 flex items-center justify-between">
        {subtext}
        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-400" />
      </div>
    </div>
  );
};
