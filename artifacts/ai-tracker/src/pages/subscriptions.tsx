import { useListSubscriptions } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useListSubscriptions();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions & Trials</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : subscriptions && subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub) => {
            const isTrial = sub.planType === 'free_trial';
            const daysLeft = sub.daysUntilExpiry;
            const isExpiringSoon = isTrial && daysLeft !== null && daysLeft <= 7;
            const isExpiringVerySoon = isTrial && daysLeft !== null && daysLeft <= 3;
            
            return (
              <Card key={sub.id} className={isExpiringVerySoon ? "border-destructive" : isExpiringSoon ? "border-orange-500" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{sub.platformName || 'Unknown'}</CardTitle>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{sub.planName}</div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-2xl font-bold font-mono">
                      {sub.monthlyCost ? `$${sub.monthlyCost}/mo` : 'Free'}
                    </div>
                    {isTrial && daysLeft !== null && (
                      <Badge variant={isExpiringVerySoon ? "destructive" : isExpiringSoon ? "default" : "secondary"} className={isExpiringSoon && !isExpiringVerySoon ? "bg-orange-500 hover:bg-orange-600" : ""}>
                        {daysLeft} days left
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 space-y-1 text-sm">
                    {sub.renewalDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Renews:</span>
                        <span>{format(new Date(sub.renewalDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {sub.projectName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Project:</span>
                        <span>{sub.projectName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          No subscriptions found.
        </div>
      )}
    </div>
  );
}
