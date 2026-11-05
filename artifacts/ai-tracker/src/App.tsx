import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/context/workspace-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import Projects from "@/pages/projects";
import Platforms from "@/pages/platforms";
import Collaboration from "@/pages/collaboration";
import AcceptInvite from "@/pages/accept-invite";
import Terms from "@/pages/terms";
import PrivacyPolicy from "@/pages/privacy-policy";
function Unavailable() { return <main className="p-8"><h1>Feature unavailable</h1><p>This preview feature is not part of the current release.</p><Link href="/">Return to expenses overview</Link></main>; }
export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return <ThemeProvider defaultTheme="dark" storageKey="ai-tracker-theme"><QueryClientProvider client={queryClient}>
    <TooltipProvider><WorkspaceProvider><ErrorBoundary><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Layout><Switch>
        <Route path="/" component={Dashboard} /><Route path="/expenses" component={Expenses} />
        <Route path="/projects" component={Projects} /><Route path="/platforms" component={Platforms} />
        <Route path="/vendors" component={Platforms} /><Route path="/collaboration" component={Collaboration} />
        <Route path="/accept-invite" component={AcceptInvite} /><Route path="/terms" component={Terms} />
        <Route path="/privacy-policy" component={PrivacyPolicy} /><Route component={Unavailable} />
      </Switch></Layout>
    </WouterRouter></ErrorBoundary></WorkspaceProvider><Toaster richColors /></TooltipProvider>
  </QueryClientProvider></ThemeProvider>;
}
