import { useState } from "react";
import { useGetCalendarEvents } from "@workspace/api-client-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
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

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells before month start */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/40 bg-muted/10" />
              ))}

              {days.map((day, idx) => {
                const dayEvents = eventsForDay(day);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isTodayDay = isToday(day);
                const isLastRow = idx >= days.length - (7 - ((startDayOfWeek + days.length) % 7 || 7));

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
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium ${cfg.bg} truncate`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.color} ${event.urgent ? "animate-pulse" : ""}`} />
                            <span className="truncate">{event.title}</span>
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
          </div>

          {isLoading && (
            <div className="mt-4 text-center text-sm text-muted-foreground">Loading events…</div>
          )}
        </div>

        {/* Day detail panel */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
            {selectedDay ? (
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
                            <div className="text-xs text-muted-foreground">{event.platformName}</div>
                          )}
                          {event.projectName && (
                            <div className="text-xs text-muted-foreground">{event.projectName}</div>
                          )}
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
