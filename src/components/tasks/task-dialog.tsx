"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, X, Plus, Check, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/types/database";
import type { Task, TaskStatus, TaskPriority, Project, Profile, TaskWithAssignee } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  projects?: Project[];
  profiles?: Profile[];
  assigneeIds?: string[];
  subtasks?: TaskWithAssignee[];
  onSubmit: (data: Partial<Task> & { title: string }, assigneeIds?: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCreateSubtask?: (title: string) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => Promise<void>;
  onDeleteSubtask?: (subtaskId: string) => Promise<void>;
}

export function TaskDialog({ open, onOpenChange, task, defaultStatus, projects, profiles, assigneeIds: initialAssigneeIds, subtasks, onSubmit, onDelete, onCreateSubtask, onToggleSubtask, onDeleteSubtask }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDateRange(
        task.start_date && task.end_date
          ? { from: new Date(task.start_date + "T00:00:00"), to: new Date(task.end_date + "T00:00:00") }
          : task.start_date
            ? { from: new Date(task.start_date + "T00:00:00"), to: undefined }
            : undefined
      );
      setEstimatedHours(task.estimated_hours?.toString() ?? "");
      setActualHours(task.actual_hours?.toString() ?? "");
      setProjectId(task.project_id);
      setSelectedAssignees(initialAssigneeIds ?? (task.assignee_id ? [task.assignee_id] : []));
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus ?? "todo");
      setPriority("medium");
      setDateRange(undefined);
      setEstimatedHours("");
      setActualHours("");
      setProjectId(projects?.[0]?.id ?? "");
      setSelectedAssignees([]);
    }
  }, [task, defaultStatus, open, projects, initialAssigneeIds]);

  function toggleAssignee(userId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(
      {
        title,
        description: description || null,
        status,
        priority,
        start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null,
        end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        actual_hours: actualHours ? parseFloat(actualHours) : null,
        assignee_id: selectedAssignees[0] ?? null,
        ...(projectId && { project_id: projectId }),
      },
      selectedAssignees
    );
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the task details below." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {projects && projects.length > 0 && !task && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => {
                const newStatus = v as TaskStatus;
                setStatus(newStatus);
                if (newStatus === "done" && !actualHours && estimatedHours) {
                  setActualHours(estimatedHours);
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Multi-user Assignees */}
          {profiles && profiles.length > 0 && (
            <div className="space-y-2">
              <Label>Assignees</Label>
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedAssignees.map((userId) => {
                    const profile = profiles.find((p) => p.id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[8px]">{getInitials(profile?.full_name ?? null)}</AvatarFallback>
                        </Avatar>
                        {profile?.full_name || "Unknown"}
                        <button type="button" onClick={() => toggleAssignee(userId)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground font-normal">
                    {selectedAssignees.length === 0 ? "Select assignees..." : `${selectedAssignees.length} assigned`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => toggleAssignee(profile.id)}
                        className={cn(
                          "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                          selectedAssignees.includes(profile.id) && "bg-accent"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(profile.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{profile.full_name || "Unnamed"}</span>
                        {selectedAssignees.includes(profile.id) && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated-hours">Estimated Hours</Label>
              <Input id="estimated-hours" type="number" min="0" step="0.5" placeholder="e.g. 4" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-hours">Actual Hours</Label>
              <Input id="actual-hours" type="number" min="0" step="0.5" placeholder="e.g. 3.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
            </div>
          </div>

          {/* Subtasks - only show when editing an existing task */}
          {task && onCreateSubtask && (
            <div className="space-y-2">
              <Label>Subtasks</Label>
              <div className="space-y-2">
                {subtasks && subtasks.length > 0 && (
                  <div className="space-y-1">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <Checkbox
                          checked={subtask.status === "done"}
                          onCheckedChange={(checked) => onToggleSubtask?.(subtask.id, checked as boolean)}
                        />
                        <span className={cn("flex-1 text-sm", subtask.status === "done" && "line-through text-muted-foreground")}>
                          {subtask.title}
                        </span>
                        {onDeleteSubtask && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteSubtask(subtask.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtaskTitle.trim()) {
                        e.preventDefault();
                        onCreateSubtask(newSubtaskTitle.trim());
                        setNewSubtaskTitle("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!newSubtaskTitle.trim()}
                    onClick={() => {
                      if (newSubtaskTitle.trim()) {
                        onCreateSubtask(newSubtaskTitle.trim());
                        setNewSubtaskTitle("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            {task && onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            )}
            <Button type="submit" disabled={loading || (projects && !task && !projectId)}>
              {loading ? "Saving..." : task ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
