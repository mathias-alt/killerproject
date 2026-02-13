"use client";

import { useMemo, useState } from "react";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useProfiles } from "@/hooks/use-profiles";
import { useRealtimeAllTasks } from "@/hooks/use-realtime";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Filter, Clock, CheckSquare, Calendar } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import type { TaskWithProject, TaskPriority } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type SortOption = "priority" | "due_date";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-200/70 text-slate-700 dark:bg-slate-600/30 dark:text-slate-200",
  medium: "bg-blue-200/70 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200",
  high: "bg-amber-200/70 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
  urgent: "bg-rose-200/70 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200",
};

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export default function TodayPage() {
  const { tasks, setTasks, loading, updateTask, deleteTask, createSubtask, toggleSubtask, getSubtasks, refetch } =
    useAllTasks();
  const { projects } = useProjects();
  const { profiles } = useProfiles();

  useRealtimeAllTasks(setTasks, refetch);

  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [projectFilter, setProjectFilter] = useState("all");

  // Calculate subtask counts
  const subtaskCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};
    for (const task of tasks) {
      if (task.parent_task_id) {
        if (!counts[task.parent_task_id]) {
          counts[task.parent_task_id] = { total: 0, completed: 0 };
        }
        counts[task.parent_task_id].total++;
        if (task.status === "done") {
          counts[task.parent_task_id].completed++;
        }
      }
    }
    return counts;
  }, [tasks]);

  // Filter and sort tasks
  const todayTasks = useMemo(() => {
    const today = startOfDay(new Date());

    return tasks
      .filter((task) => {
        // Only in_progress tasks
        if (task.status !== "in_progress") return false;
        // Exclude subtasks
        if (task.parent_task_id) return false;
        // Project filter
        if (projectFilter !== "all" && task.project_id !== projectFilter) return false;
        // Include if: no dates set, or start_date <= today, or end_date includes today
        if (!task.start_date && !task.end_date) return true;
        if (task.start_date) {
          const startDate = startOfDay(new Date(task.start_date));
          if (isBefore(today, startDate)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        }
        // Sort by due date
        const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
        const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [tasks, sortBy, projectFilter]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6 p-5 md:p-8">
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] md:px-7 md:py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Focus</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Today</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tasks in progress that need your attention today.
        </p>
      </section>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/70 bg-background/65 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 w-full sm:w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {projects && projects.length > 0 && (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 w-full sm:w-[180px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <span className="text-xs text-muted-foreground sm:ml-auto">
            {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Task list */}
        <div className="divide-y divide-border/50">
          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">All caught up!</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                No tasks in progress for today.
              </p>
            </div>
          ) : (
            todayTasks.map((task) => {
              const subtaskCount = subtaskCounts[task.id];
              const isOverdue = task.end_date && isBefore(new Date(task.end_date), startOfDay(new Date()));
              const isDueToday = task.end_date && isToday(new Date(task.end_date));

              return (
                <div
                  key={task.id}
                  className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-6"
                  onClick={() => {
                    setSelectedTask(task);
                    setDialogOpen(true);
                  }}
                >
                  {/* Project color indicator */}
                  <div
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: task.project?.color ?? "#666" }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.project?.name ?? "No project"}
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn("shrink-0 text-xs", priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {task.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatHours(task.estimated_hours)}
                        </span>
                      )}
                      {subtaskCount && subtaskCount.total > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {subtaskCount.completed}/{subtaskCount.total}
                        </span>
                      )}
                      {task.end_date && (
                        <span className={cn(
                          "flex items-center gap-1",
                          isOverdue && "text-destructive",
                          isDueToday && "text-amber-600 dark:text-amber-400"
                        )}>
                          <Calendar className="h-3 w-3" />
                          {isOverdue ? "Overdue" : isDueToday ? "Due today" : format(new Date(task.end_date), "MMM d")}
                        </span>
                      )}
                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">{getInitials(task.assignee.full_name)}</AvatarFallback>
                          </Avatar>
                          <span>{task.assignee.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        profiles={profiles}
        subtasks={selectedTask ? getSubtasks(selectedTask.id) : undefined}
        onSubmit={async (data, assigneeIds) => {
          if (selectedTask) await updateTask(selectedTask.id, data, assigneeIds);
        }}
        onDelete={
          selectedTask
            ? async () => {
                await deleteTask(selectedTask.id);
                setDialogOpen(false);
              }
            : undefined
        }
        onCreateSubtask={
          selectedTask
            ? async (title) => {
                await createSubtask(selectedTask.id, title);
              }
            : undefined
        }
        onToggleSubtask={async (subtaskId, completed) => {
          await toggleSubtask(subtaskId, completed);
        }}
        onDeleteSubtask={async (subtaskId) => {
          await deleteTask(subtaskId);
        }}
      />
    </div>
  );
}
