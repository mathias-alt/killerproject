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

-- Create task_assignees junction table for multi-user assignment
create table public.task_assignees (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  constraint task_assignees_unique unique (task_id, user_id)
);

-- Create ideas table
create table public.ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  author_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create idea_attachments table for files/images
create table public.idea_attachments (
  id uuid default gen_random_uuid() primary key,
  idea_id uuid references public.ideas(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz default now() not null
);

-- Indexes
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_assignee_id_idx on public.tasks(assignee_id);
create index tasks_status_idx on public.tasks(status);
create index task_dependencies_task_id_idx on public.task_dependencies(task_id);
create index task_dependencies_depends_on_id_idx on public.task_dependencies(depends_on_id);
create index task_assignees_task_id_idx on public.task_assignees(task_id);
create index task_assignees_user_id_idx on public.task_assignees(user_id);
create index ideas_author_id_idx on public.ideas(author_id);
create index idea_attachments_idea_id_idx on public.idea_attachments(idea_id);

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
alter table public.task_assignees enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_attachments enable row level security;

-- Profiles: users can read all profiles, insert their own, update their own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
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

-- Task assignees: same access as tasks
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

-- Ideas: all authenticated users can view all ideas, manage their own
create policy "Ideas are viewable by all authenticated users" on public.ideas
  for select using (auth.uid() is not null);
create policy "Users can create ideas" on public.ideas
  for insert with check (auth.uid() = author_id);
create policy "Users can update own ideas" on public.ideas
  for update using (auth.uid() = author_id);
create policy "Users can delete own ideas" on public.ideas
  for delete using (auth.uid() = author_id);

-- Idea attachments: same access as parent idea
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

-- Enable realtime for tasks
alter publication supabase_realtime add table public.tasks;

-- Timely Integration Tables

-- Timely OAuth tokens table
create table public.timely_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  account_id bigint not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Timely time entries table (cached from Timely API)
create table public.timely_time_entries (
  id uuid default gen_random_uuid() primary key,
  timely_id bigint not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_name text,
  note text,
  hours numeric not null,
  date date not null,
  linked_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint timely_entries_unique unique (user_id, timely_id)
);

-- Indexes for Timely tables
create index timely_tokens_user_id_idx on public.timely_tokens(user_id);
create index timely_entries_user_id_idx on public.timely_time_entries(user_id);
create index timely_entries_date_idx on public.timely_time_entries(date);
create index timely_entries_linked_task_idx on public.timely_time_entries(linked_task_id);

-- RLS for Timely tables
alter table public.timely_tokens enable row level security;
alter table public.timely_time_entries enable row level security;

-- Timely tokens: users can only access their own tokens
create policy "Users can view own timely tokens" on public.timely_tokens
  for select using (auth.uid() = user_id);
create policy "Users can insert own timely tokens" on public.timely_tokens
  for insert with check (auth.uid() = user_id);
create policy "Users can update own timely tokens" on public.timely_tokens
  for update using (auth.uid() = user_id);
create policy "Users can delete own timely tokens" on public.timely_tokens
  for delete using (auth.uid() = user_id);

-- Timely entries: users can only access their own entries
create policy "Users can view own timely entries" on public.timely_time_entries
  for select using (auth.uid() = user_id);
create policy "Users can insert own timely entries" on public.timely_time_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update own timely entries" on public.timely_time_entries
  for update using (auth.uid() = user_id);
create policy "Users can delete own timely entries" on public.timely_time_entries
  for delete using (auth.uid() = user_id);
