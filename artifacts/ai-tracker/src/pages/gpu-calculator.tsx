import React, { useState } from 'react';
import { 
  Cpu, 
  Server, 
  Zap, 
  TrendingDown, 
  ArrowRight, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  HardDrive
} from 'lucide-react';

export default function GpuCalculator() {
  const [gpuType, setGpuType] = useState('H100');
  
  const comparisons = [
    { provider: 'Lambda Labs', hourly: 2.15, monthly: 1548, availability: 'Medium' },
    { provider: 'AWS (p5.48xlarge)', hourly: 98.32, monthly: 70790, availability: 'High' },
    { provider: 'RunPod', hourly: 2.05, monthly: 1476, availability: 'Low' },
    { provider: 'CoreWeave', hourly: 2.10, monthly: 1512, availability: 'Medium' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Self-Hosted GPU Estimator</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Calculate the cost of running models on dedicated hardware. Compare hourly rates across cloud GPU providers vs. managed API endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
            <Server size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Active Sim: 8x H100 Cluster</span>
          </div>
        </div>
      </header>

      {/* Calculator Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Hardware Config</h3>
            <div className="space-y-4">
              <SelectGroup label="GPU Model" value={gpuType} options={['H100', 'A100 (80GB)', 'L40S', 'A10G']} onChange={setGpuType} />
              <ConfigInput label="GPU Count" value="8" />
              <ConfigInput label="Est. Utilization" value="65%" />
              <ConfigInput label="Electricity Rate" value="$0.12/kWh" />
            </div>
            
            <button className="w-full mt-10 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2">
              Recalculate Estimates <Zap size={14} />
            </button>
          </div>
        </div>

        {/* Results Canvas */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Managed API Equivalent</div>
                <div className="text-3xl font-black text-white">$12,450<span className="text-lg font-medium text-slate-400">/mo</span></div>
                <p className="text-xs text-slate-500 mt-2">Based on current token volume.</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Self-Hosted Estimate</div>
                <div className="text-3xl font-black text-indigo-400">$6,200<span className="text-lg font-medium text-slate-400">/mo</span></div>
                <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
                  <TrendingDown size={14} /> 50.2% Potential Savings
                </p>
              </div>
            </div>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-md">
            <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Market Rate Comparison</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">On-Demand Rates</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/[0.01] border-b border-white/[0.05]">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="py-6 px-8">Cloud Provider</th>
                  <th className="py-6 px-4">Hourly Rate</th>
                  <th className="py-6 px-4">Monthly (Est)</th>
                  <th className="py-6 px-8 text-right">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {comparisons.map((c) => (
                  <tr key={c.provider} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                          <HardDrive size={16} />
                        </div>
                        <span className="text-sm font-bold text-white">{c.provider}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-sm font-mono font-bold text-white">${c.hourly.toFixed(2)}</td>
                    <td className="py-5 px-4 text-sm font-mono font-bold text-white">${c.monthly.toLocaleString()}</td>
                    <td className="py-5 px-8 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        c.availability === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.availability === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {c.availability}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectGroup({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
      >
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ConfigInput({ label, value }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <input 
        type="text" 
        value={value}
        readOnly
        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
      />
    </div>
  );
}
