import React from 'react';
import { 
  Cpu, 
  Activity, 
  Zap, 
  ZapOff, 
  TrendingDown, 
  ArrowRight, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  HardDrive,
  BarChart3,
  Flame,
  Loader2
} from 'lucide-react';
import { useGetTelemetryGpu } from '@workspace/api-client-react';

import { formatCurrency } from '../lib/currency';

export default function GpuWasteDetector() {
  const { data: telemetry, isLoading } = useGetTelemetryGpu();

  const fallbackClusters = [
    { name: 'Training Cluster A', gpu: '8x H100 (80GB)', util: '42%', waste: formatCurrency(1420), status: 'Warning' },
    { name: 'Inference Edge V1', gpu: '4x A100 (40GB)', util: '88%', waste: formatCurrency(120), status: 'Healthy' },
    { name: 'Research Sandbox', gpu: '2x L40S', util: '12%', waste: formatCurrency(450), status: 'Critical' },
  ];

  const clusters = telemetry?.clusters?.map((c: any) => {
    const dailyWaste = c.costPerHour * 24 * (1 - c.utilization/100);
    return {
      name: c.name,
      gpu: c.id.includes('h100') ? '8x H100 (80GB)' : '4x A100 (40GB)',
      util: `${c.utilization}%`,
      waste: formatCurrency(dailyWaste),
      status: c.utilization < 20 ? 'Critical' : c.utilization < 50 ? 'Warning' : 'Healthy'
    };
  }) || fallbackClusters;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Cpu size={18} />
            </div>
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Compute Efficiency Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">GPU Waste Detector</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Deep-level telemetry for H100/A100 clusters. Identify idle GPU memory, low SM utilization, and power-inefficient workloads to maximize your compute ROI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">{formatCurrency(1990)} Potential Daily Saving</span>
          </div>
        </div>
      </header>

      {/* Cluster Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {isLoading ? (
          <div className="col-span-full h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={48} />
          </div>
        ) : clusters.map((c: any) => (
          <div key={c.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md relative group overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                c.status === 'Critical' ? 'bg-red-500/20 text-red-400' : 
                c.status === 'Warning' ? 'bg-orange-500/20 text-orange-400' : 
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                <Activity size={24} />
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                c.status === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                c.status === 'Warning' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {c.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{c.name}</h3>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{c.gpu}</div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SM Utilization</span>
                  <span className="text-xs font-bold text-white">{c.util}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${
                    parseInt(c.util) < 30 ? 'bg-red-500' : 
                    parseInt(c.util) < 60 ? 'bg-orange-500' : 
                    'bg-emerald-500'
                  }`} style={{ width: c.util }} />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Daily Waste</span>
                <span className={`text-sm font-mono font-bold ${parseInt(c.waste.replace('$', '')) > 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {c.waste}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deep Telemetry Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">GPU Memory vs. Compute (SM)</h2>
              <p className="text-xs text-slate-500">Correlation of memory allocation against active calculation.</p>
            </div>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Export NVLink Logs</button>
          </div>
          <div className="h-72 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 italic text-xs">
            High-Resolution Compute Heatmap
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-orange-600/20 to-red-700/20 border border-orange-500/20 rounded-[3rem] p-10">
            <h3 className="text-lg font-bold text-white mb-6">Autonomous Fix</h3>
            <p className="text-sm text-orange-100/70 leading-relaxed mb-8 italic">
              "Research Sandbox is currently idle with <span className="text-white font-bold">160GB VRAM</span> allocated. Auto-Pilot can temporarily de-provision these GPUs and save <span className="text-white font-bold">$18.75/hr</span>."
            </p>
            <button className="w-full py-4 bg-white text-orange-600 rounded-2xl font-bold text-xs hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-lg">
              Kill Idle Instances <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Hardware Health</h3>
            <div className="space-y-4">
              <HealthRow label="PUE Ratio" value="1.08" status="good" />
              <HealthRow label="ECC Errors" value="0" status="good" />
              <HealthRow label="Thermal Headroom" value="12°C" status="warning" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, status }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
    </div>
  );
}
