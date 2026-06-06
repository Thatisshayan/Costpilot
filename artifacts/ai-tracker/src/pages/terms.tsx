import { Shield } from "lucide-react";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content:
      'By accessing or using CostPilot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms apply to all users, including administrators, contributors, and viewers.',
  },
  {
    title: "2. Description of Service",
    content:
      "CostPilot provides AI spend intelligence, cost tracking, budget forecasting, and related analytics tools. We aggregate data from connected platforms and present insights through a web dashboard. Features, availability, and pricing are subject to change at our discretion.",
  },
  {
    title: "3. User Obligations",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the Service for any unlawful purpose, to not reverse-engineer any part of the platform, and to not upload malicious code or interfere with the operation of the Service. You must provide accurate information during onboarding.",
  },
  {
    title: "4. Fees & Payments",
    content:
      "Paid plans are billed monthly or annually as agreed at signup. All fees are non-refundable except as required by law. We may change pricing with 30 days notice. Late payments may result in service suspension. Enterprise customers are subject to separate agreements.",
  },
  {
    title: "5. Intellectual Property",
    content:
      "The Service, including its UI, branding, algorithms, and data models, is the exclusive property of CostPilot. You retain all rights to your workspace data. You grant us a license to process your data solely to provide the Service. Our trademarks may not be used without written permission.",
  },
  {
    title: "6. Limitation of Liability",
    content:
      "CostPilot is provided 'as is' without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from your use of the Service, including financial decisions based on platform insights. Our total liability is limited to the amount you paid in the prior 12 months.",
  },
  {
    title: "7. Termination",
    content:
      "You may terminate your account at any time. We may suspend or terminate access for violations of these terms or extended inactivity. Upon termination, your data will be deleted within 90 days unless required otherwise by law. Sections 5, 6, and 8 survive termination.",
  },
  {
    title: "8. Governing Law",
    content:
      "These terms are governed by the laws of the State of Delaware, United States. Any disputes shall be resolved exclusively in the courts of Delaware. The Service is not targeted at users in jurisdictions where its use is prohibited.",
  },
];

export default function Terms() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
          <Shield size={32} className="text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">Terms of Service</h1>
        <p className="text-slate-400 text-sm">Last updated: June 1, 2026</p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all"
          >
            <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white/[0.01] border border-white/[0.05] rounded-2xl p-8 backdrop-blur-md text-center">
        <p className="text-sm text-slate-500">
          Questions? Contact{" "}
          <a href="mailto:legal@costpilot.ai" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
            legal@costpilot.ai
          </a>
        </p>
      </div>
    </div>
  );
}
