import React, { useState } from 'react';
import { 
  User, 
  Settings2, 
  Mail, 
  Lock, 
  Globe, 
  Database, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  UserPlus,
  Trash2,
  Bell,
  Fingerprint
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function Settings() {
  const [currency, setCurrency] = useState("USD ($)");
  const [profileName, setProfileName] = useState("Alex Rivera");
  const [profileEmail, setProfileEmail] = useState("alex@costpilot.ai");
  const [developerToken, setDeveloperToken] = useState("cp_live_9a7b1c3d5e2f8a0c9b8a7f6e");
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "Alex Rivera", email: "alex@costpilot.ai", role: "Owner", status: "Active" },
    { id: 2, name: "Sophia Chen", email: "sophia@costpilot.ai", role: "Admin", status: "Active" },
    { id: 3, name: "Marcus Brody", email: "marcus@costpilot.ai", role: "Developer", status: "Active" },
    { id: 4, name: "Emily Watson", email: "emily@costpilot.ai", role: "Viewer", status: "Pending" }
  ]);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Developer");

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    const newMember: Member = {
      id: Date.now(),
      name: newEmail.split("@")[0].charAt(0).toUpperCase() + newEmail.split("@")[0].slice(1),
      email: newEmail,
      role: newRole,
      status: "Pending"
    };

    setMembers([...members, newMember]);
    setNewEmail("");
  };

  const handleDeleteMember = (id: number) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const rotateToken = () => {
    const chars = "abcdef0123456789";
    let newToken = "cp_live_";
    for (let i = 0; i < 24; i++) {
      newToken += chars[Math.floor(Math.random() * chars.length)];
    }
    setDeveloperToken(newToken);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workspace Settings</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Manage your personal profile, customize workspace parameters, invite core team members, and generate administrative API keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10">
            <CheckCircle2 size={18} />
            Save Preferences
          </button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          
          {/* Profile Section */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Administrative Profile</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Personal Account Identity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Core Team Membership */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Team & Collaboration</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Workspace Seats & Access Control</p>
              </div>
            </div>

            {/* Quick Invite Form */}
            <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 mb-8 bg-black/30 p-4 border border-white/5 rounded-2xl">
              <input 
                type="email" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="developer-email@company.com"
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option>Admin</option>
                <option>Developer</option>
                <option>Viewer</option>
              </select>
              <button 
                type="submit"
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={14} />
                Send Invitation
              </button>
            </form>

            {/* Members List */}
            <div className="space-y-4">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/[0.01]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white">{m.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider ${m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{m.email}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase font-black text-slate-400 bg-white/5 px-2.5 py-1 border border-white/10 rounded-md">
                      {m.role}
                    </span>
                    {m.role !== "Owner" && (
                      <button 
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-red-400 p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Developer API Keys */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Key size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Administrative SDK Access</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Bearer Tokens & Analytics Telemetry</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Use this key inside your CI/CD telemetry pipelines or local wrappers to record token metrics automatically via CostPilot's endpoint middleware.
            </p>

            <div className="flex gap-4 items-center mb-6 bg-black/40 border border-white/5 rounded-2xl p-4">
              <input 
                type={isTokenVisible ? "text" : "password"} 
                value={developerToken}
                readOnly
                className="flex-1 bg-transparent font-mono text-xs text-indigo-300 border-none focus:outline-none"
              />
              <button 
                onClick={() => setIsTokenVisible(!isTokenVisible)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white font-bold text-xs"
              >
                {isTokenVisible ? "Mask" : "Reveal"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={rotateToken}
                className="py-3 px-6 bg-red-500/10 hover:bg-red-500 border border-red-500/10 hover:border-red-500 text-red-400 hover:text-white rounded-xl font-bold text-xs transition-all shadow-inner"
              >
                Rotate Developer Token
              </button>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-400" />
                Rotating this key instantly revokes older integrations.
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* General Workspace Options */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Regional & Currency</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>CAD (C$)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fiscal Cycle Start</label>
                <select className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                  <option>1st of each Month</option>
                  <option>15th of each Month</option>
                  <option>Quarterly Calendars</option>
                </select>
              </div>
            </div>
          </div>

          {/* Secure Integrations */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Platform Security</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Biometric Login</h4>
                  <p className="text-[9px] text-slate-500 leading-normal">Require face/touch ID login.</p>
                </div>
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-500 bg-black border-white/10" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Session Recording</h4>
                  <p className="text-[9px] text-slate-500 leading-normal">Store user interactions for audits.</p>
                </div>
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-500 bg-black border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
