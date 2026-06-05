import React, { useState } from 'react';
import { 
  Link as LinkIcon, 
  Settings, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  Key, 
  ExternalLink,
  Bot,
  CreditCard,
  Code,
  Cloud,
  Database,
  Sparkles,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsHub() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const integrations = [
    {
      id: 'stripe',
      name: 'Stripe Billing',
      description: 'Automate billing tracking for all AI tools paid via Stripe.',
      status: 'Active',
      icon: <CreditCard className="text-[#635bff]" />,
      setup: [
        { label: 'Webhook URL', value: 'https://api.costpilot.ai/api/webhooks/stripe' },
        { label: 'Signing Secret', value: 'whsec_••••••••••••••••' },
      ],
      docUrl: 'https://stripe.com/docs/webhooks'
    },
    {
      id: 'openai',
      name: 'OpenAI Usage Listener',
      description: 'Pipe real-time usage telemetry for instantaneous spend forecasting.',
      status: 'Ready',
      icon: <Bot className="text-[#10a37f]" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/openai' },
        { label: 'Intelligence Secret', value: 'cp_usage_4829_xyz' },
      ],
      docUrl: '#'
    },
    {
      id: 'custom',
      name: 'Custom Usage Relay',
      description: 'Generic listener for custom internal AI tools and API usage.',
      status: 'Inactive',
      icon: <Code className="text-amber-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/custom' },
      ],
      docUrl: '#'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek Cost Tracker',
      description: 'Monitor DeepSeek API spend and usage patterns in real time.',
      status: 'Ready',
      icon: <Cloud className="text-blue-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/deepseek' },
        { label: 'API Key', value: 'ds_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    },
    {
      id: 'mistral',
      name: 'Mistral AI Billing Sync',
      description: 'Sync Mistral API consumption data for unified cost reporting.',
      status: 'Active',
      icon: <Sparkles className="text-orange-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/mistral' },
        { label: 'Webhook Secret', value: 'ms_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    },
    {
      id: 'groq',
      name: 'Groq Cloud Monitor',
      description: 'Track ultra-low latency inference costs from Groq hardware.',
      status: 'Active',
      icon: <Zap className="text-emerald-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/groq' },
        { label: 'Groq API Key', value: 'gsk_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    },
    {
      id: 'togetherai',
      name: 'Together AI Usage Relay',
      description: 'Aggregate Together AI model usage and spending data.',
      status: 'Ready',
      icon: <Cpu className="text-purple-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/togetherai' },
        { label: 'Together Key', value: 'tog_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    },
    {
      id: 'replicate',
      name: 'Replicate Run Costing',
      description: 'Track Replicate prediction costs and usage across all models.',
      status: 'Inactive',
      icon: <Database className="text-cyan-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/replicate' },
        { label: 'Replicate Key', value: 'rpl_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    },
    {
      id: 'stability',
      name: 'Stability AI Spend Hub',
      description: 'Monitor Stability AI image generation costs and API volume.',
      status: 'Ready',
      icon: <RefreshCw className="text-yellow-400" />,
      setup: [
        { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/stability' },
        { label: 'Stability Key', value: 'stb_cp_••••••••••••••••' },
      ],
      docUrl: '#'
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Integrations Hub</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Connect your payment providers and AI infrastructure to enable real-time spend intelligence.
          </p>
        </div>
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
          <ShieldCheck size={20} className="text-indigo-400" />
          <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Enterprise Security Enabled</div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group overflow-hidden relative">
            
            {/* Connection Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  {integration.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{integration.name}</h2>
                  <p className="text-sm text-slate-500 max-w-sm">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  integration.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                  integration.status === 'Ready' ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-slate-500/10 text-slate-500'
                }`}>
                  {integration.status}
                </span>
                <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* Setup Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/[0.05]">
              {integration.setup.map((item) => (
                <div key={item.label} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</label>
                  <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/5 rounded-xl group/field hover:border-indigo-500/30 transition-all">
                    <code className="text-xs text-indigo-300 font-mono truncate flex-1">{item.value}</code>
                    <button 
                      onClick={() => handleCopy(item.value, item.label)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-indigo-400 transition-all opacity-0 group-hover/field:opacity-100"
                    >
                      {copied === item.label ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="mt-8 flex items-center justify-between">
              <a href={integration.docUrl} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
                Setup Documentation <ExternalLink size={12} />
              </a>
              <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">
                Manage Connection
              </button>
            </div>

            {/* Background Accent */}
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
          </div>
        ))}

        {/* Pro Tip Card */}
        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-700/20 border border-emerald-500/20 rounded-[2rem] p-8 flex items-center gap-8 animate-in slide-in-from-right-4 duration-1000">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
            <Zap size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Intelligence Optimization</h3>
            <p className="text-sm text-emerald-200/70 max-w-xl">
              Connecting real-time usage webhooks improves CostPilot's forecasting accuracy by <span className="text-white font-bold">42%</span>. We recommend setting up the OpenAI Usage Listener for all production workloads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
