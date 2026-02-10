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
    return updateTask(id, { status: newStatus, order: newOrder });
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
