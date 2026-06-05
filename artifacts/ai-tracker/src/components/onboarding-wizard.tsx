import React, { useState } from "react";
import {
  Rocket,
  Database,
  Upload,
  ArrowRight,
  CreditCard,
  Zap,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete: (source: "stripe" | "csv") => Promise<void>;
}

const steps = [
  {
    id: 1,
    title: "Welcome to CostPilot",
    description:
      "Your AI spend intelligence command center. Set up your workspace in under 60 seconds.",
    icon: <Rocket size={32} />,
  },
  {
    id: 2,
    title: "Connect Your First Platform",
    description:
      "Ingest spend data from Stripe or upload a CSV statement. You can add more sources later.",
    icon: <Database size={32} />,
  },
  {
    id: 3,
    title: "Import Your Expenses",
    description:
      "We'll analyze your first batch of data and generate actionable insights automatically.",
    icon: <Upload size={32} />,
  },
];

const options = [
  {
    id: "stripe" as const,
    name: "Stripe Integration",
    sub: "Real-time billing ingestion",
    icon: <CreditCard size={18} />,
  },
  {
    id: "csv" as const,
    name: "CSV Statement",
    sub: "One-time bank export upload",
    icon: <FileSpreadsheet size={18} />,
  },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<"stripe" | "csv" | null>(null);
  const [completing, setCompleting] = useState(false);

  const currentStep = steps.find((s) => s.id === step);

  const handleFinish = async () => {
    setCompleting(true);
    try {
      await onComplete(selectedSource || "stripe");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#09090b] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(99,102,241,0.2)] max-w-xl w-full p-10 relative overflow-hidden">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-10">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    s.id < step
                      ? "bg-indigo-500 text-white"
                      : s.id === step
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                      : "bg-white/[0.03] text-slate-600 border border-white/[0.06]"
                  }`}
                >
                  {s.id < step ? <CheckCircle2 size={14} /> : s.id}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline transition-colors ${
                    s.id <= step ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {s.id === 1
                    ? "Welcome"
                    : s.id === 2
                    ? "Connect"
                    : "Import"}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-px transition-colors duration-500 ${
                    s.id < step ? "bg-indigo-500/40" : "bg-white/[0.06]"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="relative z-10">
          <div
            className={`w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-8 shadow-inner ${
              step === 1
                ? "text-indigo-400"
                : step === 2
                ? "text-emerald-400"
                : "text-amber-400"
            }`}
          >
            {currentStep?.icon}
          </div>

          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">
            {currentStep?.title}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            {currentStep?.description}
          </p>

          {step === 2 ? (
            <div className="space-y-4 mb-10">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedSource(opt.id);
                    setStep(3);
                  }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all group ${
                    selectedSource === opt.id
                      ? "border-indigo-500 bg-white/[0.08]"
                      : "bg-white/[0.03] border-white/5 hover:border-indigo-500/40 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-indigo-400 group-hover:scale-110 transition-transform">
                      {opt.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">{opt.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {opt.sub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={step === 3 ? handleFinish : () => setStep(step + 1)}
              disabled={completing}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-2xl text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
            >
              {completing
                ? "Setting up..."
                : step === 1
                ? "Start Setup"
                : "Finish & Launch"}
              <ArrowRight size={18} />
            </button>
          )}

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="mt-6 text-xs font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest block mx-auto"
            >
              Back
            </button>
          )}
        </div>

        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
