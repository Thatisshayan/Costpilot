import { Link } from "wouter";
import { CalendarClock } from "lucide-react";
import { useListSubscriptions, type Subscription } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { formatMoney } from "@/lib/money-format";

const WINDOW_DAYS = 14;

/** Renewals of active plans and trial ends within the next `days`, soonest first. */
export function upcoming(subs: Subscription[], today: string, days = WINDOW_DAYS) {
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  return subs
    .map(s => {
      const date = s.status === "trial" ? s.trialEndDate : s.status === "active" ? s.nextRenewalDate : null;
      return date && date >= today && date <= until ? { sub: s, date, trial: s.status === "trial" } : null;
    })
    .filter((x): x is { sub: Subscription; date: string; trial: boolean } => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Dashboard card: what renews or stops being free in the next two weeks. Hidden when nothing is due. */
export function UpcomingRenewals() {
  const { activeWorkspaceId } = useWorkspace();
  const { data: subs = [] } = useListSubscriptions(activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {});
  const items = upcoming(subs, new Date().toISOString().slice(0, 10));
  if (items.length === 0) return null;
  return (
    <section aria-label="Upcoming renewals" className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-50">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarClock size={16} aria-hidden /> Coming up in the next {WINDOW_DAYS} days
      </h2>
      <ul className="mt-2 space-y-1">
        {items.map(({ sub, date, trial }) => (
          <li key={sub.id}>
            {date}: {sub.name} {trial ? "trial ends" : `renews for ${formatMoney(sub.amount, sub.currency)}`}
          </li>
        ))}
      </ul>
      <Link href="/subscriptions" className="mt-2 inline-block font-semibold text-indigo-300 underline">Manage subscriptions</Link>
    </section>
  );
}
