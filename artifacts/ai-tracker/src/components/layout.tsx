import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Folder, 
  Blocks, 
  Link as LinkIcon, 
  Moon, 
  Sun,
  CalendarDays,
  Coins,
  Download,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { name: "Credits", href: "/credits", icon: Coins },
  { name: "Projects", href: "/projects", icon: Folder },
  { name: "Platforms", href: "/platforms", icon: Blocks },
  { name: "Tools", href: "/tools", icon: LinkIcon },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <div 
        className={`border-b md:border-b-0 md:border-r border-border bg-card flex flex-col transition-all duration-300 ${
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        } w-full`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="font-mono font-bold text-lg tracking-tight flex items-center gap-3 overflow-hidden">
            <div className="w-6 h-6 bg-primary rounded shadow-sm shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-sm" />
            </div>
            {!isCollapsed && <span className="truncate">AI Tracker</span>}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex shrink-0 h-8 w-8 ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location === item.href;
            
            const navLink = (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-4">
          {installPrompt && (
            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "default"} 
              className={`w-full ${isCollapsed ? 'h-10 w-10 shrink-0 mx-auto' : ''}`}
              onClick={handleInstallClick}
              title={isCollapsed ? "Install App" : undefined}
            >
              <Download className={isCollapsed ? "w-4 h-4" : "w-4 h-4 mr-2"} />
              {!isCollapsed && "Install App"}
            </Button>
          )}
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Toggle Theme" : undefined}
          >
            {theme === "dark" ? <Sun className={isCollapsed ? "w-5 h-5" : "w-4 h-4"} /> : <Moon className={isCollapsed ? "w-5 h-5" : "w-4 h-4"} />}
            {!isCollapsed && (theme === "dark" ? "Light Mode" : "Dark Mode")}
          </button>
          
          {!isCollapsed && (
            <div className="text-xs text-muted-foreground/50 text-center font-mono mt-2">
              v1.0 · AI Tracker
            </div>
          )}
        </div>
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
