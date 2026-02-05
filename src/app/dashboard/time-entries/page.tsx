"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useTimely } from "@/hooks/use-timely";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Clock,
  Link2,
  Unlink,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import type { TimelyTimeEntryWithTask, TaskWithProject } from "@/lib/types/database";

export default function TimeEntriesPage() {
  const {
    entries,
    isConnected,
    loading,
    syncing,
    getAuthUrl,
    syncEntries,
    disconnect,
    linkEntryToTask,
    unlinkEntry,
  } = useTimely();
  const { tasks } = useAllTasks();
  const { projects } = useProjects();

  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterLinked, setFilterLinked] = useState<string>("all");
  const [linkingEntry, setLinkingEntry] = useState<TimelyTimeEntryWithTask | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get unique Timely project names from entries
  const timelyProjects = useMemo(() => {
    const projectSet = new Set<string>();
    entries.forEach((entry) => {
      if (entry.project_name) projectSet.add(entry.project_name);
    });
    return Array.from(projectSet).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterProject !== "all" && entry.project_name !== filterProject) return false;
      if (filterLinked === "linked" && !entry.linked_task_id) return false;
      if (filterLinked === "unlinked" && entry.linked_task_id) return false;
      return true;
    });
  }, [entries, filterProject, filterLinked]);

  // Filter tasks for linking dialog
  const filteredTasks = useMemo(() => {
    if (!taskSearch) return tasks;
    const search = taskSearch.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        task.project?.name?.toLowerCase().includes(search)
    );
  }, [tasks, taskSearch]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = entries.length;
    const linked = entries.filter((e) => e.linked_task_id).length;
    const unlinked = total - linked;
    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    return { total, linked, unlinked, totalHours };
  }, [entries]);

  const handleConnect = () => {
    const url = getAuthUrl();
    if (url) {
      window.location.href = url;
    } else {
      setError("Timely integration is not configured");
    }
  };

  const handleSync = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await syncEntries();
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Timely?")) return;
    try {
      await disconnect();
      setSuccess("Disconnected from Timely");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  const handleLinkTask = async (task: TaskWithProject) => {
    if (!linkingEntry) return;
    setError(null);
    try {
      await linkEntryToTask(linkingEntry.id, task.id);
      setLinkingEntry(null);
      setTaskSearch("");
      setSuccess("Entry linked to task successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link entry");
    }
  };

  const handleUnlink = async (entry: TimelyTimeEntryWithTask) => {
    setError(null);
    try {
      await unlinkEntry(entry.id);
      setSuccess("Entry unlinked successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink entry");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">Loading time entries...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Time Entries</h1>
          <p className="text-sm text-muted-foreground">
            Sync and link Timely time entries to your tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
              <Button variant="ghost" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Timely
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to Timely</CardTitle>
            <CardDescription>
              Connect your Timely account to sync time entries and link them to tasks in KillerProject.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Timely
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Entries</CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Linked</CardDescription>
                <CardTitle className="text-2xl text-green-600">{stats.linked}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unlinked</CardDescription>
                <CardTitle className="text-2xl text-amber-600">{stats.unlinked}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Hours</CardDescription>
                <CardTitle className="text-2xl">{stats.totalHours.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Timely Projects</SelectItem>
                {timelyProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLinked} onValueChange={setFilterLinked}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="linked">Linked</SelectItem>
                <SelectItem value="unlinked">Unlinked</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground">
              Showing {filteredEntries.length} of {entries.length} entries
            </div>
          </div>

          {/* Entries list */}
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No time entries found. Click Sync to fetch entries from Timely.
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {Number(entry.hours).toFixed(2)}h
                          </span>
                          <span className="text-muted-foreground">
                            {format(new Date(entry.date + "T00:00:00"), "MMM d, yyyy")}
                          </span>
                          {entry.project_name && (
                            <Badge variant="outline" className="shrink-0">
                              {entry.project_name}
                            </Badge>
                          )}
                        </div>
                        {entry.note && (
                          <p className="mt-1 text-sm text-muted-foreground truncate">
                            {entry.note}
                          </p>
                        )}
                        {entry.task && (
                          <div className="mt-2 flex items-center gap-2">
                            <Link2 className="h-3 w-3 text-green-600" />
                            <span className="text-sm text-green-600">
                              Linked to: {entry.task.title}
                            </span>
                            {entry.task.project && (
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.task.project.color }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {entry.linked_task_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlink(entry)}
                          >
                            <Unlink className="h-4 w-4 mr-1" />
                            Unlink
                          </Button>
                        ) : (
                          <Dialog
                            open={linkingEntry?.id === entry.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setLinkingEntry(null);
                                setTaskSearch("");
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLinkingEntry(entry)}
                              >
                                <Link2 className="h-4 w-4 mr-1" />
                                Link to Task
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Link Time Entry to Task</DialogTitle>
                                <DialogDescription>
                                  {entry.hours}h on {format(new Date(entry.date + "T00:00:00"), "MMM d, yyyy")}
                                  {entry.note && ` - "${entry.note}"`}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search tasks..."
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    className="pl-9"
                                  />
                                </div>
                                <ScrollArea className="h-[300px]">
                                  <div className="space-y-1">
                                    {filteredTasks.map((task) => (
                                      <button
                                        key={task.id}
                                        onClick={() => handleLinkTask(task)}
                                        className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          {task.project && (
                                            <div
                                              className="h-2 w-2 rounded-full shrink-0"
                                              style={{ backgroundColor: task.project.color }}
                                            />
                                          )}
                                          <span className="font-medium truncate">
                                            {task.title}
                                          </span>
                                        </div>
                                        {task.project && (
                                          <span className="text-xs text-muted-foreground">
                                            {task.project.name}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                      <div className="p-4 text-center text-muted-foreground">
                                        No tasks found
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
