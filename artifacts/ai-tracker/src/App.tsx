import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import Subscriptions from "@/pages/subscriptions";
import Projects from "@/pages/projects";
import Platforms from "@/pages/platforms";
import Tools from "@/pages/tools";
import Calendar from "@/pages/calendar";
import Credits from "@/pages/credits";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/projects" component={Projects} />
        <Route path="/platforms" component={Platforms} />
        <Route path="/tools" component={Tools} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/credits" component={Credits} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ai-tracker-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
