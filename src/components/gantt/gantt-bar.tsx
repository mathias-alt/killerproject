"use client";

import { useRef, useState, useCallback } from "react";
import { differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const statusColors: Record<string, { bg: string; progress: string }> = {
  backlog: { bg: "bg-slate-400", progress: "bg-slate-500" },
  todo: { bg: "bg-blue-400", progress: "bg-blue-500" },
  in_progress: { bg: "bg-amber-400", progress: "bg-amber-500" },
  in_review: { bg: "bg-purple-400", progress: "bg-purple-500" },
  done: { bg: "bg-green-400", progress: "bg-green-500" },
};

function hasProject(task: TaskWithAssignee): task is TaskWithProject {
  return "project" in task && (task as TaskWithProject).project != null;
}

// Darken a hex color by a percentage (for progress fill)
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

interface GanttBarProps {
  task: TaskWithAssignee;
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  onClick: () => void;
  onDragEnd?: (newStartDate: string, newEndDate: string) => void;
  onResizeEnd?: (newEndDate: string) => void;
  onDependencyDragStart?: (taskId: string, side: "start" | "end") => void;
  onDependencyDragEnd?: (taskId: string) => void;
  isDependencyDragging?: boolean;
  isValidDropTarget?: boolean;
}

export function GanttBar({
  task,
  timelineStart,
  dayWidth,
  rowHeight,
  onClick,
  onDragEnd,
  onResizeEnd,
  onDependencyDragStart,
  onDependencyDragEnd,
  isDependencyDragging,
  isValidDropTarget,
}: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const didDrag = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasDates = Boolean(task.start_date && task.end_date);
  const startMs = hasDates ? new Date(task.start_date!).getTime() : 0;
  const endMs = hasDates ? new Date(task.end_date!).getTime() : 0;
  const startDate = hasDates ? new Date(startMs) : timelineStart;
  const endDate = hasDates ? new Date(endMs) : timelineStart;

  const offsetDays = differenceInDays(startDate, timelineStart);
  const durationDays = differenceInDays(endDate, startDate) + 1;
  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  // Calculate progress
  let progress = 0;
  if (task.status === "done") {
    progress = 100;
  } else if (task.actual_hours && task.estimated_hours && task.estimated_hours > 0) {
    progress = Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100));
  }

  const barHeight = rowHeight - 10;
  const barTop = 5;

  // Use project color if available, otherwise fall back to status colors
  const projectColor = hasProject(task) ? task.project!.color : null;
  const statusColor = statusColors[task.status] || statusColors.todo;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: "move" | "resize") => {
      if (!hasDates) return;
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
          const newStart = new Date(startMs);
          newStart.setDate(newStart.getDate() + daysDelta);
          const newEnd = new Date(endMs);
          newEnd.setDate(newEnd.getDate() + daysDelta);
          onDragEnd?.(newStart.toISOString().split("T")[0], newEnd.toISOString().split("T")[0]);
        } else {
          const newEnd = new Date(endMs);
          newEnd.setDate(newEnd.getDate() + daysDelta);
          if (newEnd.getTime() >= startMs) {
            onResizeEnd?.(newEnd.toISOString().split("T")[0]);
          }
        }
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [dayWidth, endMs, hasDates, left, onDragEnd, onResizeEnd, startMs, width]
  );

  const handleDependencyHandleMouseDown = useCallback(
    (e: React.MouseEvent, side: "start" | "end") => {
      e.stopPropagation();
      e.preventDefault();
      onDependencyDragStart?.(task.id, side);
    },
    [task.id, onDependencyDragStart]
  );

  const handleMouseUp = useCallback(() => {
    if (isDependencyDragging && isValidDropTarget) {
      onDependencyDragEnd?.(task.id);
    }
  }, [isDependencyDragging, isValidDropTarget, task.id, onDependencyDragEnd]);

  const showHandles = isHovered || isDependencyDragging;

  const isDone = task.status === "done";

  if (!hasDates) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={barRef}
          className={cn(
            "absolute flex cursor-pointer items-center overflow-visible rounded-md select-none shadow-sm transition-all",
            !projectColor && statusColor.bg,
            isDragging && "opacity-80 shadow-md scale-[0.995]",
            isDependencyDragging && isValidDropTarget && "ring-2 ring-primary ring-offset-1 ring-offset-background",
            isDependencyDragging && !isValidDropTarget && "opacity-50"
          )}
          style={{
            left,
            width,
            top: barTop,
            height: barHeight,
            ...(projectColor && { backgroundColor: projectColor }),
          }}
          onClick={() => { if (!didDrag.current) onClick(); }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onMouseUp={handleMouseUp}
        >
          {/* Green diagonal stripes overlay for done tasks */}
          {isDone && (
            <div
              className="absolute inset-0 rounded overflow-hidden pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 4px,
                  rgba(34, 197, 94, 0.45) 4px,
                  rgba(34, 197, 94, 0.45) 8px
                )`,
              }}
            />
          )}

          {/* Progress fill */}
          {progress > 0 && progress < 100 && (
            <div
              className={cn("absolute inset-y-0 left-0 rounded-l opacity-60", !projectColor && statusColor.progress)}
              style={{
                width: `${progress}%`,
                ...(projectColor && { backgroundColor: darkenColor(projectColor, 0.15) }),
              }}
            />
          )}

          {/* Left dependency handle (for incoming connections) */}
          {showHandles && onDependencyDragStart && (
            <div
              className="absolute -left-2 top-1/2 z-20 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-muted-foreground bg-background transition-colors hover:border-primary hover:bg-primary/20"
              onMouseDown={(e) => handleDependencyHandleMouseDown(e, "start")}
              title="Drag to create dependency"
            />
          )}

          {/* Task label */}
          <span className="relative z-10 px-2 text-xs text-white font-medium truncate">
            {task.title}
          </span>

          {/* Right dependency handle (for outgoing connections) */}
          {showHandles && onDependencyDragStart && (
            <div
              className="absolute -right-2 top-1/2 z-20 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-muted-foreground bg-background transition-colors hover:border-primary hover:bg-primary/20"
              onMouseDown={(e) => handleDependencyHandleMouseDown(e, "end")}
              title="Drag to create dependency"
            />
          )}

          {/* Resize handle */}
          {onResizeEnd && (
            <div
              className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize hover:bg-black/10"
              onMouseDown={(e) => handleMouseDown(e, "resize")}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{task.title}</p>
          {hasProject(task) && (
            <p className="text-xs flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.project!.color }}
              />
              {task.project!.name}
            </p>
          )}
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
