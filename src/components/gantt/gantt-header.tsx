"use client";

import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type ZoomLevel = "day" | "week" | "month";

interface GanttHeaderProps {
  startDate: Date;
  endDate: Date;
  zoom: ZoomLevel;
  dayWidth: number;
}

export function GanttHeader({ startDate, endDate, zoom, dayWidth }: GanttHeaderProps) {
  if (zoom === "day") {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return (
      <div className="flex border-b bg-muted/30 sticky top-0 z-10">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="shrink-0 border-r px-1 py-1 text-center text-xs text-muted-foreground"
            style={{ width: dayWidth }}
          >
            <div>{format(day, "EEE")}</div>
            <div className="font-medium text-foreground">{format(day, "d")}</div>
          </div>
        ))}
      </div>
    );
  }

  if (zoom === "week") {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    return (
      <div className="flex border-b bg-muted/30 sticky top-0 z-10">
        {weeks.map((week) => {
          const end = endOfWeek(week, { weekStartsOn: 1 });
          const days = Math.min(
            7,
            Math.ceil((Math.min(end.getTime(), endDate.getTime()) - Math.max(week.getTime(), startDate.getTime())) / 86400000) + 1
          );
          return (
            <div
              key={week.toISOString()}
              className="shrink-0 border-r px-2 py-2 text-center text-xs"
              style={{ width: days * dayWidth }}
            >
              <div className="text-muted-foreground">{format(week, "MMM")}</div>
              <div className="font-medium">{format(week, "d")} - {format(end, "d")}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // month
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  return (
    <div className="flex border-b bg-muted/30 sticky top-0 z-10">
      {months.map((month) => {
        const mEnd = endOfMonth(month);
        const actualStart = month < startDate ? startDate : month;
        const actualEnd = mEnd > endDate ? endDate : mEnd;
        const days = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 86400000) + 1;
        return (
          <div
            key={month.toISOString()}
            className="shrink-0 border-r px-2 py-2 text-center text-xs"
            style={{ width: days * dayWidth }}
          >
            <div className="font-medium">{format(month, "MMMM yyyy")}</div>
          </div>
        );
      })}
    </div>
  );
}
