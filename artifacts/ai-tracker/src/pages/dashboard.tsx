import { useGetDashboardSummary, useGetExpiringTrials, useGetExpensesByPlatform, useGetExpensesByProject, useGetMonthlySpending, useListExpenses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, CreditCard, Activity, Box, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: expiringTrials } = useGetExpiringTrials();
  const { data: monthlySpending } = useGetMonthlySpending();
  const { data: platformStats } = useGetExpensesByPlatform();
  const { data: projectStats } = useGetExpensesByProject();
  const { data: recentExpenses } = useListExpenses();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {expiringTrials && expiringTrials.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Expiring Trials</AlertTitle>
          <AlertDescription>
            You have {expiringTrials.length} trials expiring soon. Check your subscriptions to avoid unwanted charges.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend (All Time)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.totalSpend?.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.thisMonthSpend?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vs last month: ${summary?.lastMonthSpend?.toFixed(2) || "0.00"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeTrials || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects & Platforms</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProjects || 0} / {summary?.totalPlatforms || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {monthlySpending && monthlySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses?.slice(0, 5).map(expense => (
                <div key={expense.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{expense.platformName || 'Unknown Platform'}</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.projectName && <span className="mr-2">{expense.projectName}</span>}
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="font-bold font-mono">
                    ${expense.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              {(!recentExpenses || recentExpenses.length === 0) && (
                <div className="text-center text-muted-foreground py-4">No recent expenses</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
