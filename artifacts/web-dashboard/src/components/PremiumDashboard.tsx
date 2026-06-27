import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  monthSpend: string;
  totalSpend: string;
  aiTokens: string;
  trendText: string;
  activeTools: string;
  riskCount: number;
  providerSpend: Record<string, number>;
  monthlyTrend: Array<{ month: string; spend: number }>;
}

const PremiumDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    monthSpend: '$3,240',
    totalSpend: '$12,450',
    aiTokens: '14.8M',
    trendText: '+12.4% vs last mo',
    activeTools: '24',
    riskCount: 3,
    providerSpend: {
      AWS: 45,
      Azure: 25,
      GCP: 20,
      OpenAI: 10,
    },
    monthlyTrend: [
      { month: 'Jan', spend: 2800 },
      { month: 'Feb', spend: 2900 },
      { month: 'Mar', spend: 3100 },
      { month: 'Apr', spend: 3240 },
    ],
  });

  const [isLiveMode, setIsLiveMode] = useState(true);

  const COLORS = ['#FF9900', '#007FFF', '#34A853', '#8A2BE2'];

  const providerData = Object.entries(data.providerSpend).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Clash Display' }}>
                  CostPilot
                </h1>
                <div className="absolute -top-2 -right-4 w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full text-sm font-mono font-bold border ${
                isLiveMode 
                  ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {isLiveMode ? '● LIVE DB' : '● OFFLINE'}
              </div>
            </div>
          </div>
          <p className="text-slate-400 mt-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Cloud Cost Intelligence Platform
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Month Spend */}
          <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 hover:border-cyan-500/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-cyan-500/0 rounded-2xl transition-all duration-300" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Month Spend
            </p>
            <p className="text-5xl font-black mt-4 tracking-tight" style={{ fontFamily: 'Clash Display' }}>
              {data.monthSpend}
            </p>
            <p className="text-cyan-400 text-sm font-bold mt-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {data.trendText}
            </p>
          </div>

          {/* Total Spend */}
          <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 hover:border-purple-500/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/0 rounded-2xl transition-all duration-300" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Total Spend
            </p>
            <p className="text-5xl font-black mt-4 tracking-tight" style={{ fontFamily: 'Clash Display' }}>
              {data.totalSpend}
            </p>
            <p className="text-slate-500 text-sm font-medium mt-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              All time
            </p>
          </div>

          {/* AI Tokens */}
          <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 hover:border-orange-500/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-orange-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-orange-500/0 rounded-2xl transition-all duration-300" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              AI Tokens
            </p>
            <p className="text-5xl font-black mt-4 tracking-tight" style={{ fontFamily: 'Clash Display' }}>
              {data.aiTokens}
            </p>
            <p className="text-slate-500 text-sm font-medium mt-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              8.2k avg/req
            </p>
          </div>

          {/* Active Tools */}
          <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 hover:border-green-500/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-green-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/0 rounded-2xl transition-all duration-300" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Active Tools
            </p>
            <p className="text-5xl font-black mt-4 tracking-tight" style={{ fontFamily: 'Clash Display' }}>
              {data.activeTools}
            </p>
            <p className="text-slate-500 text-sm font-medium mt-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Connected
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Monthly Trend Chart */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 shadow-xl">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Clash Display' }}>
              Monthly Spending Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="#06b6d4" 
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Provider Distribution */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 shadow-xl">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Clash Display' }}>
              Provider Split
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          
          {/* Real-Time Audits */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 rounded-2xl border border-red-700/30 p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Clash Display' }}>
                  Real-Time Spend Audits
                </h3>
                <p className="text-slate-300 mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {data.riskCount > 0
                    ? `${data.riskCount} active spending spikes flagged on your production workspaces.`
                    : 'No severe cloud billing anomalies detected.'}
                </p>
                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-semibold transition-all duration-200" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Review Spikes
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 shadow-xl">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Clash Display' }}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 font-semibold transition-all duration-200" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                ➕ Add Expense
              </button>
              <button className="px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-semibold transition-all duration-200" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                📊 View Reports
              </button>
              <button className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-semibold transition-all duration-200" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                💰 Check Budget
              </button>
              <button className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-semibold transition-all duration-200" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                🔄 Sync Now
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PremiumDashboard;
