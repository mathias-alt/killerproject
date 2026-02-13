"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTimely } from "@/hooks/use-timely";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  RefreshCw,
  Search,
  Unlink,
} from "lucide-react";
import type { TaskWithProject, TimelyTimeEntryWithTask } from "@/lib/types/database";

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

  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterLinked, setFilterLinked] = useState<string>("all");
  const [linkingEntry, setLinkingEntry] = useState<TimelyTimeEntryWithTask | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const timelyProjects = useMemo(() => {
    const projectSet = new Set<string>();
    entries.forEach((entry) => {
      if (entry.project_name) projectSet.add(entry.project_name);
    });
    return Array.from(projectSet).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterProject !== "all" && entry.project_name !== filterProject) return false;
      if (filterLinked === "linked" && !entry.linked_task_id) return false;
      if (filterLinked === "unlinked" && entry.linked_task_id) return false;
      return true;
    });
  }, [entries, filterProject, filterLinked]);

  const filteredTasks = useMemo(() => {
    if (!taskSearch) return tasks;
    const search = taskSearch.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        task.project?.name?.toLowerCase().includes(search)
    );
  }, [tasks, taskSearch]);

  const stats = useMemo(() => {
    const total = entries.length;
    const linked = entries.filter((entry) => entry.linked_task_id).length;
    const unlinked = total - linked;
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    return { total, linked, unlinked, totalHours };
  }, [entries]);

  const handleConnect = () => {
    const url = getAuthUrl();
    if (!url) {
      setError("Timely integration is not configured");
      return;
    }
    window.location.href = url;
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
    return <div className="p-8 text-muted-foreground">Loading time entries...</div>;
  }

  return (
    <div className="space-y-6 p-5 md:p-8">
      <section className="rounded-2xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm md:px-7 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Time Tracking</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Time Entries</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sync and link Timely entries to tasks for cleaner reporting.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            {isConnected ? (
              <>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Syncing..." : "Sync"}
                </Button>
                <Button variant="ghost" className="w-full sm:w-auto" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button className="w-full sm:w-auto" onClick={handleConnect}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect to Timely
              </Button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {!isConnected ? (
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Connect to Timely</CardTitle>
            <CardDescription>
              Connect your Timely account to sync entries and link time directly to project tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect to Timely
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardDescription>Total Entries</CardDescription>
                <CardTitle className="text-2xl tracking-tight">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardDescription>Linked</CardDescription>
                <CardTitle className="text-2xl tracking-tight text-emerald-600 dark:text-emerald-400">
                  {stats.linked}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardDescription>Unlinked</CardDescription>
                <CardTitle className="text-2xl tracking-tight text-amber-600 dark:text-amber-400">
                  {stats.unlinked}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardDescription>Total Hours</CardDescription>
                <CardTitle className="text-2xl tracking-tight">{stats.totalHours.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/85">
            <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:w-auto">
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-full sm:w-[220px]">
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
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entries</SelectItem>
                    <SelectItem value="linked">Linked</SelectItem>
                    <SelectItem value="unlinked">Unlinked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {filteredEntries.length} of {entries.length} entries
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <Card className="border-border/70 bg-card/85">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No time entries found. Click Sync to fetch entries from Timely.
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id} className="border-border/70 bg-card/85">
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{Number(entry.hours).toFixed(2)}h</span>
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
                          <p className="mt-1 truncate text-sm text-muted-foreground">{entry.note}</p>
                        )}
                        {entry.task && (
                          <div className="mt-2 flex items-center gap-2">
                            <Link2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-300">
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

                      <div className="ml-0 flex w-full flex-wrap items-center gap-2 md:ml-4 md:w-auto md:justify-end">
                        {entry.linked_task_id ? (
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => handleUnlink(entry)}>
                            <Unlink className="mr-1 h-4 w-4" />
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
                                className="w-full sm:w-auto"
                                onClick={() => setLinkingEntry(entry)}
                              >
                                <Link2 className="mr-1 h-4 w-4" />
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
                                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                                        className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent/80"
                                      >
                                        <div className="flex items-center gap-2">
                                          {task.project && (
                                            <div
                                              className="h-2 w-2 shrink-0 rounded-full"
                                              style={{ backgroundColor: task.project.color }}
                                            />
                                          )}
                                          <span className="truncate font-medium">{task.title}</span>
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
