import { launchPaths } from "@/lib/launch-scope";
import { UserButton } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Download,
  Menu,
  ChevronLeft,
  Users,
  Building,
  Compass,
  DollarSign,
  Folder,
  AlertTriangle,
  Target,
} from "lucide-react";
import { useState, useEffect } from "react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealthCheck } from "@/hooks/use-health-check";

// Only screens with a supported, data-backed journey. Disabled preview features are
// deliberately absent so they cannot be exposed by accident (see lib/launch-scope.ts).
export const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Budgets", href: "/budgets", icon: Target },
  { name: "Projects", href: "/projects", icon: Folder },
  { name: "Vendors", href: "/vendors", icon: Building },
  { name: "Team", href: "/collaboration", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
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
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06] z-50 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg" aria-hidden>
              <Compass size={18} />
            </div>
            <span className="font-bold text-white tracking-tight">CostPilot</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="primary-sidebar"
          >
            <Menu size={24} aria-hidden />
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
        <aside id="primary-sidebar" aria-label="Primary" className={`
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
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em]">Tech spend ledger</span>
                </div>
              )}
            </div>

            {/* Workspace Switcher */}
            <UserButton />
          <WorkspaceSwitcher isCollapsed={isCollapsed} />

            {/* Navigation */}
            <nav className="space-y-1 w-full mt-2 lg:mt-0">
              {navigation.filter(item => launchPaths.has(item.href)).map((item) => {
                const isActive = location === item.href;
                
                const navLink = (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={isCollapsed && !isMobileMenuOpen ? item.name : undefined}
                    className={`flex items-center gap-3 group px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/[0.06] text-white shadow-inner border-t border-white/[0.05] relative before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-[3px] before:rounded-r-full before:bg-indigo-400 before:shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.03]'
                    } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  >
                    <item.icon size={18} className={isActive ? 'text-indigo-300' : ''} aria-hidden />
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

          {/* Shown only when the API cannot be reached; no status claims otherwise. */}
          {!isLoading && !isHealthy && (
            <div role="status" className="px-4 py-3 mb-2 flex items-start gap-2 text-xs text-amber-200 border-t border-white/[0.06]">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
              {!isCollapsed && <span>CostPilot cannot reach its server. Changes may not save until the connection returns.</span>}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="w-full space-y-2 mt-auto">
             <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.03] ${isCollapsed ? 'justify-center px-0' : ''}`}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <Menu size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
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
            
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-12 pb-6 pt-24 lg:pt-12">
            <div className="max-w-6xl mx-auto h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
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
