"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TimelyTimeEntryWithTask } from "@/lib/types/database";

export function useTimely() {
  const [entries, setEntries] = useState<TimelyTimeEntryWithTask[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Check if user has Timely connected
  const checkConnection = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("timely_tokens")
      .select("id")
      .eq("user_id", user.id)
      .single();

    setIsConnected(!!data);
  }, [supabase]);

  // Fetch entries with linked task info
  const fetchEntries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("timely_time_entries")
      .select(`
        *,
        task:tasks!timely_time_entries_linked_task_id_fkey(
          *,
          assignee:profiles!tasks_assignee_id_fkey(*),
          project:projects!tasks_project_id_fkey(*)
        )
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      // Local environments may not have Timely tables migrated yet.
      if (error.code === "PGRST205") {
        setEntries([]);
      } else {
        console.error("Error fetching entries:", error);
      }
    } else {
      setEntries((data as TimelyTimeEntryWithTask[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    checkConnection();
    fetchEntries();
  }, [checkConnection, fetchEntries]);

  // Get OAuth URL
  const getAuthUrl = () => {
    return "/api/timely/authorize";
  };

  // Sync entries from Timely
  const syncEntries = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/timely/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      await fetchEntries();
      return data;
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect from Timely
  const disconnect = async () => {
    try {
      const response = await fetch("/api/timely/disconnect", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Disconnect failed");
      }
      setIsConnected(false);
      setEntries([]);
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  };

  // Link an entry to a task
  const linkEntryToTask = async (entryId: string, taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get the entry to get its hours
    const entry = entries.find(e => e.id === entryId);
    if (!entry) throw new Error("Entry not found");

    // Update the entry with the linked task
    const { error: linkError } = await supabase
      .from("timely_time_entries")
      .update({
        linked_task_id: taskId,
        updated_at: new Date().toISOString()
      })
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (linkError) throw linkError;

    // Calculate total hours for this task from all linked entries
    const { data: linkedEntries } = await supabase
      .from("timely_time_entries")
      .select("hours")
      .eq("linked_task_id", taskId)
      .eq("user_id", user.id);

    const totalHours = (linkedEntries ?? []).reduce((sum, e) => sum + Number(e.hours), 0);

    // Update the task's actual_hours
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        actual_hours: totalHours,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    // Refresh entries
    await fetchEntries();
  };

  // Unlink an entry from its task
  const unlinkEntry = async (entryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get the entry to get its current linked task and hours
    const entry = entries.find(e => e.id === entryId);
    if (!entry) throw new Error("Entry not found");
    if (!entry.linked_task_id) throw new Error("Entry not linked");

    const taskId = entry.linked_task_id;

    // Unlink the entry
    const { error: unlinkError } = await supabase
      .from("timely_time_entries")
      .update({
        linked_task_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (unlinkError) throw unlinkError;

    // Recalculate total hours for the task (excluding this entry)
    const { data: linkedEntries } = await supabase
      .from("timely_time_entries")
      .select("hours")
      .eq("linked_task_id", taskId)
      .eq("user_id", user.id);

    const totalHours = (linkedEntries ?? []).reduce((sum, e) => sum + Number(e.hours), 0);

    // Update the task's actual_hours
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        actual_hours: totalHours > 0 ? totalHours : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    // Refresh entries
    await fetchEntries();
  };

  return {
    entries,
    isConnected,
    loading,
    syncing,
    getAuthUrl,
    syncEntries,
    disconnect,
    linkEntryToTask,
    unlinkEntry,
    refetch: fetchEntries,
  };
}
