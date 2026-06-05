import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/context/workspace-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Analytics from "@/pages/analytics";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import Subscriptions from "@/pages/subscriptions";
import Projects from "@/pages/projects";
import Platforms from "@/pages/platforms";
import Tools from "@/pages/tools";
import Calendar from "@/pages/calendar";
import Credits from "@/pages/credits";
import Collaboration from "@/pages/collaboration";
import ImportPortal from "@/pages/import";
import ReportsPage from "@/pages/reports";
import IntegrationsHub from "@/pages/integrations";
import ComparisonPage from "@/pages/comparison";
import SSOPage from "@/pages/sso";
import StatusPage from "@/pages/status";
import Terms from "@/pages/terms";
import PrivacyPolicy from "@/pages/privacy-policy";
import AuditLogs from "@/pages/audit";
import CostCenters from "@/pages/cost-centers";
import ApprovalWorkflows from "@/pages/approvals";
import TokenRoi from "@/pages/roi";
import LlmSwitcher from "@/pages/switcher";
import ApiDocs from "@/pages/api-docs";
import MultiEntity from "@/pages/entities";
import ReportBuilder from "@/pages/report-builder";
import WeeklyDigest from "@/pages/digest";
import AnomalyDetection from "@/pages/anomalies";
import BotSettings from "@/pages/bot-settings";
import TaxOptimization from "@/pages/tax-optimization";
import Benchmarking from "@/pages/benchmarking";
import BedrockConnector from "@/pages/aws-bedrock";
import AzureAiConnector from "@/pages/azure-ai";
import VertexAiConnector from "@/pages/gcp-vertex";
import FineTuningRoi from "@/pages/fine-tuning";
import GpuCalculator from "@/pages/gpu-calculator";
import ComplianceCenter from "@/pages/compliance";
import PrivacyHub from "@/pages/privacy";
import SearchHub from "@/pages/search-hub";
import FounderDashboard from "@/pages/founder-dashboard";
import AutoPilot from "@/pages/auto-pilot";
import TaggingRules from "@/pages/tagging-rules";
import CreditBurn from "@/pages/credit-burn";
import VendorContracts from "@/pages/vendor-contracts";
import AdvancedSettings from "@/pages/advanced-settings";
import UsageHeatmap from "@/pages/heatmap";
import CostPilotIntelligence from "@/pages/intelligence";
import UnitEconomics from "@/pages/unit-economics";
import GpuWasteDetector from "@/pages/gpu-waste";
import MarketBenchmarks from "@/pages/benchmarks-intelligence";
import LlmRouter from "@/pages/llm-router";
import CicdIntegration from "@/pages/cicd-integration";
import RemediationCenter from "@/pages/remediation";

import Budgets from "@/pages/budgets";
import Settings from "@/pages/settings";

// New/Rebranded Placeholders
const ApiUsage = Analytics;
const Trials = Calendar;
const Vendors = Platforms;

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/api-usage" component={ApiUsage} />
        <Route path="/trials" component={Trials} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/budgets" component={Budgets} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/import" component={ImportPortal} />
        <Route path="/integrations" component={IntegrationsHub} />
        <Route path="/comparison" component={ComparisonPage} />
        <Route path="/sso" component={SSOPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/audit" component={AuditLogs} />
        <Route path="/cost-centers" component={CostCenters} />
        <Route path="/approvals" component={ApprovalWorkflows} />
        <Route path="/roi" component={TokenRoi} />
        <Route path="/switcher" component={LlmSwitcher} />
        <Route path="/api-docs" component={ApiDocs} />
        <Route path="/entities" component={MultiEntity} />
        <Route path="/report-builder" component={ReportBuilder} />
        <Route path="/digest" component={WeeklyDigest} />
        <Route path="/anomalies" component={AnomalyDetection} />
        <Route path="/bot-settings" component={BotSettings} />
        <Route path="/tax" component={TaxOptimization} />
        <Route path="/benchmarks" component={Benchmarking} />
        <Route path="/aws-bedrock" component={BedrockConnector} />
        <Route path="/azure-ai" component={AzureAiConnector} />
        <Route path="/gcp-vertex" component={VertexAiConnector} />
        <Route path="/fine-tuning" component={FineTuningRoi} />
        <Route path="/gpu-calculator" component={GpuCalculator} />
        <Route path="/compliance" component={ComplianceCenter} />
        <Route path="/privacy" component={PrivacyHub} />
        <Route path="/search" component={SearchHub} />
        <Route path="/founder" component={FounderDashboard} />
        <Route path="/auto-pilot" component={AutoPilot} />
        <Route path="/tagging-rules" component={TaggingRules} />
        <Route path="/credit-burn" component={CreditBurn} />
        <Route path="/contracts" component={VendorContracts} />
        <Route path="/advanced-settings" component={AdvancedSettings} />
        <Route path="/heatmap" component={UsageHeatmap} />
        <Route path="/intelligence" component={CostPilotIntelligence} />
        <Route path="/unit-economics" component={UnitEconomics} />
        <Route path="/gpu-waste" component={GpuWasteDetector} />
        <Route path="/market-intelligence" component={MarketBenchmarks} />
        <Route path="/llm-router" component={LlmRouter} />
        <Route path="/cicd" component={CicdIntegration} />
        <Route path="/remediation" component={RemediationCenter} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/collaboration" component={Collaboration} />
        <Route path="/settings" component={Settings} />
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
          <WorkspaceProvider>
            <ErrorBoundary>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </ErrorBoundary>
          </WorkspaceProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
