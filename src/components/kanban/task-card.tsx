"use client";

import { useRef, type PointerEvent } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Clock, CheckSquare, AlertCircle } from "lucide-react";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const priorityColors: Record<string, string> = {
  low: "bg-slate-200/70 text-slate-700 dark:bg-slate-600/30 dark:text-slate-200",
  medium: "bg-blue-200/70 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200",
  high: "bg-amber-200/70 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
  urgent: "bg-rose-200/70 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200",
};

interface SubtaskCount {
  total: number;
  completed: number;
}

interface TaskCardProps {
  task: TaskWithAssignee;
  index: number;
  subtaskCount?: SubtaskCount;
  onClick: () => void;
  dndEnabled?: boolean;
}

function hasProject(task: TaskWithAssignee): task is TaskWithProject {
  return "project" in task && (task as TaskWithProject).project != null;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function TaskCard({ task, index, subtaskCount, onClick, dndEnabled = true }: TaskCardProps) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedDuringPointerRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    movedDuringPointerRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(event.clientX - pointerStartRef.current.x);
    const dy = Math.abs(event.clientY - pointerStartRef.current.y);
    if (dx + dy > 6) movedDuringPointerRef.current = true;
  };

  const handleCardClick = () => {
    if (!movedDuringPointerRef.current) onClick();
    pointerStartRef.current = null;
    movedDuringPointerRef.current = false;
  };

  // Check if task is done but missing actual hours
  const isDone = task.status === "done";
  const missingActualHours = isDone && !task.actual_hours;

  const baseClassName = cn(
    "rounded-xl border bg-card/90 p-3 text-card-foreground shadow-[0_8px_20px_-16px_oklch(0.22_0.02_258/0.45)] backdrop-blur-none",
    missingActualHours ? "border-destructive border-2" : "border-border/70"
  );
  const interactiveClassName =
    "cursor-pointer transition-shadow duration-150 hover:shadow-md";

  const content = (
    <>
      {hasProject(task) && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: (task as TaskWithProject).project!.color }}
          />
          <span className="truncate text-[10px] font-medium text-muted-foreground">
            {(task as TaskWithProject).project!.name}
          </span>
        </div>
      )}
      <p className="mb-2 text-sm font-medium">{task.title}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>
          {task.priority}
        </Badge>
        {/* Show actual hours for done tasks, estimated hours for others */}
        {isDone ? (
          task.actual_hours ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Clock className="h-3 w-3" />
              {formatHours(task.actual_hours)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              No hours
            </span>
          )
        ) : (
          task.estimated_hours && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatHours(task.estimated_hours)}
            </span>
          )
        )}
        {subtaskCount && subtaskCount.total > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            {subtaskCount.completed}/{subtaskCount.total}
          </span>
        )}
      </div>
      {(task.start_date && task.end_date) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {format(new Date(task.start_date), "MMM d")} - {format(new Date(task.end_date), "MMM d")}
        </p>
      )}
      {task.assignee && (
        <div className="mt-2 flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assignee.avatar_url ?? undefined} />
            <AvatarFallback className="text-[9px]">{getInitials(task.assignee.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{task.assignee.full_name}</span>
        </div>
      )}
    </>
  );

  if (!dndEnabled) {
    return (
      <div
        className={cn(baseClassName, interactiveClassName)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={handleCardClick}
      >
        {content}
      </div>
    );
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => {
        const draggableStyle = provided.draggableProps.style as CSSProperties | undefined;
        return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            baseClassName,
            "cursor-grab active:cursor-grabbing",
            !snapshot.isDragging && interactiveClassName,
            snapshot.isDragging && "cursor-grabbing shadow-xl ring-1 ring-primary/25"
          )}
          style={{
            ...draggableStyle,
            zIndex: snapshot.isDragging ? 60 : draggableStyle?.zIndex,
            opacity: 1,
            transitionDuration: snapshot.isDropAnimating ? "120ms" : undefined,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onClick={handleCardClick}
        >
          {content}
        </div>
        );
      }}
    </Draggable>
  );
}
