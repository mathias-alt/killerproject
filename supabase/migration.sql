-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  color text not null default '#3b82f6',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  start_date date,
  end_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create task status and priority enums
create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- Create tasks table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  estimated_hours numeric,
  actual_hours numeric,
  "order" int not null default 0,
  parent_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create task dependencies table (for Gantt chart linking)
create table public.task_dependencies (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  depends_on_id uuid references public.tasks(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  constraint task_dependencies_unique unique (task_id, depends_on_id),
  constraint task_dependencies_no_self check (task_id != depends_on_id)
);

-- Indexes
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_assignee_id_idx on public.tasks(assignee_id);
create index tasks_status_idx on public.tasks(status);
create index task_dependencies_task_id_idx on public.task_dependencies(task_id);
create index task_dependencies_depends_on_id_idx on public.task_dependencies(depends_on_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;

-- Profiles: users can read all profiles, update their own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects: owners can do everything
create policy "Users can view own projects" on public.projects for select using (auth.uid() = owner_id);
create policy "Users can create projects" on public.projects for insert with check (auth.uid() = owner_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = owner_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = owner_id);

-- Tasks: users can manage tasks in their projects
create policy "Users can view tasks in own projects" on public.tasks
  for select using (
    exists (select 1 from public.projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
  );
create policy "Users can create tasks in own projects" on public.tasks
  for insert with check (
    exists (select 1 from public.projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
  );
create policy "Users can update tasks in own projects" on public.tasks
  for update using (
    exists (select 1 from public.projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
  );
create policy "Users can delete tasks in own projects" on public.tasks
  for delete using (
    exists (select 1 from public.projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
  );

-- Task dependencies: same access as tasks
create policy "Users can view task dependencies" on public.task_dependencies
  for select using (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_dependencies.task_id and projects.owner_id = auth.uid())
  );
create policy "Users can create task dependencies" on public.task_dependencies
  for insert with check (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_dependencies.task_id and projects.owner_id = auth.uid())
  );
create policy "Users can delete task dependencies" on public.task_dependencies
  for delete using (
    exists (select 1 from public.tasks join public.projects on projects.id = tasks.project_id where tasks.id = task_dependencies.task_id and projects.owner_id = auth.uid())
  );

-- Enable realtime for tasks
alter publication supabase_realtime add table public.tasks;
