"use client";

import { useRef, useState, useCallback } from "react";
import { differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskWithAssignee } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const statusColors: Record<string, { bg: string; progress: string }> = {
  backlog: { bg: "bg-slate-400", progress: "bg-slate-500" },
  todo: { bg: "bg-blue-400", progress: "bg-blue-500" },
  in_progress: { bg: "bg-amber-400", progress: "bg-amber-500" },
  in_review: { bg: "bg-purple-400", progress: "bg-purple-500" },
  done: { bg: "bg-green-400", progress: "bg-green-500" },
};

interface GanttBarProps {
  task: TaskWithAssignee;
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  onClick: () => void;
  onDragEnd?: (newStartDate: string, newEndDate: string) => void;
  onResizeEnd?: (newEndDate: string) => void;
}

export function GanttBar({ task, timelineStart, dayWidth, rowHeight, onClick, onDragEnd, onResizeEnd }: GanttBarProps) {
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

  // Calculate progress: if task is done, 100%. Otherwise, based on actual/estimated hours
  let progress = 0;
  if (task.status === "done") {
    progress = 100;
  } else if (task.actual_hours && task.estimated_hours && task.estimated_hours > 0) {
    progress = Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100));
  }

  const barHeight = rowHeight - 10; // Leave some padding
  const barTop = 5;
  const colors = statusColors[task.status] || statusColors.todo;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: "move" | "resize") => {
      if (mode === "move" && !onDragEnd) return;
      if (mode === "resize" && !onResizeEnd) return;
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
          onDragEnd?.(newStart.toISOString().split("T")[0], newEnd.toISOString().split("T")[0]);
        } else {
          const newEnd = new Date(end);
          newEnd.setDate(newEnd.getDate() + daysDelta);
          if (newEnd >= start) {
            onResizeEnd?.(newEnd.toISOString().split("T")[0]);
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
            "absolute rounded cursor-pointer flex items-center overflow-hidden select-none shadow-sm",
            colors.bg,
            isDragging && "opacity-80 shadow-md"
          )}
          style={{ left, width, top: barTop, height: barHeight }}
          onClick={() => { if (!didDrag.current) onClick(); }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
        >
          {/* Progress fill */}
          {progress > 0 && progress < 100 && (
            <div
              className={cn("absolute inset-y-0 left-0 opacity-60", colors.progress)}
              style={{ width: `${progress}%` }}
            />
          )}

          {/* Task label */}
          <span className="relative z-10 px-2 text-xs text-white font-medium truncate">
            {task.title}
          </span>

          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-black/10"
            onMouseDown={(e) => handleMouseDown(e, "resize")}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.start_date} → {task.end_date}
          </p>
          {task.estimated_hours && (
            <p className="text-xs text-muted-foreground">
              {task.actual_hours ?? 0}h / {task.estimated_hours}h
              {progress > 0 && ` (${progress}%)`}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
