import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SpendBreakdownChartProps {
  data: any[];
  isLoading?: boolean;
}

export const SpendBreakdownChart: React.FC<SpendBreakdownChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 h-[400px] flex items-center justify-center animate-pulse">
        <div className="text-slate-500 font-medium italic">Simulating intelligence scan...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Consolidated Spend Analytics</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Tracking Subscriptions vs API Infrastructure</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <LegendItem color="bg-indigo-500" label="SaaS" />
          <LegendItem color="bg-violet-500" label="API" />
          <LegendItem color="border border-dashed border-slate-500" label="Forecast" />
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 10}} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 10}} 
              tickFormatter={(value) => `$${value}`} 
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#09090b', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
              labelStyle={{fontSize: '11px', color: '#94a3b8', marginBottom: '8px'}}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Area 
              type="monotone" 
              dataKey="subscriptionSpend" 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill="url(#colorSubs)" 
              strokeWidth={3} 
              animationDuration={1500}
            />
            <Area 
              type="monotone" 
              dataKey="apiUsageSpend" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorApi)" 
              strokeWidth={3} 
              animationDuration={2000}
            />
            <Area 
              type="monotone" 
              dataKey="forecastSpend" 
              stroke="#94a3b8" 
              fillOpacity={0} 
              strokeWidth={2} 
              strokeDasharray="5 5" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string, label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);
