-- Add start_date and end_date columns to projects table if they don't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'start_date'
  ) then
    alter table public.projects add column start_date date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'end_date'
  ) then
    alter table public.projects add column end_date date;
  end if;
end $$;
