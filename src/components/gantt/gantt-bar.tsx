"use client";

import { useRef, useState, useCallback } from "react";
import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskWithAssignee } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  backlog: "bg-slate-400",
  todo: "bg-blue-400",
  in_progress: "bg-amber-400",
  in_review: "bg-purple-400",
  done: "bg-green-400",
};

interface GanttBarProps {
  task: TaskWithAssignee;
  timelineStart: Date;
  dayWidth: number;
  onClick: () => void;
  onDragEnd: (newStartDate: string, newEndDate: string) => void;
  onResizeEnd: (newEndDate: string) => void;
}

export function GanttBar({ task, timelineStart, dayWidth, onClick, onDragEnd, onResizeEnd }: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const didDrag = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!task.start_date || !task.end_date) return null;

  const start = new Date(task.start_date);
  const end = new Date(task.end_date);
  const offsetDays = differenceInDays(start, timelineStart);
  const durationDays = differenceInDays(end, start) + 1;
  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: "move" | "resize") => {
      e.stopPropagation();
      e.preventDefault();
      didDrag.current = false;
      setIsDragging(true);
      const startX = e.clientX;
      const origLeft = left;
      const origWidth = width;

      function onMouseMove(ev: MouseEvent) {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) > 3) didDrag.current = true;
        const daysDelta = Math.round(dx / dayWidth);
        if (mode === "move" && barRef.current) {
          barRef.current.style.left = `${origLeft + daysDelta * dayWidth}px`;
        } else if (mode === "resize" && barRef.current) {
          barRef.current.style.width = `${Math.max(dayWidth, origWidth + daysDelta * dayWidth)}px`;
        }
      }

      function onMouseUp(ev: MouseEvent) {
        const dx = ev.clientX - startX;
        const daysDelta = Math.round(dx / dayWidth);
        setIsDragging(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (daysDelta === 0) return;

        if (mode === "move") {
          const newStart = new Date(start);
          newStart.setDate(newStart.getDate() + daysDelta);
          const newEnd = new Date(end);
          newEnd.setDate(newEnd.getDate() + daysDelta);
          onDragEnd(newStart.toISOString().split("T")[0], newEnd.toISOString().split("T")[0]);
        } else {
          const newEnd = new Date(end);
          newEnd.setDate(newEnd.getDate() + daysDelta);
          if (newEnd >= start) {
            onResizeEnd(newEnd.toISOString().split("T")[0]);
          }
        }
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [dayWidth, left, width, start, end, onDragEnd, onResizeEnd]
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={barRef}
          className={cn(
            "absolute top-1 h-7 rounded-md cursor-pointer flex items-center px-2 text-xs text-white font-medium select-none",
            statusColors[task.status],
            isDragging && "opacity-80"
          )}
          style={{ left, width }}
          onClick={() => { if (!didDrag.current) onClick(); }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
        >
          <span className="truncate">{task.title}</span>
          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
            onMouseDown={(e) => handleMouseDown(e, "resize")}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{task.title}</p>
        <p className="text-xs text-muted-foreground">
          {task.start_date} → {task.end_date}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
