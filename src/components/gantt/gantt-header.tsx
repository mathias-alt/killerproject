"use client";

import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, endOfWeek, startOfMonth, endOfMonth, differenceInDays, isSameMonth } from "date-fns";

export type ZoomLevel = "day" | "week" | "month";

interface GanttHeaderProps {
  startDate: Date;
  endDate: Date;
  zoom: ZoomLevel;
  dayWidth: number;
}

export function GanttHeader({ startDate, endDate, zoom, dayWidth }: GanttHeaderProps) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group days by month for the top row
  const monthGroups: { month: Date; days: number; width: number }[] = [];
  let currentMonth: Date | null = null;
  let currentCount = 0;

  days.forEach((day, i) => {
    if (!currentMonth || !isSameMonth(day, currentMonth)) {
      if (currentMonth) {
        monthGroups.push({ month: currentMonth, days: currentCount, width: currentCount * dayWidth });
      }
      currentMonth = startOfMonth(day);
      currentCount = 1;
    } else {
      currentCount++;
    }
    if (i === days.length - 1) {
      monthGroups.push({ month: currentMonth!, days: currentCount, width: currentCount * dayWidth });
    }
  });

  if (zoom === "day") {
    return (
      <div className="bg-background/70">
        {/* Top row: months */}
        <div className="flex border-b border-border/70 bg-muted/35">
          {monthGroups.map((group, i) => (
            <div
              key={i}
              className="shrink-0 border-r border-border/70 px-2 py-1.5 text-xs font-semibold text-foreground"
              style={{ width: group.width }}
            >
              {format(group.month, "MMMM yyyy")}
            </div>
          ))}
        </div>
        {/* Bottom row: days */}
        <div className="flex border-b border-border/70 bg-muted/15">
          {days.map((day) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div
                key={day.toISOString()}
                className={`shrink-0 border-r border-border/70 py-1 text-center text-[10px] ${isWeekend ? "bg-muted/35 text-muted-foreground" : "text-muted-foreground"}`}
                style={{ width: dayWidth }}
              >
                <div className="leading-tight">{format(day, "EEE")}</div>
                <div className="font-medium text-foreground leading-tight">{format(day, "d")}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (zoom === "week") {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    return (
      <div className="bg-background/70">
        {/* Top row: months */}
        <div className="flex border-b border-border/70 bg-muted/35">
          {monthGroups.map((group, i) => (
            <div
              key={i}
              className="shrink-0 border-r border-border/70 px-2 py-1.5 text-xs font-semibold text-foreground"
              style={{ width: group.width }}
            >
              {format(group.month, "MMMM yyyy")}
            </div>
          ))}
        </div>
        {/* Bottom row: weeks */}
        <div className="flex border-b border-border/70 bg-muted/15">
          {weeks.map((week) => {
            const end = endOfWeek(week, { weekStartsOn: 1 });
            const actualStart = week < startDate ? startDate : week;
            const actualEnd = end > endDate ? endDate : end;
            const numDays = differenceInDays(actualEnd, actualStart) + 1;
            return (
              <div
                key={week.toISOString()}
                className="shrink-0 border-r border-border/70 px-1 py-1 text-center text-[10px] text-muted-foreground"
                style={{ width: numDays * dayWidth }}
              >
                <div className="font-medium text-foreground">
                  {format(actualStart, "MMM d")} - {format(actualEnd, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Month zoom
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  return (
    <div className="bg-background/70">
      {/* Single row for months */}
      <div className="flex border-b border-border/70 bg-muted/25">
        {months.map((month) => {
          const mEnd = endOfMonth(month);
          const actualStart = month < startDate ? startDate : month;
          const actualEnd = mEnd > endDate ? endDate : mEnd;
          const numDays = differenceInDays(actualEnd, actualStart) + 1;
          return (
            <div
              key={month.toISOString()}
              className="shrink-0 border-r border-border/70 px-2 py-2 text-center text-xs font-semibold"
              style={{ width: numDays * dayWidth }}
            >
              {format(month, "MMMM yyyy")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export header height for use in other components
// These values must match the actual rendered height of the header rows
export const HEADER_HEIGHT = {
  day: 63,   // Month row + day row (measured from browser)
  week: 98,  // Month row + week row (measured from browser)
  month: 49, // Single month row (measured from browser)
};
