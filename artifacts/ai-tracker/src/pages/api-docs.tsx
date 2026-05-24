import React from 'react';
import { 
  Code, 
  Terminal, 
  BookOpen, 
  Copy, 
  CheckCircle2, 
  ChevronRight, 
  Search,
  Key,
  Globe,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

export default function ApiDocs() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const endpoints = [
    { method: 'GET', path: '/api/v1/spend/summary', desc: 'Retrieve high-level spend summary for the current month.' },
    { method: 'POST', path: '/api/v1/webhooks/usage', desc: 'Ingest custom usage telemetry from your internal agents.' },
    { method: 'GET', path: '/api/v1/projects/{id}/roi', desc: 'Get calculated ROI metrics for a specific project.' },
    { method: 'POST', path: '/api/v1/budgets/alert', desc: 'Programmatically trigger a budget alert for a team.' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Developer API Portal</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Build custom integrations, automate reporting, or pipe usage telemetry directly into CostPilot's intelligence engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <Key size={18} />
            Generate API Key
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Documentation</div>
            <NavItem icon={<BookOpen size={16} />} label="Introduction" active />
            <NavItem icon={<Lock size={16} />} label="Authentication" />
            <NavItem icon={<Globe size={16} />} label="Rate Limits" />
            <NavItem icon={<Code size={16} />} label="SDKs" />
          </div>
          
          <div className="space-y-4 pt-8 border-t border-white/5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Endpoints</div>
            {endpoints.map(e => (
              <div key={e.path} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                <span className={`text-[8px] font-black w-8 text-center py-0.5 rounded ${
                  e.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {e.method}
                </span>
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-white truncate">{e.path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-12">
          {/* Authentication Section */}
          <section className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-10 backdrop-blur-md">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Lock className="text-indigo-400" size={24} />
              Authentication
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              All API requests must include your workspace secret key in the <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">Authorization</code> header. Keep your keys secret and rotate them periodically.
            </p>
            
            <div className="relative group">
              <div className="bg-black/60 rounded-2xl p-6 font-mono text-sm border border-white/5 overflow-x-auto">
                <div className="text-slate-500 mb-2"># Example Request</div>
                <div className="text-indigo-400">curl <span className="text-slate-300">-X GET</span> "https://api.costpilot.ai/v1/spend/summary" \</div>
                <div className="pl-6 text-indigo-400">-H <span className="text-emerald-400">"Authorization: Bearer YOUR_API_KEY"</span></div>
              </div>
              <button 
                onClick={() => handleCopy('curl -X GET "https://api.costpilot.ai/v1/spend/summary" -H "Authorization: Bearer YOUR_API_KEY"', 'Code snippet')}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
              >
                {copied === 'Code snippet' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </section>

          {/* Quick Start Card */}
          <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
              <Terminal size={40} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">SDKs Available</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">
                Official libraries for <span className="text-white font-bold">Node.js</span>, <span className="text-white font-bold">Python</span>, and <span className="text-white font-bold">Go</span> are now in private beta. Join the waitlist to get early access.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">Join Private Beta</button>
                <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2">
                  View GitHub <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
      active ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
