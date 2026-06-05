import { Lock } from "lucide-react";

const sections = [
  {
    title: "1. Information We Collect",
    content:
      "We collect account information (email, name, workspace details), payment data (billing info, transaction records), and usage data (platform connections, expense logs, API usage patterns). We do not collect sensitive personal data beyond what is necessary to provide the Service.",
  },
  {
    title: "2. How We Use It",
    content:
      "Your data is used to deliver AI spend intelligence dashboards, generate insights, process payments, send service-related communications, and improve our platform. We do not sell your personal data. Aggregated, anonymized data may be used for product benchmarking.",
  },
  {
    title: "3. Data Sharing",
    content:
      "We share data only with trusted subprocessors who help us operate the Service (e.g., cloud hosting, payment processing). These parties are bound by strict data processing agreements. We may disclose data if required by law or to enforce our Terms of Service.",
  },
  {
    title: "4. Data Retention",
    content:
      "We retain your workspace data for the duration of your account plus 90 days after termination. Anonymized analytics may be retained indefinitely. You may request earlier deletion by contacting support. Backups are retained for up to 30 days.",
  },
  {
    title: "5. Security",
    content:
      "We implement industry-standard security measures including encryption at rest (AES-256) and in transit (TLS 1.3), regular security audits, access controls, and intrusion detection. However, no system is 100% secure. You are responsible for securing your account credentials.",
  },
  {
    title: "6. Your Rights",
    content:
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or port your data. You may also object to or restrict certain processing. To exercise these rights, contact privacy@costpilot.ai. We will respond within 30 days.",
  },
  {
    title: "7. Cookies",
    content:
      "We use essential cookies for authentication and session management. Analytics cookies help us understand usage patterns. You can control cookie preferences through your browser settings. Disabling certain cookies may affect Service functionality.",
  },
  {
    title: "8. Contact",
    content:
      "For privacy-related inquiries, contact our Data Protection Officer at privacy@costpilot.ai or write to: CostPilot, Inc., 251 Little Falls Drive, Wilmington, DE 19808, United States. We aim to resolve all privacy concerns promptly.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <Lock size={32} className="text-emerald-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">Privacy Policy</h1>
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
          Contact our DPO at{" "}
          <a href="mailto:privacy@costpilot.ai" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
            privacy@costpilot.ai
          </a>
        </p>
      </div>
    </div>
  );
}
