import React, { useState } from 'react';
import { 
  Wallet, 
  DollarSign, 
  AlertTriangle, 
  Bell, 
  Percent, 
  Sliders, 
  Plus, 
  Trash2,
  CheckCircle2,
  Clock,
  Shield,
  Send,
  Zap
} from 'lucide-react';

interface Budget {
  id: number;
  name: string;
  limit: number;
  spent: number;
  category: string;
  alertThreshold: number;
  hardStop: boolean;
  active: boolean;
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id: 1,
      name: "OpenAI GPT-4o Inferences",
      limit: 15000,
      spent: 11450,
      category: "LLM Tokens",
      alertThreshold: 80,
      hardStop: true,
      active: true
    },
    {
      id: 2,
      name: "Anthropic Claude Development",
      limit: 5000,
      spent: 1200,
      category: "API Usage",
      alertThreshold: 75,
      hardStop: false,
      active: true
    },
    {
      id: 3,
      name: "Fine-Tuning Experiments",
      limit: 8000,
      spent: 7100,
      category: "Training",
      alertThreshold: 90,
      hardStop: true,
      active: true
    },
    {
      id: 4,
      name: "RAG Document Parsing",
      limit: 3000,
      spent: 850,
      category: "Document Extraction",
      alertThreshold: 80,
      hardStop: false,
      active: true
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newCategory, setNewCategory] = useState("LLM Tokens");
  const [newHardStop, setNewHardStop] = useState(true);

  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallUsagePercent = Math.round((totalSpent / totalLimit) * 100);

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newLimit) return;

    const newBudget: Budget = {
      id: Date.now(),
      name: newName,
      limit: Number(newLimit),
      spent: 0,
      category: newCategory,
      alertThreshold: 80,
      hardStop: newHardStop,
      active: true
    };

    setBudgets([...budgets, newBudget]);
    setNewName("");
    setNewLimit("");
    setShowAddModal(false);
  };

  const handleDeleteBudget = (id: number) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const toggleHardStop = (id: number) => {
    setBudgets(budgets.map(b => b.id === id ? { ...b, hardStop: !b.hardStop } : b));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Smart AI Budgets</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Proactively allocate expenditures, establish warning alerts, and configure hard limits to automatically pause downstream API keys.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 shrink-0"
        >
          <Plus size={18} />
          Create Budget Limit
        </button>
      </header>

      {/* Top Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Allocated Limit</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">${totalLimit.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">Monthly Reset cycle</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Spent</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">${totalSpent.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-400 mt-2 font-bold flex items-center gap-1">
            <Clock size={12} />
            Updated 5m ago
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">${totalRemaining.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">Safe to burn</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilized Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Percent size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{overallUsagePercent}%</div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${overallUsagePercent > 80 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${overallUsagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Budget Progress Columns */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md mb-10">
        <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          <Sliders className="text-indigo-400" size={20} />
          Active Allocations & Quotas
        </h2>

        <div className="space-y-8">
          {budgets.map((b) => {
            const pct = Math.round((b.spent / b.limit) * 100);
            const isCritical = pct > b.alertThreshold;

            return (
              <div key={b.id} className="border border-white/5 bg-white/[0.01] p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-6 justify-between hover:bg-white/[0.02] transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-bold text-white">{b.name}</h3>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-400 rounded-md text-[10px] uppercase font-black tracking-wider">{b.category}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-4">
                    ${b.spent.toLocaleString()} spent out of <span className="text-white font-bold">${b.limit.toLocaleString()} limit</span>
                  </div>

                  <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Burn: {pct}%</span>
                    <span className="text-[10px] text-slate-500">Alert Threshold: {b.alertThreshold}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 border-t border-white/5 lg:border-t-0 pt-4 lg:pt-0">
                  {/* Hard Stop Feature Toggle */}
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1">
                      <Shield size={10} className={b.hardStop ? 'text-indigo-400' : 'text-slate-500'} />
                      Hard Limit
                    </span>
                    <div 
                      onClick={() => toggleHardStop(b.id)}
                      className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${b.hardStop ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/15'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${b.hardStop ? 'left-7' : 'left-1'}`} />
                    </div>
                  </div>

                  {/* Actions */}
                  <button 
                    onClick={() => handleDeleteBudget(b.id)}
                    className="p-3 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all shadow-inner"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Policy & Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Bell size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Incident Channels</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-8">
            Connect alert endpoints to feed cost notifications and automated threshold warnings directly to your dev tools.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">SL</div>
                <div className="text-xs font-bold text-white">#ai-alerts-channel</div>
              </div>
              <span className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-bold uppercase">Slack</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">@</div>
                <div className="text-xs font-bold text-white">devops-infra@costpilot.ai</div>
              </div>
              <span className="text-[9px] px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md font-bold uppercase">Email</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[2.5rem] p-10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Self-Healing Infrastructure</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              When a budget limit triggers its "Hard Stop" policy, CostPilot automatically routes standard inference API queries to cheaper fallback models (such as GPT-4o-mini or Claude 3 Haiku) inside our integrated router middleware instead of completely blocking client queries.
            </p>
          </div>
          <button className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
            Configure Router Failover Policies
            <CheckCircle2 size={16} />
          </button>
        </div>
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">New Budget Quota</h3>
            
            <form onSubmit={handleAddBudget} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Budget Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. OpenAI Production"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly Limit ($)</label>
                <input 
                  type="number" 
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option>LLM Tokens</option>
                  <option>API Usage</option>
                  <option>Training</option>
                  <option>Document Extraction</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-b border-white/5">
                <span className="text-xs font-bold text-white">Enable Hard STOP</span>
                <input 
                  type="checkbox"
                  checked={newHardStop}
                  onChange={(e) => setNewHardStop(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 bg-black border-white/10 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg"
                >
                  Confirm Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
