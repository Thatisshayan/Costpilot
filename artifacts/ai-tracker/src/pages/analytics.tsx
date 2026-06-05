import { useGetSmartSuggestions, useGetForecast } from "@workspace/api-client-react";
import { 
  TrendingUp, 
  Lightbulb, 
  Download, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  Zap,
  ShieldCheck,
  Clock,
  ChevronRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { toast } from "sonner";
import { formatCurrency } from "../lib/currency";
import CurrencySelector, { useCurrency } from "../components/currency-selector";

export default function Analytics() {
  const { data: suggestions, isLoading: suggestionsLoading } = useGetSmartSuggestions();
  const [currency] = useCurrency();
  const { data: forecast, isLoading: forecastLoading } = useGetForecast();

  const handleExport = async (type: "csv" | "pdf") => {
    try {
      const response = await fetch(`/api/analytics/export/${type}`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-report.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report downloaded successfully.`);
    } catch (err) {
      toast.error(`Failed to export ${type.toUpperCase()}.`);
    }
  };

  const chartData = forecast ? [
    { name: "Daily Avg", amount: forecast.dailySpendVelocity },
    { name: "Monthly Est", amount: forecast.predictedMonthlyTotal }
  ] : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">CostPilot Usage Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Deep dive into token usage, model costs, and infrastructure spending.</p>
        </div>
        <CurrencySelector />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Optimization Hub */}
        <div className="lg:col-span-7 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="text-amber-400" size={20} />
              <h2 className="text-xl font-semibold text-white">Smart Suggestions</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {suggestionsLoading ? (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 text-center text-slate-500">
                  Calculating suggestions...
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                suggestions.map((s: any) => (
                  <div key={s.id} className="group bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-5 transition-all backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {s.type === "model_swap" ? <Zap size={60} /> : <AlertCircle size={60} />}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        s.type === "model_swap" ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {s.type === "model_swap" ? <TrendingUp size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-semibold text-white">{s.title}</h3>
                          {s.potentialSavings > 0 && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                              Save {formatCurrency(s.potentialSavings, currency)}/mo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-4">
                          {s.description}
                        </p>
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">
                          Learn more <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 text-center">
                  <ShieldCheck className="mx-auto text-emerald-400 mb-2" size={32} />
                  <p className="text-slate-400">Everything looks optimized! No suggestions at this time.</p>
                </div>
              )}
            </div>
          </section>

          {/* Export Center */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Download className="text-indigo-400" size={20} />
              <h2 className="text-xl font-semibold text-white">Report Center</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => handleExport("csv")}
                className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Export as CSV</div>
                    <div className="text-xs text-slate-500">Tax-ready expense data</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </button>
              <button 
                onClick={() => handleExport("pdf")}
                className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Export as PDF</div>
                    <div className="text-xs text-slate-500">Professional visual summary</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Forecasting */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-6 flex items-center gap-2">
              <TrendingUp size={16} />
              Spending Velocity
            </h2>
            
            <div className="h-64 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => formatCurrency(value, currency)}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    itemStyle={{ color: "#fff" }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#6366f1" : "#8b5cf6"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">DAILY BURN</div>
                <div className="text-xl font-bold text-white font-mono">{formatCurrency(forecast?.dailySpendVelocity ?? 0, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">MONTHLY EST.</div>
                <div className="text-xl font-bold text-indigo-400 font-mono">{formatCurrency(forecast?.predictedMonthlyTotal ?? 0, currency)}</div>
              </div>
            </div>
          </section>

          {/* Credit Burn Forecast */}
          <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-6 flex items-center gap-2">
              <Clock size={16} />
              Credit Exhaustion
            </h2>

            <div className="space-y-5">
              {forecast?.creditExhaustionDates?.map((c: any) => (
                <div key={c.platformName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-white">
                      {c.platformName?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{c.platformName}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Est. Zero Date</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${c.daysRemaining < 7 ? "text-red-400" : "text-emerald-400"}`}>
                      {c.predictedExhaustionDate}
                    </div>
                    <div className="text-[10px] text-slate-500">{c.daysRemaining} days left</div>
                  </div>
                </div>
              ))}
              {(!forecast?.creditExhaustionDates || forecast.creditExhaustionDates.length === 0) && (
                <p className="text-center text-slate-500 text-sm py-4 italic">No credit data found.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
