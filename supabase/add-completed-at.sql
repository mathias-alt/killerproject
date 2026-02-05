-- Add completed_at column to tasks table
alter table public.tasks
  add column if not exists completed_at timestamptz default null;

-- Add partial index for efficient date range queries on completed tasks
create index if not exists tasks_completed_at_idx
  on public.tasks(completed_at)
  where completed_at is not null;

-- Backfill: set completed_at for existing done tasks using their updated_at
-- This is the best approximation available for historical data
update public.tasks
  set completed_at = updated_at
  where status = 'done' and completed_at is null;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
