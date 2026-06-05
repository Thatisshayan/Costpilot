import React, { useState, useMemo } from 'react';
import {
  Bot,
  CreditCard,
  Code,
  Cloud,
  Database,
  Sparkles,
  Cpu,
  Zap,
  Plus,
  Bell,
  Key,
  ExternalLink,
  Copy,
  CheckCircle2,
  Settings,
  ShieldCheck,
  RefreshCw,
  Globe,
  Plug,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListPlatforms,
  useCreatePlatform,
  useDeletePlatform,
  useListWebhooks,
  useCreateWebhook,
  getListPlatformsQueryKey,
  getListWebhooksQueryKey,
} from '@workspace/api-client-react';
import type { Platform, Webhook } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

type IntegrationCategory = 'AI Providers' | 'Notifications' | 'Billing';

type IntegrationStatus = 'Connected' | 'Ready' | 'Inactive';

interface IntegrationItem {
  id: string;
  name: string;
  type: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  lastSync: string;
  icon: React.ReactNode;
  description?: string;
  setup: { label: string; value: string }[];
  docUrl?: string;
  source: 'api' | 'fallback';
  platformId?: number;
  webhookId?: number;
}

const FALLBACK_AI_PROVIDERS: IntegrationItem[] = [
  {
    id: 'fallback-openai',
    name: 'OpenAI Usage Listener',
    type: 'LLM Provider',
    category: 'AI Providers',
    status: 'Ready',
    lastSync: 'Never',
    icon: <Bot className="text-[#10a37f]" />,
    description: 'Pipe real-time usage telemetry for instantaneous spend forecasting.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/openai' },
      { label: 'Intelligence Secret', value: 'cp_usage_4829_xyz' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-custom',
    name: 'Custom Usage Relay',
    type: 'API Gateway',
    category: 'AI Providers',
    status: 'Inactive',
    lastSync: 'Never',
    icon: <Code className="text-amber-400" />,
    description: 'Generic listener for custom internal AI tools and API usage.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/custom' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-deepseek',
    name: 'DeepSeek Cost Tracker',
    type: 'LLM Provider',
    category: 'AI Providers',
    status: 'Ready',
    lastSync: 'Never',
    icon: <Cloud className="text-blue-400" />,
    description: 'Monitor DeepSeek API spend and usage patterns in real time.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/deepseek' },
      { label: 'API Key', value: 'ds_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-mistral',
    name: 'Mistral AI Billing Sync',
    type: 'LLM Provider',
    category: 'AI Providers',
    status: 'Connected',
    lastSync: '2h ago',
    icon: <Sparkles className="text-orange-400" />,
    description: 'Sync Mistral API consumption data for unified cost reporting.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/mistral' },
      { label: 'Webhook Secret', value: 'ms_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-groq',
    name: 'Groq Cloud Monitor',
    type: 'LLM Provider',
    category: 'AI Providers',
    status: 'Connected',
    lastSync: '1h ago',
    icon: <Zap className="text-emerald-400" />,
    description: 'Track ultra-low latency inference costs from Groq hardware.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/groq' },
      { label: 'Groq API Key', value: 'gsk_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-togetherai',
    name: 'Together AI Usage Relay',
    type: 'LLM Provider',
    category: 'AI Providers',
    status: 'Ready',
    lastSync: 'Never',
    icon: <Cpu className="text-purple-400" />,
    description: 'Aggregate Together AI model usage and spending data.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/togetherai' },
      { label: 'Together Key', value: 'tog_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-replicate',
    name: 'Replicate Run Costing',
    type: 'API Gateway',
    category: 'AI Providers',
    status: 'Inactive',
    lastSync: 'Never',
    icon: <Database className="text-cyan-400" />,
    description: 'Track Replicate prediction costs and usage across all models.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/replicate' },
      { label: 'Replicate Key', value: 'rpl_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-stability',
    name: 'Stability AI Spend Hub',
    type: 'Image Generator',
    category: 'AI Providers',
    status: 'Ready',
    lastSync: 'Never',
    icon: <RefreshCw className="text-yellow-400" />,
    description: 'Monitor Stability AI image generation costs and API volume.',
    setup: [
      { label: 'Endpoint', value: 'https://api.costpilot.ai/api/webhooks/incoming/stability' },
      { label: 'Stability Key', value: 'stb_cp_••••••••••••••••' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
];

const FALLBACK_WEBHOOKS: IntegrationItem[] = [
  {
    id: 'fallback-wh-slack',
    name: '#ai-alerts-channel',
    type: 'Slack',
    category: 'Notifications',
    status: 'Connected',
    lastSync: 'Just now',
    icon: <Bell className="text-[#4A154B]" />,
    description: 'Budget threshold and anomaly alerts sent to Slack.',
    setup: [
      { label: 'Webhook URL', value: 'https://hooks.slack.com/services/T00/B00/xxx' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
  {
    id: 'fallback-wh-discord',
    name: 'devops-infra',
    type: 'Discord',
    category: 'Notifications',
    status: 'Connected',
    lastSync: '5m ago',
    icon: <Bell className="text-[#5865F2]" />,
    description: 'Infrastructure alerts forwarded to Discord channel.',
    setup: [
      { label: 'Webhook URL', value: 'https://discord.com/api/webhooks/xxx' },
    ],
    docUrl: '#',
    source: 'fallback',
  },
];

const FALLBACK_BILLING: IntegrationItem[] = [
  {
    id: 'billing-stripe',
    name: 'Stripe Billing',
    type: 'Payment Gateway',
    category: 'Billing',
    status: 'Connected',
    lastSync: '3m ago',
    icon: <CreditCard className="text-[#635bff]" />,
    description: 'Automate billing tracking for all AI tools paid via Stripe.',
    setup: [
      { label: 'Webhook URL', value: 'https://api.costpilot.ai/api/webhooks/stripe' },
      { label: 'Signing Secret', value: 'whsec_••••••••••••••••' },
    ],
    docUrl: 'https://stripe.com/docs/webhooks',
    source: 'fallback',
  },
];

const ALL_ICONS: Record<string, React.ReactNode> = {
  openai: <Bot className="text-[#10a37f]" />,
  custom: <Code className="text-amber-400" />,
  deepseek: <Cloud className="text-blue-400" />,
  mistral: <Sparkles className="text-orange-400" />,
  groq: <Zap className="text-emerald-400" />,
  togetherai: <Cpu className="text-purple-400" />,
  replicate: <Database className="text-cyan-400" />,
  stability: <RefreshCw className="text-yellow-400" />,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 'Never';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getHashColor(str: string): string {
  const colors = [
    'bg-[#10a37f]',
    'bg-[#cc9966]',
    'bg-[#1a1b1f]',
    'bg-[#6366f1]',
    'bg-[#ec4899]',
    'bg-[#8b5cf6]',
    'bg-[#f59e0b]',
    'bg-[#0ea5e9]',
    'bg-[#4f6ef7]',
    'bg-[#ff6b4a]',
    'bg-[#ff4405]',
    'bg-[#8b5cf6]',
    'bg-[#ffd700]',
    'bg-[#1a1b2f]',
    'bg-[#4285f4]',
    'bg-[#39594d]',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const CATEGORY_CONFIG: Record<IntegrationCategory, { title: string; description: string }> = {
  'AI Providers': {
    title: 'AI Providers',
    description: 'Connected AI service platforms with usage telemetry.',
  },
  Notifications: {
    title: 'Notification Channels',
    description: 'Channels where CostPilot sends alerts and reports.',
  },
  Billing: {
    title: 'Billing Integrations',
    description: 'Payment providers linked for automated cost tracking.',
  },
};

const CATEGORY_ORDER: IntegrationCategory[] = ['AI Providers', 'Notifications', 'Billing'];

export default function IntegrationsHub() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: livePlatforms, isLoading: platformsLoading, isError: platformsError } = useListPlatforms();
  const { data: liveWebhooks, isLoading: webhooksLoading, isError: webhooksError } = useListWebhooks();
  const createPlatformMutation = useCreatePlatform();
  const deletePlatformMutation = useDeletePlatform();
  const createWebhookMutation = useCreateWebhook();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectType, setConnectType] = useState<'platform' | 'webhook'>('platform');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('LLM Provider');
  const [formApiKey, setFormApiKey] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formWhType, setFormWhType] = useState<'slack' | 'discord'>('slack');
  const [formEvents, setFormEvents] = useState('');

  const isLoading = platformsLoading || webhooksLoading;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const platformToIntegration = (p: Platform): IntegrationItem => {
    const key = p.name.toLowerCase().replace(/[^a-z]/g, '');
    const matchedIcon = Object.entries(ALL_ICONS).find(([k]) => key.includes(k));
    const icon = matchedIcon ? matchedIcon[1] : (
      <div className={`w-8 h-8 rounded-lg ${getHashColor(p.name)} flex items-center justify-center text-white font-bold text-sm`}>
        {p.name.charAt(0).toUpperCase()}
      </div>
    );
    return {
      id: `platform-${p.id}`,
      name: p.name,
      type: p.category || 'AI Provider',
      category: 'AI Providers',
      status: p.apiKey ? 'Connected' : 'Ready',
      lastSync: timeAgo(p.createdAt),
      icon,
      description: p.notes || undefined,
      setup: p.apiKey ? [{ label: 'API Key', value: `${p.apiKey.slice(0, 8)}••••••••` }] : [],
      docUrl: undefined,
      source: 'api',
      platformId: p.id,
    };
  };

  const webhookToIntegration = (w: Webhook): IntegrationItem => ({
    id: `webhook-${w.id}`,
    name: w.name,
    type: w.type === 'slack' ? 'Slack' : 'Discord',
    category: 'Notifications',
    status: w.isActive ? 'Connected' : 'Inactive',
    lastSync: timeAgo(w.createdAt),
    icon: w.type === 'slack' ? <Bell className="text-[#4A154B]" /> : <Bell className="text-[#5865F2]" />,
    description: `Webhook to ${w.type === 'slack' ? 'Slack' : 'Discord'}${w.events ? ` (${w.events})` : ''}`,
    setup: [{ label: 'Webhook URL', value: w.url }],
    docUrl: undefined,
    source: 'api',
    webhookId: w.id,
  });

  const groupedIntegrations = useMemo(() => {
    const groups: Record<IntegrationCategory, IntegrationItem[]> = {
      'AI Providers': [],
      Notifications: [],
      Billing: [],
    };

    const hasLivePlatforms = livePlatforms && livePlatforms.length > 0 && !platformsError;
    const hasLiveWebhooks = liveWebhooks && liveWebhooks.length > 0 && !webhooksError;

    groups['AI Providers'] = hasLivePlatforms
      ? livePlatforms!.map(platformToIntegration)
      : FALLBACK_AI_PROVIDERS;

    groups['Notifications'] = hasLiveWebhooks
      ? liveWebhooks!.map(webhookToIntegration)
      : FALLBACK_WEBHOOKS;

    groups['Billing'] = FALLBACK_BILLING;

    return groups;
  }, [livePlatforms, liveWebhooks, platformsError, webhooksError]);

  const totalCount = Object.values(groupedIntegrations).reduce((sum, items) => sum + items.length, 0);

  const openConnectDialog = (type: 'platform' | 'webhook') => {
    setConnectType(type);
    setFormName('');
    setFormCategory('LLM Provider');
    setFormApiKey('');
    setFormUrl('');
    setFormWhType('slack');
    setFormEvents('');
    setDialogOpen(true);
  };

  const handleConnect = async () => {
    if (connectType === 'platform') {
      if (!formName) {
        toast.error('Platform name is required.');
        return;
      }
      try {
        await createPlatformMutation.mutateAsync({
          data: {
            name: formName,
            category: formCategory,
            apiKey: formApiKey || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
        toast.success(`AI provider "${formName}" connected successfully.`);
        setDialogOpen(false);
      } catch {
        toast.error('Failed to connect AI provider.');
      }
    } else {
      if (!formName || !formUrl) {
        toast.error('Webhook name and URL are required.');
        return;
      }
      try {
        await createWebhookMutation.mutateAsync({
          data: {
            workspaceId: 0,
            name: formName,
            url: formUrl,
            type: formWhType,
            events: formEvents || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
        toast.success(`Notification channel "${formName}" connected.`);
        setDialogOpen(false);
      } catch {
        toast.error('Failed to connect notification channel.');
      }
    }
  };

  const handleDisconnect = async (item: IntegrationItem) => {
    if (item.platformId) {
      try {
        await deletePlatformMutation.mutateAsync({ id: item.platformId });
        qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
        toast.success(`"${item.name}" disconnected.`);
      } catch {
        toast.error('Failed to disconnect platform.');
      }
    } else if (item.webhookId) {
      toast.error('Webhook removal is not available via API.');
    } else {
      toast.error('Cannot disconnect a fallback integration.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Integrations Hub</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Connect your payment providers and AI infrastructure to enable real-time spend intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
            <ShieldCheck size={20} className="text-indigo-400" />
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Enterprise Security Enabled</div>
          </div>
          <button
            onClick={() => openConnectDialog('platform')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15 active:scale-95"
          >
            <Plus size={16} />
            Connect New
          </button>
        </div>
      </header>

      {isLoading && totalCount === 0 ? (
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) => (
            <section key={cat}>
              <Skeleton className="h-5 w-48 bg-white/[0.03] rounded-lg mb-4" />
              <Skeleton className="h-4 w-72 bg-white/[0.02] rounded-lg mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-[220px] rounded-2xl bg-white/[0.02] border border-white/[0.05]"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-20 bg-white/[0.01] border border-white/[0.05] rounded-[2rem]">
          <Plug size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No integrations configured</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Connect AI providers, notification channels, or billing platforms to start tracking costs in real time.
          </p>
          <button
            onClick={() => openConnectDialog('platform')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
          >
            <Plus size={16} />
            Connect Your First Integration
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {CATEGORY_ORDER.map((category) => {
            const items = groupedIntegrations[category];
            if (!items || items.length === 0) return null;
            const config = CATEGORY_CONFIG[category];
            return (
              <section key={category}>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">{config.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{config.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] flex flex-col justify-between h-[230px] group relative overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shadow-inner shrink-0">
                              {item.icon}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-lg leading-tight">{item.name}</h3>
                              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-white/[0.04] border border-white/[0.08] text-indigo-300 inline-block mt-1">
                                {item.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-slate-400 mt-4 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              item.status === 'Connected'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : item.status === 'Ready'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Last sync: {item.lastSync}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/[0.04] pt-4 mt-auto flex justify-between items-center">
                        <button
                          onClick={() => handleDisconnect(item)}
                          className="text-xs font-medium text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} />
                          {item.source === 'api' ? 'Disconnect' : 'Remove'}
                        </button>

                        <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors" title="Configure">
                          <Settings size={14} />
                        </button>
                      </div>

                      <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-indigo-500/[0.03] rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/[0.06] transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Pro Tip Card */}
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-700/20 border border-emerald-500/20 rounded-[2rem] p-8 flex items-center gap-8 animate-in slide-in-from-right-4 duration-1000">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <Zap size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Intelligence Optimization</h3>
              <p className="text-sm text-emerald-200/70 max-w-xl">
                Connecting real-time usage telemetry improves CostPilot's forecasting accuracy by{' '}
                <span className="text-white font-bold">42%</span>. We recommend connecting at least one AI provider and a notification channel for production workloads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connect New Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              Connect New Integration
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setConnectType('platform')}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                connectType === 'platform'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              <Bot size={14} className="inline mr-1.5" />
              AI Provider
            </button>
            <button
              onClick={() => setConnectType('webhook')}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                connectType === 'webhook'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              <Bell size={14} className="inline mr-1.5" />
              Notification
            </button>
          </div>

          <div className="space-y-4 py-2">
            {connectType === 'platform' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Name *</label>
                  <input
                    type="text"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="e.g. OpenAI, Anthropic, Midjourney"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="LLM Provider" className="bg-zinc-950 text-white">LLM Provider</option>
                    <option value="Image Generator" className="bg-zinc-950 text-white">Image Generator</option>
                    <option value="Vector DB" className="bg-zinc-950 text-white">Vector DB</option>
                    <option value="Hosting / Compute" className="bg-zinc-950 text-white">Hosting / Compute</option>
                    <option value="API Gateway" className="bg-zinc-950 text-white">API Gateway</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Key size={12} className="text-indigo-400" /> API Secret Key
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Optional</span>
                  </div>
                  <input
                    type="password"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-emerald-400"
                    placeholder="sk-proj-..."
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channel Name *</label>
                  <input
                    type="text"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="e.g. #ai-alerts"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Webhook URL *</label>
                  <input
                    type="url"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="https://hooks.slack.com/services/..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                  <select
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    value={formWhType}
                    onChange={(e) => setFormWhType(e.target.value as 'slack' | 'discord')}
                  >
                    <option value="slack" className="bg-zinc-950 text-white">Slack</option>
                    <option value="discord" className="bg-zinc-950 text-white">Discord</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Events</label>
                  <input
                    type="text"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="budget_alert"
                    value={formEvents}
                    onChange={(e) => setFormEvents(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4.5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={createPlatformMutation.isPending || createWebhookMutation.isPending}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
            >
              {createPlatformMutation.isPending || createWebhookMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plug size={14} />
                  Connect
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
