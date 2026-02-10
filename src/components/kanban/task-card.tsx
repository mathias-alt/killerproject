"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Clock, CheckSquare } from "lucide-react";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
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

export function TaskCard({ task, index, subtaskCount, onClick }: TaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "p-3 cursor-pointer hover:shadow-sm transition-shadow",
            snapshot.isDragging && "shadow-lg"
          )}
          onClick={onClick}
        >
          {hasProject(task) && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: (task as TaskWithProject).project!.color }}
              />
              <span className="text-[10px] font-medium text-muted-foreground truncate">
                {(task as TaskWithProject).project!.name}
              </span>
            </div>
          )}
          <p className="text-sm font-medium mb-2">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
            {task.estimated_hours && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatHours(task.estimated_hours)}
              </span>
            )}
            {subtaskCount && subtaskCount.total > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {subtaskCount.completed}/{subtaskCount.total}
              </span>
            )}
          </div>
          {(task.start_date && task.end_date) && (
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(task.start_date), "MMM d")} - {format(new Date(task.end_date), "MMM d")}
            </p>
          )}
          {task.assignee && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{getInitials(task.assignee.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assignee.full_name}</span>
            </div>
          )}
        </Card>
      )}
    </Draggable>
  );
}
