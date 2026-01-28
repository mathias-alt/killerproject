"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/types/database";
import type { Task, TaskStatus, TaskPriority, Project } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  projects?: Project[];
  onSubmit: (data: Partial<Task> & { title: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TaskDialog({ open, onOpenChange, task, defaultStatus, projects, onSubmit, onDelete }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);

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
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus ?? "todo");
      setPriority("medium");
      setDateRange(undefined);
      setEstimatedHours("");
      setActualHours("");
      setProjectId(projects?.[0]?.id ?? "");
    }
  }, [task, defaultStatus, open, projects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      title,
      description: description || null,
      status,
      priority,
      start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null,
      end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      actual_hours: actualHours ? parseFloat(actualHours) : null,
      ...(projectId && { project_id: projectId }),
    });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
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
