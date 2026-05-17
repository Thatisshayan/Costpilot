import { 
  useGetDashboardSummary, 
  useGetExpiringTrials, 
  useGetExpensesByPlatform, 
  useGetExpensesByProject, 
  useGetMonthlySpending, 
  useListExpenses 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, CreditCard, Activity, Box, Coins, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: expiringTrials } = useGetExpiringTrials();
  const { data: monthlySpending } = useGetMonthlySpending();
  const { data: platformStats } = useGetExpensesByPlatform();
  const { data: projectStats } = useGetExpensesByProject();
  const { data: recentExpenses } = useListExpenses();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back. Here's your AI spending overview.</p>
        </div>
      </div>

      {expiringTrials && expiringTrials.length > 0 && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 shadow-lg shadow-destructive/10">
          <Zap className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-semibold tracking-tight text-lg">Action Required: Expiring Trials</AlertTitle>
          <AlertDescription className="mt-2 text-destructive/90">
            <p className="mb-2">You have {expiringTrials.length} trials expiring soon. Cancel them to avoid charges.</p>
            <ul className="space-y-1">
              {expiringTrials.map(trial => (
                <li key={trial.id} className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                  {trial.platformName || 'Unknown Platform'} - {trial.planName}
                  <span className="opacity-75 font-mono ml-auto">
                    {trial.daysUntilExpiry === 0 ? 'Today' : `in ${trial.daysUntilExpiry} days`}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:border-primary/50 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">Total Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tracking-tighter text-foreground">${summary?.totalSpend?.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-primary tracking-tight">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold font-mono tracking-tighter text-primary">${summary?.thisMonthSpend?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Vs last: ${summary?.lastMonthSpend?.toFixed(2) || "0.00"}
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">Active Trials</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tracking-tighter text-foreground">{summary?.activeTrials || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">Ecosystem</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tracking-tighter text-foreground">{summary?.totalProjects || 0} <span className="text-muted-foreground text-lg">/ {summary?.totalPlatforms || 0}</span></div>
          </CardContent>
        </Card>

        {/* New 5th Stat Card */}
        <Card className="hover:border-primary/50 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">Total Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tracking-tighter text-foreground">{(summary as any)?.totalCredits || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="tracking-tight">Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {monthlySpending && monthlySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySpending} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} dx={-10} />
                  <Tooltip 
                    contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)'}}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="tracking-tight">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
              {recentExpenses?.slice(0, 6).map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border group">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                      {expense.platformName || 'Unknown Platform'}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                      {expense.projectName && <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{expense.projectName}</span>}
                      <span>{format(new Date(expense.date), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="font-bold font-mono text-primary group-hover:scale-105 transition-transform">
                    ${expense.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              {(!recentExpenses || recentExpenses.length === 0) && (
                <div className="text-center text-muted-foreground py-12 font-medium">No recent expenses</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {platformStats && platformStats.length > 0 && (
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="tracking-tight">Spend by Platform</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="platformName" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted))'}} 
                  contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} 
                  itemStyle={{fontFamily: 'var(--font-mono)'}}
                />
                <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
