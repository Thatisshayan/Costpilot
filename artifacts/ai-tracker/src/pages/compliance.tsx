import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Search,
  Filter,
  Activity,
  UserCheck
} from 'lucide-react';

export default function ComplianceCenter() {
  const controls = [
    { id: 'AC-1', name: 'Access Control Policy', status: 'Passed', coverage: '100%', evidence: 'sso_logs_q2.pdf' },
    { id: 'CC-3', name: 'Encryption at Rest', status: 'Passed', coverage: '100%', evidence: 'db_config_audit.json' },
    { id: 'PI-2', name: 'PII Redaction Engine', status: 'Warning', coverage: '84%', evidence: 'test_fails_may12.log' },
    { id: 'IR-1', name: 'Incident Response Plan', status: 'Passed', coverage: '100%', evidence: 'ir_plan_v2.docx' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">SOC2 Compliance Center</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Monitor your workspace's compliance posture in real-time. Automated evidence collection for security audits and investor due diligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-sm hover:bg-white/[0.05] transition-all flex items-center gap-2">
            <Download size={18} />
            Evidence Export
          </button>
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <UserCheck size={18} />
            Assign Auditor
          </button>
        </div>
      </header>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <ComplianceCard label="Overall Readiness" value="92%" status="good" />
        <ComplianceCard label="Controls Verified" value="28 / 32" status="warning" />
        <ComplianceCard label="Days to Audit" value="41" status="good" />
      </div>

      {/* Controls Matrix */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Trust Service Criteria (TSC)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Search controls..." className="pl-9 pr-4 py-2 bg-black/40 border border-white/5 rounded-lg text-[10px] text-white focus:outline-none w-48" />
            </div>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Control ID</th>
              <th className="py-6 px-4">Control Name</th>
              <th className="py-6 px-4">Coverage</th>
              <th className="py-6 px-4">Status</th>
              <th className="py-6 px-8 text-right">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {controls.map((c) => (
              <tr key={c.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <span className="text-xs font-mono font-bold text-indigo-400">{c.id}</span>
                </td>
                <td className="py-5 px-4 text-sm font-bold text-white">{c.name}</td>
                <td className="py-5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: c.coverage }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{c.coverage}</span>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                    c.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-5 px-8 text-right">
                  <button className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors ml-auto">
                    <FileText size={12} />
                    {c.evidence}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compliance Advisory */}
      <div className="mt-8 p-10 bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <Activity size={40} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Real-time Trust Monitoring</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            CostPilot automatically monitors <span className="text-white font-bold">14 critical security parameters</span>. We've detected that MFA enforcement is <span className="text-amber-400 font-bold">Incomplete</span> for 2 users in the 'Analytics' entity, which impacts your SOC2 Type II status.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-xs hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2">
              Remediate Now <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceCard({ label, value, status }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md relative overflow-hidden group">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <div className="text-4xl font-black text-white tracking-tight">{value}</div>
        <div className={`w-3 h-3 rounded-full ${status === 'good' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'}`} />
      </div>
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/5 transition-all" />
    </div>
  );
}
