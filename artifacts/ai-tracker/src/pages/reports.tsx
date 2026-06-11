import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import {
  Download,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  Zap,
  ShieldCheck,
  Calendar,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  DollarSign,
  LayoutDashboard,
  Clock,
  Copy,
  X,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  FileIcon as FilePdf,
  Send,
  History,
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
  Pie,
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { BottomMetricsBar } from '../components/dashboard/BottomMetricsBar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

import { costpilotMockData, formatCurrency } from '../data/costpilotMockData';
import {
  useGetKpiSummary,
  useListExpenses,
  customFetch,
} from '@workspace/api-client-react';
import {
  PIE_COLORS,
  REPORT_TEMPLATES,
  DATE_PRESETS,
  formatDate,
  getDateRange,
  ReportMetric,
  SkeletonMetric,
} from './reports-utils';

interface ScheduledReport {
  id: string;
  templateId: string;
  format: string;
  frequency: string;
  recipients: string[];
  status: string;
}

interface RecentReport {
  id: string;
  templateId: string;
  format: string;
  name: string;
  date: string;
}

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

  const [generateOpen, setGenerateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "pdf">("pdf");
  const [datePreset, setDatePreset] = useState<string>("last-30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);

  const [schedTemplate, setSchedTemplate] = useState("monthly-spend");
  const [schedFormat, setSchedFormat] = useState<"csv" | "pdf">("pdf");
  const [schedFrequency, setSchedFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const [scheduledList, setScheduledList] = useState<ScheduledReport[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);

  useEffect(() => {
    customFetch<ScheduledReport[]>("/api/reports/scheduled")
      .then(setScheduledList)
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("costpilot_recent_reports");
      if (stored) setRecentReports(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecentReports = useCallback((list: RecentReport[]) => {
    setRecentReports(list);
    localStorage.setItem("costpilot_recent_reports", JSON.stringify(list));
  }, []);

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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`CostPilot_June_Report.pdf`);
      toast.success('Report downloaded successfully', { id: loadingToast });
    } catch (error) {
      toast.error('Failed to generate PDF', { id: loadingToast });
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    setGenerating(true);
    const loadingToast = toast.loading("Generating report...");
    try {
      let dateRange: { start: string; end: string } | undefined;
      const preset = DATE_PRESETS.find(p => {
        const key = p.type ? `custom` : p.label.toLowerCase().replace(/\s+/g, "-");
        const val = p.type === "this-month" ? "this-month" : p.type === "last-month" ? "last-month" : p.type === "custom" ? "custom" : `last-${p.days}`;
        return val === datePreset;
      }) || DATE_PRESETS[1];
      if (preset.type === "custom") {
        if (!customStart || !customEnd) {
          toast.error("Please select a custom date range", { id: loadingToast });
          setGenerating(false);
          return;
        }
        dateRange = { start: customStart, end: customEnd };
      } else {
        dateRange = getDateRange(preset);
      }

      const response = await customFetch<Blob>("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          format: selectedFormat,
          dateRange,
        }),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTemplate}-${Date.now()}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const template = REPORT_TEMPLATES.find(t => t.id === selectedTemplate);
      saveRecentReports([
        { id: `recent-${Date.now()}`, templateId: selectedTemplate, format: selectedFormat, name: template?.name || selectedTemplate, date: new Date().toISOString() },
        ...recentReports.slice(0, 19),
      ]);

      toast.success("Report generated and downloaded", { id: loadingToast });
      setGenerateOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate report", { id: loadingToast });
    } finally {
      setGenerating(false);
    }
  };

  const handleScheduleNew = async () => {
    if (!schedRecipients.trim()) {
      toast.error("Please enter at least one recipient email");
      return;
    }
    const recipients = schedRecipients.split(",").map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Please enter at least one recipient email");
      return;
    }
    setScheduling(true);
    const loadingToast = toast.loading("Scheduling report...");
    try {
      const result = await customFetch<{ id: string }>("/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: schedTemplate,
          format: schedFormat,
          frequency: schedFrequency,
          recipients,
        }),
      });
      setScheduledList(prev => [...prev, { ...result, templateId: schedTemplate, format: schedFormat, frequency: schedFrequency, recipients, status: "active" }]);
      toast.success("Report scheduled successfully", { id: loadingToast });
      setScheduleOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule report", { id: loadingToast });
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    const loadingToast = toast.loading("Cancelling schedule...");
    try {
      await customFetch(`/api/reports/scheduled/${id}`, { method: "DELETE" });
      setScheduledList(prev => prev.filter(r => r.id !== id));
      toast.success("Schedule cancelled", { id: loadingToast });
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel schedule", { id: loadingToast });
    }
  };

  const handleDownloadRecent = async (report: RecentReport) => {
    const loadingToast = toast.loading("Downloading report...");
    try {
      const response = await customFetch<Blob>("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: report.templateId,
          format: report.format,
        }),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.templateId}-${Date.now()}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded", { id: loadingToast });
    } catch (err: any) {
      toast.error(err?.message || "Failed to download", { id: loadingToast });
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

      {/* ===== SECTION 1: Report Templates ===== */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <FileText size={20} className="text-indigo-400" /> Report Templates
          </h2>
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-indigo-500/30 text-indigo-300">
                <Clock size={14} /> Schedule New
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0c0c0f] border-white/[0.08] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">Schedule Recurring Report</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Configure a report to be sent automatically to selected recipients.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Template</Label>
                  <Select value={schedTemplate} onValueChange={setSchedTemplate}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c0c0f] border-white/[0.08] text-white">
                      {REPORT_TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/5">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Format</Label>
                  <div className="flex gap-2">
                    {(["csv", "pdf"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setSchedFormat(f)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${schedFormat === f ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"}`}
                      >
                        {f === "csv" ? <FileSpreadsheet size={14} /> : <FilePdf size={14} />}
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Frequency</Label>
                  <Select value={schedFrequency} onValueChange={(v: any) => setSchedFrequency(v)}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c0c0f] border-white/[0.08] text-white">
                      <SelectItem value="daily" className="text-white hover:bg-white/5">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-white/5">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-white hover:bg-white/5">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Recipients (comma-separated)</Label>
                  <Input
                    value={schedRecipients}
                    onChange={e => setSchedRecipients(e.target.value)}
                    placeholder="admin@example.com, team@example.com"
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleOpen(false)} className="border-white/[0.08] text-slate-400">Cancel</Button>
                <Button onClick={handleScheduleNew} disabled={scheduling} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                  {scheduling ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {scheduling ? "Scheduling..." : "Schedule Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {REPORT_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.id}
                className="group bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 backdrop-blur-md hover:bg-white/[0.04] transition-all relative overflow-hidden cursor-pointer"
                onClick={() => { setSelectedTemplate(tpl.id); setSelectedFormat(tpl.formats.includes("pdf") ? "pdf" : "csv"); setGenerateOpen(true); }}
              >
                <div className={`absolute top-[-30%] right-[-30%] w-32 h-32 rounded-full bg-gradient-to-br ${tpl.color} blur-3xl pointer-events-none`} />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-all">
                    <Icon size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-all" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{tpl.name}</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4 line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center gap-2">
                    {tpl.formats.map(f => (
                      <Badge key={f} variant="outline" className="text-[9px] uppercase tracking-widest font-bold border-white/[0.08] text-slate-400">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                    Generate <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECTION 2: Generate Report Modal ===== */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-[#0c0c0f] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Generate Report</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Configure and download your custom report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c0c0f] border-white/[0.08] text-white">
                  {REPORT_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/5">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Format</Label>
              <div className="flex gap-2">
                {(["csv", "pdf"] as const).map(f => {
                  const tpl = REPORT_TEMPLATES.find(t => t.id === selectedTemplate);
                  const disabled = tpl && !tpl.formats.includes(f);
                  return (
                    <button
                      key={f}
                      disabled={disabled}
                      onClick={() => setSelectedFormat(f)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${selectedFormat === f ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"}`}
                    >
                      {f === "csv" ? <FileSpreadsheet size={14} /> : <FilePdf size={14} />}
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Date Range</Label>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0c0c0f] border-white/[0.08] text-white">
                  {DATE_PRESETS.map(p => {
                    const val = p.type === "this-month" ? "this-month" : p.type === "last-month" ? "last-month" : p.type === "custom" ? "custom" : `last-${p.days}`;
                    return <SelectItem key={val} value={val} className="text-white hover:bg-white/5">{p.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-widest">Start</Label>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-widest">End</Label>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} className="border-white/[0.08] text-slate-400">Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || !selectedTemplate} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
              {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {generating ? "Generating..." : "Generate & Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SECTION 3: Scheduled Reports ===== */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
          <Clock size={20} className="text-indigo-400" /> Scheduled Reports
        </h2>
        {scheduledList.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-10 text-center">
            <Clock size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 font-medium">No scheduled reports yet.</p>
            <p className="text-[10px] text-slate-600 mt-1">Schedule recurring reports above to receive them automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledList.map(sr => {
              const tpl = REPORT_TEMPLATES.find(t => t.id === sr.templateId);
              return (
                <div key={sr.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Calendar size={18} className="text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{tpl?.name || sr.templateId}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-[9px] uppercase border-white/[0.08] text-slate-400">{sr.frequency}</Badge>
                        <Badge variant="outline" className="text-[9px] uppercase border-white/[0.08] text-slate-400">{sr.format}</Badge>
                        <span className="text-[10px] text-slate-500">{sr.recipients.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      {sr.status}
                    </span>
                    <button onClick={() => handleCancelSchedule(sr.id)} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== SECTION 4: Recent Reports ===== */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
          <History size={20} className="text-indigo-400" /> Recent Reports
        </h2>
        {recentReports.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-10 text-center">
            <FileText size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 font-medium">No reports generated yet.</p>
            <p className="text-[10px] text-slate-600 mt-1">Generate your first report from the templates above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {recentReports.map(rr => (
              <div key={rr.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    {rr.format === "csv" ? <FileSpreadsheet size={14} className="text-emerald-400" /> : <FilePdf size={14} className="text-red-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[120px]">{rr.name}</div>
                    <div className="text-[9px] text-slate-500">{new Date(rr.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => handleDownloadRecent(rr)} className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all">
                  <Download size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== EXISTING REPORT VIEW ===== */}
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


