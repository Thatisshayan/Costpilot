import { useListSubscriptions } from "@workspace/api-client-react";
import { format } from "date-fns";
import { AlertTriangle, Calendar, Folder, CreditCard } from "lucide-react";

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useListSubscriptions();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Subscriptions & Trials</h1>
          <p className="text-sm text-slate-400 mt-1">Manage active free trials and recurring SaaS billing cycles.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading subscriptions...</div>
      ) : subscriptions && subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub) => {
            const isTrial = sub.planType === "free_trial";
            const daysLeft = sub.daysUntilExpiry;
            const isExpiringSoon = isTrial && daysLeft !== null && daysLeft !== undefined && daysLeft <= 7;
            const isExpiringVerySoon = isTrial && daysLeft !== null && daysLeft !== undefined && daysLeft <= 3;

            return (
              <div 
                key={sub.id} 
                className={`bg-white/[0.02] border rounded-2xl p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] flex flex-col justify-between h-[220px] ${
                  isExpiringVerySoon 
                    ? "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.05)] bg-gradient-to-b from-red-500/[0.02] to-transparent" 
                    : isExpiringSoon 
                    ? "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)] bg-gradient-to-b from-amber-500/[0.02] to-transparent" 
                    : "border-white/[0.06]"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${getHashColor(sub.platformName || "Unknown")} flex items-center justify-center font-semibold text-white text-xs shadow-sm`}>
                        {(sub.platformName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white leading-tight">{sub.platformName || "Unknown"}</h3>
                        <span className="text-xs text-slate-400 font-medium">{sub.planName}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${
                      sub.status === "active" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-white/[0.04] text-slate-400 border border-white/[0.08]"
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-2xl font-bold font-mono text-white tracking-tight">
                      {sub.monthlyCost ? `$${Number(sub.monthlyCost).toFixed(2)}` : "Free"}
                      {sub.monthlyCost && <span className="text-xs text-slate-500 font-normal font-sans ml-1">/mo</span>}
                    </div>

                    {isTrial && daysLeft !== null && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${
                        isExpiringVerySoon 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : isExpiringSoon 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {isExpiringSoon && <AlertTriangle size={12} />}
                        {daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/[0.04] pt-4 mt-auto space-y-1 text-xs text-slate-400 font-medium">
                  {sub.renewalDate && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-500" /> Renews:</span>
                      <span className="text-slate-200">{format(new Date(sub.renewalDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {sub.projectName && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><Folder size={12} className="text-slate-500" /> Project:</span>
                      <span className="text-slate-200">{sub.projectName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 font-medium bg-white/[0.01] border border-white/[0.05] rounded-2xl">
          No subscriptions found.
        </div>
      )}
    </div>
  );
}

// Helper to generate a consistent color based on string
function getHashColor(str: string) {
  const colors = [
    "bg-[#10a37f]", // OpenAI green
    "bg-[#cc9966]", // Anthropic beige
    "bg-[#1a1b1f]", // Midjourney dark
    "bg-[#6366f1]", // Indigo
    "bg-[#ec4899]", // Pink
    "bg-[#8b5cf6]", // Purple
    "bg-[#f59e0b]", // Amber
    "bg-[#0ea5e9]", // Sky
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
