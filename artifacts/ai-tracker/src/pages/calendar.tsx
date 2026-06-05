import { useState } from "react";
import { useGetCalendarEvents } from "@workspace/api-client-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";

type CalendarEvent = {
  id: string;
  type: string;
  title: string;
  date: string;
  amount: number | null;
  platformName: string | null;
  projectName: string | null;
  urgent: boolean;
};

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  expense: { color: "bg-indigo-500", bg: "bg-indigo-500/10 text-indigo-400", label: "Expense" },
  trial_expiry: { color: "bg-red-500", bg: "bg-red-500/10 text-red-400", label: "Trial Expiry" },
  renewal: { color: "bg-amber-500", bg: "bg-amber-500/10 text-amber-400", label: "Renewal" },
  credit_purchase: { color: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-400", label: "Credit Top-up" },
};

const EVENT_TOOLTIP_DETAIL: Record<string, string> = {
  expense: "Logged API or SaaS purchase",
  trial_expiry: "Free trial ends — action required",
  renewal: "Subscription renews on this date",
  credit_purchase: "Prepaid credit top-up logged",
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { data: events = [], isLoading } = useGetCalendarEvents();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const eventsForDay = (day: Date) =>
    events.filter((e) => {
      try { return isSameDay(new Date(e.date + "T12:00:00"), day); } catch { return false; }
    });

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const hasAnyEvents = events.length > 0;

  return (
    <div className="space-y-6">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AI Free Trials</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor trial expiration windows and upcoming renewal risks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold w-36 text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
          >
            Today
          </button>
        </div>
      </header>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 group relative">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded bg-black/80 text-[10px] text-white whitespace-nowrap z-10">
              {EVENT_TOOLTIP_DETAIL[type] || cfg.label}
            </div>
          </div>
        ))}
        <span className="text-xs text-slate-500 ml-auto">{hasAnyEvents ? `${events.length} events total` : 'No events loaded'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Loading skeleton */}
            {isLoading ? (
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[80px] border-b border-r border-border/40 bg-muted/10 p-1.5 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-slate-700/30 mb-1" />
                    <div className="space-y-0.5">
                      <div className="h-3 w-full bg-slate-700/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasAnyEvents ? (
              <div className="py-16 text-center">
                <CalendarDays className="mx-auto text-slate-600 mb-3" size={32} />
                <p className="text-sm text-slate-500 font-medium">No events this month</p>
                <p className="text-xs text-slate-600 mt-1">Expenses, trials, and renewals will appear here once added.</p>
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {/* Empty cells before month start */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/40 bg-muted/10" />
                ))}

                {days.map((day, idx) => {
                  const dayEvents = eventsForDay(day);
                  const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const isTodayDay = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`min-h-[80px] border-b border-r border-border/40 p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${
                        isSelected ? "bg-primary/10 border-primary/30" : ""
                      } ${(startDayOfWeek + idx + 1) % 7 === 0 ? "border-r-0" : ""}`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ${
                        isTodayDay ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => {
                          const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.expense;
                          return (
                            <div
                              key={event.id}
                              className="group/event relative flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium ${cfg.bg} truncate cursor-default"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.color} ${event.urgent ? "animate-pulse" : ""}`} />
                              <span className="truncate">{event.title}</span>
                              {/* Enhanced tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/event:block z-20 min-w-[160px]">
                                <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white shadow-xl">
                                  <div className="font-bold mb-0.5">{event.title}</div>
                                  <div className="text-slate-400">{cfg.label}{event.urgent ? ' ⚠️' : ''}</div>
                                  {event.amount != null && event.amount > 0 && <div className="text-slate-300">${event.amount.toFixed(2)}</div>}
                                  {event.platformName && <div className="text-slate-500">{event.platformName}</div>}
                                  {event.projectName && <div className="text-slate-500">{event.projectName}</div>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Trailing empty cells */}
                {Array.from({ length: (7 - ((startDayOfWeek + days.length) % 7)) % 7 }).map((_, i) => (
                  <div key={`trail-${i}`} className="min-h-[80px] border-r-0 border-b-0 bg-muted/10" />
                ))}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading events...
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
            {isLoading ? (
              <div className="py-10 text-center animate-pulse">
                <div className="h-5 w-32 bg-slate-700/30 rounded mx-auto mb-2" />
                <div className="h-4 w-20 bg-slate-700/20 rounded mx-auto" />
              </div>
            ) : !hasAnyEvents && !selectedDay ? (
              <div className="py-10 text-center">
                <CalendarDays className="mx-auto text-slate-600 mb-3" size={24} />
                <div className="text-sm text-muted-foreground">No events — add expenses or subscriptions to get started</div>
              </div>
            ) : selectedDay ? (
              <>
                <div className="mb-4">
                  <div className="text-lg font-semibold">{format(selectedDay, "EEEE, MMMM d")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectedDayEvents.length === 0
                      ? "No events"
                      : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? "s" : ""}`}
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled</div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.expense;
                      return (
                        <div key={event.id} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
                              {cfg.label}
                              {event.urgent && <span className="text-red-400 font-bold">!</span>}
                            </div>
                            {event.amount !== null && event.amount !== undefined && event.amount > 0 && (
                              <span className="font-mono text-sm font-bold">${event.amount.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="text-sm font-medium leading-snug">{event.title}</div>
                          {event.platformName && (
                            <div className="text-xs text-muted-foreground">Platform: {event.platformName}</div>
                          )}
                          {event.projectName && (
                            <div className="text-xs text-muted-foreground">Project: {event.projectName}</div>
                          )}
                          <div className="text-[10px] text-slate-600 italic">{EVENT_TOOLTIP_DETAIL[event.type] || ''}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="py-10 text-center">
                <div className="text-sm text-muted-foreground">Click any day to see its events</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
