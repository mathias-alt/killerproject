"use client";

import { useEffect, useMemo, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Column } from "./column";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TASK_STATUSES, TASK_PRIORITY_LABELS } from "@/lib/types/database";
import type { Task, TaskStatus, TaskPriority, TaskWithAssignee, Project, Profile } from "@/lib/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Filter } from "lucide-react";

type SortOption = "order" | "date" | "priority" | "project";
type FilterState = {
  projectId: string;
  priority: string;
  assigneeId: string;
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface KanbanBoardProps {
  tasks: TaskWithAssignee[];
  projects?: Project[];
  profiles?: Profile[];
  onCreateTask: (data: Partial<Task> & { title: string }, assigneeIds?: string[]) => Promise<{ data: unknown; error: unknown }>;
  onUpdateTask: (id: string, updates: Partial<Task>, assigneeIds?: string[]) => Promise<{ data: unknown; error: unknown }>;
  onDeleteTask: (id: string) => Promise<{ error: unknown }>;
  onMoveTask: (id: string, status: TaskStatus, order: number) => Promise<{ data: unknown; error: unknown }>;
  onCreateSubtask?: (parentTaskId: string, title: string) => Promise<{ data: unknown; error: unknown }>;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => Promise<{ data: unknown; error: unknown }>;
  getSubtasks?: (parentTaskId: string) => TaskWithAssignee[];
}

export function KanbanBoard({ tasks, projects, profiles, onCreateTask, onUpdateTask, onDeleteTask, onMoveTask, onCreateSubtask, onToggleSubtask, getSubtasks }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dndEnabled, setDndEnabled] = useState(true);

  // Sorting & filtering state
  const [sortBy, setSortBy] = useState<SortOption>("order");
  const [filters, setFilters] = useState<FilterState>({
    projectId: "all",
    priority: "all",
    assigneeId: "all",
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => {
      setDndEnabled(!mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const dndActive = dndEnabled && sortBy === "order";

  // Filter tasks (exclude subtasks from main view)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Don't show subtasks in the main kanban view
      if (task.parent_task_id) return false;
      if (filters.projectId !== "all" && task.project_id !== filters.projectId) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.assigneeId !== "all" && task.assignee_id !== filters.assigneeId) return false;
      return true;
    });
  }, [tasks, filters]);

  // Sort tasks within a status column
  function getTasksByStatus(status: TaskStatus) {
    const statusTasks = filteredTasks.filter((t) => t.status === status);

    switch (sortBy) {
      case "date":
        return statusTasks.sort((a, b) => {
          const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
          const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
          return dateA - dateB;
        });
      case "priority":
        return statusTasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      case "project":
        return statusTasks.sort((a, b) => {
          const projA = projects?.find((p) => p.id === a.project_id)?.name ?? "";
          const projB = projects?.find((p) => p.id === b.project_id)?.name ?? "";
          return projA.localeCompare(projB);
        });
      default:
        return statusTasks.sort((a, b) => a.order - b.order);
    }
  }

  // Calculate hours for a status column
  function getHoursForStatus(status: TaskStatus) {
    const statusTasks = filteredTasks.filter((t) => t.status === status);
    const estimated = statusTasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
    const actual = statusTasks.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0);
    return { estimated, actual };
  }

  // Calculate subtask counts for each parent task
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

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;
    const newOrder = destination.index;
    onMoveTask(draggableId, newStatus, newOrder);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)]">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-background/65 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 w-full sm:w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Manual Order</SelectItem>
                <SelectItem value="date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                {projects && projects.length > 0 && (
                  <SelectItem value="project">Project</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {projects && projects.length > 0 && (
              <Select
                value={filters.projectId}
                onValueChange={(v) => setFilters((filterState) => ({ ...filterState, projectId: v }))}
              >
                <SelectTrigger className="h-8 w-full sm:w-[150px]">
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

            <Select
              value={filters.priority}
              onValueChange={(v) => setFilters((filterState) => ({ ...filterState, priority: v }))}
            >
              <SelectTrigger className="h-8 w-full sm:w-[120px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {profiles && profiles.length > 0 && (
              <Select
                value={filters.assigneeId}
                onValueChange={(v) => setFilters((filterState) => ({ ...filterState, assigneeId: v }))}
              >
                <SelectTrigger className="h-8 w-full sm:w-[150px]">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            Showing {filteredTasks.length} of {tasks.filter((task) => !task.parent_task_id).length} tasks
            {!dndEnabled && <span className="ml-2 text-muted-foreground/70">• På mobil flytter du status via oppgavekort</span>}
            {dndEnabled && sortBy !== "order" && <span className="ml-2 text-muted-foreground/70">• Velg Manual Order for drag and drop</span>}
          </div>
        </div>

        {dndActive ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto bg-[linear-gradient(180deg,transparent,oklch(0.9_0.01_252/0.08))] p-3 sm:gap-4 sm:p-4">
              {TASK_STATUSES.map((status) => {
                const hours = getHoursForStatus(status);
                return (
                  <Column
                    key={status}
                    status={status}
                    tasks={getTasksByStatus(status)}
                  estimatedHours={hours.estimated}
                  actualHours={hours.actual}
                  subtaskCounts={subtaskCounts}
                  dndEnabled={dndActive}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                    setEditDialogOpen(true);
                    }}
                    onAddTask={(nextStatus) => {
                      setNewTaskStatus(nextStatus);
                      setCreateDialogOpen(true);
                    }}
                  />
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <div className="flex gap-3 overflow-x-auto bg-[linear-gradient(180deg,transparent,oklch(0.9_0.01_252/0.08))] p-3 sm:gap-4 sm:p-4">
            {TASK_STATUSES.map((status) => {
              const hours = getHoursForStatus(status);
              return (
                <Column
                  key={status}
                  status={status}
                  tasks={getTasksByStatus(status)}
                  estimatedHours={hours.estimated}
                  actualHours={hours.actual}
                  subtaskCounts={subtaskCounts}
                  dndEnabled={false}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                    setEditDialogOpen(true);
                  }}
                  onAddTask={(nextStatus) => {
                    setNewTaskStatus(nextStatus);
                    setCreateDialogOpen(true);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <TaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        profiles={profiles}
        subtasks={selectedTask && getSubtasks ? getSubtasks(selectedTask.id) : undefined}
        onSubmit={async (data, assigneeIds) => {
          if (selectedTask) await onUpdateTask(selectedTask.id, data, assigneeIds);
        }}
        onDelete={
          selectedTask
            ? async () => {
                await onDeleteTask(selectedTask.id);
                setEditDialogOpen(false);
              }
            : undefined
        }
        onCreateSubtask={
          selectedTask && onCreateSubtask
            ? async (title) => {
                await onCreateSubtask(selectedTask.id, title);
              }
            : undefined
        }
        onToggleSubtask={
          onToggleSubtask
            ? async (subtaskId, completed) => {
                await onToggleSubtask(subtaskId, completed);
              }
            : undefined
        }
        onDeleteSubtask={
          async (subtaskId) => {
            await onDeleteTask(subtaskId);
          }
        }
      />

      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStatus={newTaskStatus ?? "todo"}
        projects={projects}
        profiles={profiles}
        onSubmit={async (data, assigneeIds) => {
          await onCreateTask(data, assigneeIds);
        }}
      />
    </>
  );
}
