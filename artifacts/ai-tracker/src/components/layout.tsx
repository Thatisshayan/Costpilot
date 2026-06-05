import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Download,
  Menu,
  ChevronLeft,
  TrendingUp,
  Users,
  Search,
  Wallet,
  CalendarCheck,
  Building,
  BarChart3,
  BarChart4,
  Settings,
  ShieldCheck,
  Shield,
  Compass,
  Cpu,
  Link2,
  CheckSquare,
  Shuffle,
  Terminal,
  LayoutGrid,
  Mail,
  Activity,
  Hexagon,
  Server,
  BrainCircuit,
  HardDrive,
  Lock,
  Target,
  Zap,
  Tag,
  Flame,
  Handshake,
  Settings2,
  MousePointer2,
  Sparkles,
  DollarSign,
  GitBranch,
  Globe,
  BarChart2,
  Layers,
  ClipboardList,
  Bell,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/context/workspace-context";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealthCheck } from "@/hooks/use-health-check";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { name: "API Usage", href: "/api-usage", icon: TrendingUp },
  { name: "Trials", href: "/trials", icon: CalendarCheck },
  { name: "Vendors", href: "/vendors", icon: Building },
  { name: "Budgets", href: "/budgets", icon: Wallet },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "ROI Tracking", href: "/roi", icon: BarChart4 },
  { name: "Approvals", href: "/approvals", icon: CheckSquare },
  { name: "AI Switcher", href: "/switcher", icon: Shuffle },
  { name: "Developer API", href: "/api-docs", icon: Terminal },
  { name: "Workspaces", href: "/entities", icon: LayoutGrid },
  { name: "CostPilot Intelligence", href: "/intelligence", icon: Sparkles },
  { name: "Remediation Center", href: "/remediation", icon: MousePointer2 },
  { name: "Autonomous Router", href: "/llm-router", icon: Zap },
  { name: "CI/CD Integration", href: "/cicd", icon: GitBranch },
  { name: "Unit Economics", href: "/unit-economics", icon: DollarSign },
  { name: "GPU Waste Detector", href: "/gpu-waste", icon: Activity },
  { name: "Market Benchmarks", href: "/market-intelligence", icon: Globe },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Weekly Digest", href: "/digest", icon: Mail },
  { name: "Azure AI", href: "/azure-ai", icon: Server },
  { name: "GCP Vertex AI", href: "/gcp-vertex", icon: Hexagon },
  { name: "Fine-tuning ROI", href: "/fine-tuning", icon: BrainCircuit },
  { name: "GPU Estimator", href: "/gpu-calculator", icon: HardDrive },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck },
  { name: "Privacy Hub", href: "/privacy", icon: Lock },
  { name: "Search Hub", href: "/search", icon: Search },
  { name: "Founder Mode", href: "/founder", icon: Target },
  { name: "Budget Auto-Pilot", href: "/auto-pilot", icon: Zap },
  { name: "Tagging Rules", href: "/tagging-rules", icon: Tag },
  { name: "Credit Burn", href: "/credit-burn", icon: Flame },
  { name: "Contracts", href: "/contracts", icon: Handshake },
  { name: "Advanced Settings", href: "/advanced-settings", icon: Settings2 },
  { name: "Usage Heatmap", href: "/heatmap", icon: MousePointer2 },
  { name: "Cost Centers", href: "/cost-centers", icon: Layers },
  { name: "Model Comparison", href: "/comparison", icon: Cpu },
  { name: "Public Status", href: "/status", icon: Activity },
  { name: "Notifications", href: "/bot-settings", icon: Bell },
  { name: "Integrations", href: "/integrations", icon: Link2 },
  { name: "Audit Logs", href: "/audit", icon: ClipboardList },
  { name: "SSO Config", href: "/sso", icon: Shield },
  { name: "Import Data", href: "/import", icon: Download },
  { name: "Collaboration", href: "/collaboration", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const { isHealthy, isLoading } = useHealthCheck();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-200 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient Mesh Gradients */}
      <div className="absolute top-[-10%] left-[30%] w-[600px] h-[600px] bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-gradient-to-br from-[#6366f1]/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="flex min-h-screen relative z-10">
        
        {/* --- MOBILE HEADER --- */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06] z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
              <Compass size={18} />
            </div>
            <span className="font-bold text-white tracking-tight">CostPilot</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
            aria-label="Toggle Menu"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* --- MOBILE OVERLAY --- */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* --- SIDEBAR --- */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-[60] lg:z-auto
          border-r border-white/[0.06] bg-[#09090b] lg:bg-[#09090b]/60 backdrop-blur-xl 
          flex flex-col transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[80px] items-center' : 'w-64 lg:w-64'} 
          p-6 sidebar-gradient
        `}>
          <div className="flex-1 w-full">
            {/* Logo (Desktop) */}
            <div className={`hidden lg:flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-400 to-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] shrink-0 relative group overflow-hidden">
                <Compass size={20} className="relative z-10 group-hover:rotate-45 transition-transform duration-500" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-white leading-tight">CostPilot</span>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Spend Intelligence</span>
                </div>
              )}
            </div>

            {/* Workspace Switcher */}
            <WorkspaceSwitcher isCollapsed={isCollapsed} />

            {/* Navigation */}
            <nav className="space-y-1 w-full mt-6 lg:mt-0">
              {navigation.map((item) => {
                const isActive = location === item.href;
                
                const navLink = (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/[0.06] text-white shadow-inner border-t border-white/[0.05] relative before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-[3px] before:rounded-r-full before:bg-indigo-400 before:shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] hover:translate-x-0.5'
                    } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  >
                    <item.icon size={18} className={isActive ? 'text-indigo-400' : ''} />
                    {(isMobileMenuOpen || !isCollapsed) && <span>{item.name}</span>}
                  </Link>
                );

                if (isCollapsed && !isMobileMenuOpen) {
                  return (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium bg-[#09090b]/90 border-white/[0.1] text-white">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </nav>
          </div>

          {/* System Status */}
          {!isCollapsed && (
            <div className="px-4 py-2 mb-2 flex items-center gap-2 text-xs text-slate-500 border-t border-white/[0.06] pt-4">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>
                {isLoading ? 'Checking...' : isHealthy ? 'All Systems Operational' : 'Degraded Performance'}
              </span>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="w-full space-y-2 mt-auto">
             <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-all duration-200 hover:translate-x-0.5 ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                {!isCollapsed && <span>Collapse</span>}
              </button>

            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-all duration-200 hover:translate-x-0.5 ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:px-0' : ''}`}
                title={isCollapsed ? "Install App" : undefined}
              >
                <Download size={18} />
                {(isMobileMenuOpen || !isCollapsed) && <span>Install App</span>}
              </button>
            )}
            
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-all duration-200 hover:translate-x-0.5 ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:px-0' : ''}`}
              title={isCollapsed ? "Toggle Theme" : undefined}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {(isMobileMenuOpen || !isCollapsed) && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 pt-24 lg:pt-12">
            <div className="max-w-6xl mx-auto h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
