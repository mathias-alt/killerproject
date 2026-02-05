-- Run this in Supabase SQL Editor to add new tables
-- for multi-user task assignment, ideas, and idea attachments

-- Task assignees junction table
create table if not exists public.task_assignees (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  constraint task_assignees_unique unique (task_id, user_id)
);

-- Ideas table
create table if not exists public.ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  author_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Idea attachments table
create table if not exists public.idea_attachments (
  id uuid default gen_random_uuid() primary key,
  idea_id uuid references public.ideas(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists task_assignees_task_id_idx on public.task_assignees(task_id);
create index if not exists task_assignees_user_id_idx on public.task_assignees(user_id);
create index if not exists ideas_author_id_idx on public.ideas(author_id);
create index if not exists idea_attachments_idea_id_idx on public.idea_attachments(idea_id);

-- Enable RLS
alter table public.task_assignees enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_attachments enable row level security;

-- Task assignees policies
create policy "Users can view task assignees" on public.task_assignees
  for select using (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_assignees.task_id and projects.owner_id = auth.uid())
  );
create policy "Users can manage task assignees" on public.task_assignees
  for insert with check (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_assignees.task_id and projects.owner_id = auth.uid())
  );
create policy "Users can delete task assignees" on public.task_assignees
  for delete using (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_assignees.task_id and projects.owner_id = auth.uid())
  );

-- Ideas policies
create policy "Ideas are viewable by all authenticated users" on public.ideas
  for select using (auth.uid() is not null);
create policy "Users can create ideas" on public.ideas
  for insert with check (auth.uid() = author_id);
create policy "Users can update own ideas" on public.ideas
  for update using (auth.uid() = author_id);
create policy "Users can delete own ideas" on public.ideas
  for delete using (auth.uid() = author_id);

-- Idea attachments policies
create policy "Idea attachments viewable by all authenticated" on public.idea_attachments
  for select using (auth.uid() is not null);
create policy "Users can add attachments to own ideas" on public.idea_attachments
  for insert with check (
    exists (select 1 from public.ideas where ideas.id = idea_attachments.idea_id and ideas.author_id = auth.uid())
  );
create policy "Users can delete attachments on own ideas" on public.idea_attachments
  for delete using (
    exists (select 1 from public.ideas where ideas.id = idea_attachments.idea_id and ideas.author_id = auth.uid())
  );

-- Create storage buckets for avatars and idea attachments
-- Note: You may need to run these in the Supabase Dashboard > Storage section instead:
-- 1. Create bucket "avatars" (public)
-- 2. Create bucket "idea-attachments" (public)
