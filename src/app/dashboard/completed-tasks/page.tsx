"use client";

import { useState, useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, CheckCircle2, Clock, TrendingUp, FolderOpen, AlertCircle } from "lucide-react";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useRealtimeAllTasks } from "@/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_LABELS } from "@/lib/types/database";
import type { DateRange } from "react-day-picker";

export default function CompletedTasksPage() {
  const { tasks, setTasks, loading, refetch } = useAllTasks();
  const { projects } = useProjects();
  useRealtimeAllTasks(setTasks, refetch);

  // Filter state — default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Filtered completed tasks
  const completedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.status !== "done") return false;
        if (!task.completed_at) return false;

        // Project filter
        if (selectedProjectId !== "all" && task.project_id !== selectedProjectId) return false;

        // Date range filter
        const completedDate = new Date(task.completed_at);
        if (dateRange?.from && completedDate < startOfDay(dateRange.from)) return false;
        if (dateRange?.to && completedDate > endOfDay(dateRange.to)) return false;

        return true;
      })
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  }, [tasks, dateRange, selectedProjectId]);

  // Stats
  const stats = useMemo(() => {
    const count = completedTasks.length;
    const actualHours = completedTasks.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0);
    const estimatedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
    const projectCount = new Set(completedTasks.map((t) => t.project_id)).size;
    return { count, actualHours, estimatedHours, projectCount };
  }, [completedTasks]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Completed Tasks</h2>
        <p className="text-sm text-muted-foreground">
          View all tasks completed within a date range
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} –{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                "Pick a date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          Showing {completedTasks.length} task{completedTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.count}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actualHours}h</p>
                <p className="text-xs text-muted-foreground">Actual Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-purple-100 p-2 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.estimatedHours}h</p>
                <p className="text-xs text-muted-foreground">Estimated Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-100 p-2 dark:bg-orange-900/30">
                <FolderOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.projectCount}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-muted-foreground">Loading tasks...</div>
      ) : completedTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-1">No completed tasks found</p>
          <p className="text-sm">Try adjusting the date range or project filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {completedTasks.map((task) => {
            const missingHours = task.actual_hours == null;
            return (
              <Card key={task.id} className={cn(missingHours && "border-destructive border-2")}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="font-medium truncate">{task.title}</span>
                        <Badge variant="outline" className="shrink-0">
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </div>
                      {task.project && (
                        <div className="mt-1 flex items-center gap-2 ml-6">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: task.project.color }}
                          />
                          <span className="text-sm text-muted-foreground truncate">
                            {task.project.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(task.completed_at!), "MMM d, yyyy")}
                      </span>
                      {task.actual_hours != null ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          {task.actual_hours}h logged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          No hours
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
