import React, { useState } from 'react';
import { 
  Rocket, 
  CreditCard, 
  Database, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  Zap
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (source: "stripe" | "csv") => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<'stripe' | 'csv' | null>(null);
  
  const steps = [
    {
      id: 1,
      title: 'Welcome to CostPilot',
      description: 'Your command center for AI spend intelligence. Let\'s get your workspace set up in 60 seconds.',
      icon: <Rocket className="text-indigo-400" size={32} />,
      cta: 'Start Setup'
    },
    {
      id: 2,
      title: 'Connect Primary Source',
      description: 'Choose how you want to ingest your initial spend data. You can always change this later.',
      icon: <Database className="text-emerald-400" size={32} />,
      options: [
        { name: 'Stripe Integration', sub: 'Real-time billing ingestion', icon: <CreditCard size={18} /> },
        { name: 'CSV Statement', sub: 'One-time bank export', icon: <Zap size={18} /> }
      ]
    },
    {
      id: 3,
      title: 'Security & Intelligence',
      description: 'CostPilot uses Enterprise-grade encryption. We only analyze spend metadata to provide audit results.',
      icon: <ShieldCheck className="text-indigo-400" size={32} />,
      cta: 'Finish & Launch'
    }
  ];

  const currentStep = steps.find(s => s.id === step);

  const next = () => {
    if (step === steps.length) {
      onComplete(selectedSource || 'stripe');
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#09090b] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(99,102,241,0.2)] max-w-xl w-full p-10 relative overflow-hidden">
        
         {/* Progress Dots */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map(s => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${s.id === step ? 'w-8 bg-indigo-500' : 'w-2 bg-white/10'}`} />
          ))}
        </div>

        <div className="relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-8 shadow-inner">
            {currentStep?.icon}
          </div>
          
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">{currentStep?.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            {currentStep?.description}
          </p>

          {currentStep?.options ? (
            <div className="space-y-4 mb-10">
              {currentStep.options.map((opt, idx) => {
                const optId = opt.name.toLowerCase().includes('stripe') ? 'stripe' : 'csv';
                return (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setSelectedSource(optId);
                      setStep(step + 1);
                    }}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all group ${
                      selectedSource === optId 
                        ? 'border-indigo-500 bg-white/[0.08]' 
                        : 'bg-white/[0.03] border-white/5 hover:border-indigo-500/40 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-indigo-400 group-hover:scale-110 transition-transform">{opt.icon}</div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">{opt.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{opt.sub}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : (
            <button 
              onClick={next}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
            >
              {currentStep?.cta} <ArrowRight size={18} />
            </button>
          )}

          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="mt-6 text-xs font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest block mx-auto">
              Back
            </button>
          )}
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
