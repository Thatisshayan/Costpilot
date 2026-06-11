import { BarChart3, Copy, AlertTriangle, DollarSign, LayoutDashboard } from 'lucide-react';

export const REPORT_TEMPLATES = [
  { id: "monthly-spend", name: "Monthly Spend Report", description: "Complete breakdown of all AI spending by provider, project, and category for the month.", formats: ["csv", "pdf"], icon: BarChart3, color: "from-indigo-500/20 to-purple-600/20" },
  { id: "provider-comparison", name: "Provider Cost Comparison", description: "Side-by-side cost comparison across all AI providers with usage metrics.", formats: ["csv", "pdf"], icon: Copy, color: "from-blue-500/20 to-cyan-600/20" },
  { id: "anomaly-summary", name: "Anomaly Detection Summary", description: "All detected cost anomalies, severity levels, and remediation actions taken.", formats: ["pdf"], icon: AlertTriangle, color: "from-red-500/20 to-orange-600/20" },
  { id: "budget-utilization", name: "Budget Utilization Report", description: "Budget vs. actual spend across all projects and categories.", formats: ["csv", "pdf"], icon: DollarSign, color: "from-emerald-500/20 to-teal-600/20" },
  { id: "executive-summary", name: "Executive Summary", description: "High-level KPIs, trends, and savings opportunities for leadership.", formats: ["pdf"], icon: LayoutDashboard, color: "from-violet-500/20 to-pink-600/20" },
];

export const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This Month", days: 0, type: "this-month" as const },
  { label: "Last Month", days: 0, type: "last-month" as const },
  { label: "Custom", days: 0, type: "custom" as const },
];

export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function getDateRange(preset: typeof DATE_PRESETS[number]): { start: string; end: string } | undefined {
  const now = new Date();
  if (preset.type === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: formatDate(start), end: formatDate(now) };
  }
  if (preset.type === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: formatDate(start), end: formatDate(end) };
  }
  return undefined;
}

export const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444"];

export function ReportMetric({ label, value, sub, positive = false, urgent = false }: {
  label: string;
  value: string | number;
  sub: string;
  positive?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2rem] p-8 space-y-2">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-black tracking-tighter ${urgent ? 'text-red-400' : positive ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{sub}</div>
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2rem] p-8 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded" />
      <div className="h-8 w-36 bg-white/10 rounded" />
      <div className="h-3 w-28 bg-white/10 rounded" />
    </div>
  );
}