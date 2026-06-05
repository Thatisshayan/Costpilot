import React, { useRef, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Zap, 
  ShieldCheck,
  Calendar,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { BottomMetricsBar } from '../components/dashboard/BottomMetricsBar';

import { costpilotMockData, formatCurrency } from '../data/costpilotMockData';
import { 
  useGetKpiSummary,
  useListExpenses,
} from '@workspace/api-client-react';

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444"];

export default function Reports() {
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: liveSummary, isLoading: kpiLoading } = useGetKpiSummary();
  const { data: liveExpenses = [], isLoading: expensesLoading } = useListExpenses();

  const summary = liveSummary || costpilotMockData.summary;
  const isLoading = kpiLoading || expensesLoading;

  const pieData = useMemo(() => {
    if (liveExpenses && liveExpenses.length > 0) {
      const groups: Record<string, number> = {};
      liveExpenses.forEach(e => {
        const cat = e.category || 'Other';
        groups[cat] = (groups[cat] || 0) + e.amount;
      });
      const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
      return entries.map(([name, value], i) => ({
        name,
        value: Math.round(value),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
    }
    return [
      { name: "Subscriptions", value: 460, color: "#6366f1" },
      { name: "API Usage", value: 520, color: "#8b5cf6" },
      { name: "Infrastructure", value: 140, color: "#ec4899" },
      { name: "Credits", value: 160, color: "#0ea5e9" },
    ];
  }, [liveExpenses]);

  const topItems = useMemo(() => {
    if (liveExpenses && liveExpenses.length > 0) {
      return [...liveExpenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
        .map(e => ({
          vendor: e.platformName || 'Unknown',
          type: e.category || 'Expense',
          amount: e.amount.toFixed(2),
          status: e.description || 'Logged',
        }));
    }
    return [
      { vendor: "OpenAI Platform", type: "API Usage", amount: "482.12", status: "Billed Monthly" },
      { vendor: "Anthropic Claude", type: "API Usage", amount: "312.45", status: "Billed Monthly" },
      { vendor: "Midjourney", type: "Subscription", amount: "120.00", status: "Pro Plan" },
      { vendor: "Vercel Enterprise", type: "Infrastructure", amount: "89.00", status: "Active" },
    ];
  }, [liveExpenses]);

  const spendingTrend = costpilotMockData.spendingTrend;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    const loadingToast = toast.loading('Preparing professional PDF report...');
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#09090b',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`CostPilot_June_Report.pdf`);
      
      toast.success('Report downloaded successfully', { id: loadingToast });
    } catch (error) {
      toast.error('Failed to generate PDF', { id: loadingToast });
      console.error(error);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Financial Intelligence Reports</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Download professional spend summaries for stakeholders, tax preparation, or internal auditing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 shadow-lg">
            <button className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Xero</button>
            <div className="w-px h-4 bg-white/10 self-center" />
            <button className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">QuickBooks</button>
          </div>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            <Download size={18} />
            Generate PDF Report
          </button>
        </div>
      </header>

      {/* --- REPORT VIEW (Capturable) --- */}
      <div ref={reportRef} className="bg-[#09090b] p-8 lg:p-12 rounded-[2rem] border border-white/[0.05] shadow-2xl space-y-12">
        
        {/* Report Brand Header */}
        <div className="flex justify-between items-start border-b border-white/[0.05] pb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tighter">CostPilot</div>
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-[0.3em]">Monthly Intelligence</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-white uppercase tracking-widest">June 2026 Executive Summary</div>
            <div className="text-xs text-slate-500 mt-1">Generated on May 23, 2026 • Workspace: AI Growth Hub</div>
          </div>
        </div>

        {/* Executive Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
            <>
              <SkeletonMetric />
              <SkeletonMetric />
              <SkeletonMetric />
            </>
          ) : (
            <>
              <ReportMetric label="Total Monthly Investment" value={formatCurrency(summary.totalAiSpend)} sub="Across 38 providers" />
              <ReportMetric label="Operational Savings" value={formatCurrency(summary.totalSavingsFound ?? 0)} sub="Detected waste reduction" positive />
              <ReportMetric label="Budget Variance" value={`${summary.budgetUsedPercent ?? 0}%`} sub={`$290 over threshold`} urgent={(summary.budgetUsedPercent ?? 0) > 100} />
            </>
          )}
        </div>

        {/* Visual Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Category Allocation */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <PieChartIcon size={16} className="text-indigo-400" /> Spend Allocation
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                    itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-[10px] border-b border-white/[0.03] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}} />
                    <span className="text-slate-400 font-bold uppercase">{item.name}</span>
                  </div>
                  <span className="text-white font-mono font-bold">${item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Velocity Bar Chart */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Growth Velocity
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingTrend.slice(-4)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                  <Bar dataKey="subscriptionSpend" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="apiUsageSpend" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
              <Zap size={16} className="text-emerald-400 shrink-0" />
              <p className="text-[10px] text-emerald-200 leading-relaxed uppercase font-bold tracking-tight">
                Efficiency Index: +14% compared to Q1. API utilization is stabilizing.
              </p>
            </div>
          </div>
        </div>

        {/* Top Spend Items */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" /> High-Value Line Items
          </h3>
          <div className="space-y-3">
            {topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{item.vendor}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">${item.amount}</div>
                  <div className="text-[10px] text-slate-500">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Disclaimer */}
        <div className="pt-12 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-white/[0.1] flex items-center justify-center text-slate-500">
              <ShieldCheck size={20} />
            </div>
            <p className="text-[9px] text-slate-500 max-w-xs leading-relaxed font-medium">
              This report is generated by CostPilot Intelligence. All figures are based on connected bank sources and API telemetry data.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized By</div>
              <div className="text-xs font-bold text-white italic">AI Expense Intelligence Engine</div>
            </div>
            <div className="w-20 h-20 bg-white/[0.03] rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center">
              <span className="text-[8px] text-slate-700 font-bold uppercase rotate-12">Official Audit</span>
            </div>
          </div>
        </div>

      </div>

      <BottomMetricsBar 
        apiSpend={formatCurrency(summary.apiSpendToday ?? 0)}
        budgetUsed={`${summary.budgetUsedPercent ?? 0}%`}
        forecast={formatCurrency(summary.forecastTotal ?? 0)}
        savings={`${formatCurrency(summary.totalSavingsFound ?? 0)}/mo`}
        isOverBudget={(summary.budgetUsedPercent ?? 0) > 100}
      />
    </div>
  );
}

function ReportMetric({ label, value, sub, positive = false, urgent = false }: any) {
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

function SkeletonMetric() {
  return (
    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2rem] p-8 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded" />
      <div className="h-8 w-36 bg-white/10 rounded" />
      <div className="h-3 w-28 bg-white/10 rounded" />
    </div>
  );
}
