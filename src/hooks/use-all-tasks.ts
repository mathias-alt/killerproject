"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus, TaskWithProject } from "@/lib/types/database";

export function useAllTasks() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .order("order", { ascending: true });
    setTasks((data as TaskWithProject[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function createTask(task: Partial<Task> & { title: string }, assigneeIds?: string[]) {
    const maxOrder = tasks.filter((t) => t.status === task.status).length;
    const completedAt = task.status === "done" ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, order: maxOrder, completed_at: completedAt })
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .single();

    if (data) {
      if (assigneeIds && assigneeIds.length > 0) {
        await supabase.from("task_assignees").insert(
          assigneeIds.map((userId) => ({ task_id: data.id, user_id: userId }))
        );
      }
      setTasks((prev) => [...prev, data as TaskWithProject]);
    }
    return { data, error };
  }

  async function updateTask(id: string, updates: Partial<Task>, assigneeIds?: string[]) {
    // Auto-set completed_at based on status transitions
    const completedAtUpdate: { completed_at?: string | null } = {};
    if (updates.status !== undefined) {
      completedAtUpdate.completed_at = updates.status === "done" ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ ...updates, ...completedAtUpdate, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .single();

    if (data) {
      if (assigneeIds !== undefined) {
        await supabase.from("task_assignees").delete().eq("task_id", id);
        if (assigneeIds.length > 0) {
          await supabase.from("task_assignees").insert(
            assigneeIds.map((userId) => ({ task_id: id, user_id: userId }))
          );
        }
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? (data as TaskWithProject) : t)));
    }
    return { data, error };
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
    return { error };
  }

  async function moveTask(id: string, newStatus: TaskStatus, newOrder: number) {
    const targetTask = tasks.find((task) => task.id === id);
    if (!targetTask) {
      return { data: null, error: new Error("Task not found") };
    }

    const sourceStatus = targetTask.status;
    const now = new Date().toISOString();

    const sourceTasks = tasks
      .filter((task) => !task.parent_task_id && task.status === sourceStatus && task.id !== id)
      .sort((a, b) => a.order - b.order);

    const destinationTasks = tasks
      .filter((task) => !task.parent_task_id && task.status === newStatus && task.id !== id)
      .sort((a, b) => a.order - b.order);

    const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length));

    let reorderedSource = sourceTasks;
    let reorderedDestination = destinationTasks;

    if (sourceStatus === newStatus) {
      const merged = [...sourceTasks];
      merged.splice(clampIndex(newOrder, merged.length), 0, targetTask);
      reorderedDestination = merged;
    } else {
      const movedTask = {
        ...targetTask,
        status: newStatus,
        completed_at: newStatus === "done" ? now : null,
      };
      const updatedDestination = [...destinationTasks];
      updatedDestination.splice(clampIndex(newOrder, updatedDestination.length), 0, movedTask);
      reorderedSource = sourceTasks;
      reorderedDestination = updatedDestination;
    }

    const updates = new Map<string, Partial<Task>>();

    reorderedSource.forEach((task, orderIndex) => {
      if (task.order !== orderIndex) {
        updates.set(task.id, { order: orderIndex, updated_at: now });
      }
    });

    reorderedDestination.forEach((task, orderIndex) => {
      const existing = updates.get(task.id) ?? {};
      const patch: Partial<Task> = { ...existing };

      if (task.order !== orderIndex) {
        patch.order = orderIndex;
      }

      if (task.id === id && sourceStatus !== newStatus) {
        patch.status = newStatus;
        patch.completed_at = newStatus === "done" ? now : null;
      }

      if (Object.keys(patch).length > 0) {
        patch.updated_at = now;
        updates.set(task.id, patch);
      }
    });

    if (!updates.size) return { data: null, error: null };

    const previousTasks = tasks;
    const nextTasks = tasks.map((task) => {
      const patch = updates.get(task.id);
      return patch ? ({ ...task, ...patch } as TaskWithProject) : task;
    });
    setTasks(nextTasks);

    const results = await Promise.all(
      Array.from(updates.entries()).map(([taskId, patch]) =>
        supabase.from("tasks").update(patch).eq("id", taskId)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setTasks(previousTasks);
      return { data: null, error: failed.error };
    }

    return { data: null, error: null };
  }

  async function createSubtask(parentTaskId: string, title: string) {
    const parentTask = tasks.find((t) => t.id === parentTaskId);
    if (!parentTask) return { data: null, error: new Error("Parent task not found") };

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        project_id: parentTask.project_id,
        parent_task_id: parentTaskId,
        status: "todo" as TaskStatus,
        priority: parentTask.priority ?? "medium",
        order: 0,
      })
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects!tasks_project_id_fkey(*)")
      .single();

    if (data) {
      setTasks((prev) => [...prev, data as TaskWithProject]);
    }
    return { data, error };
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    const newStatus: TaskStatus = completed ? "done" : "todo";
    return updateTask(subtaskId, { status: newStatus });
  }

  function getSubtasks(parentTaskId: string) {
    return tasks.filter((t) => t.parent_task_id === parentTaskId);
  }

  return { tasks, setTasks, loading, createTask, updateTask, deleteTask, moveTask, createSubtask, toggleSubtask, getSubtasks, refetch: fetchTasks };
}
