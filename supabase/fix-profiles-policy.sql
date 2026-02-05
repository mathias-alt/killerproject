-- FIX: Add missing INSERT policy for profiles table
-- This was preventing the handle_new_user trigger from creating profiles for new users
-- Run this in Supabase SQL Editor

-- Add insert policy
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Backfill: create profiles for any existing auth users that don't have one
insert into public.profiles (id, full_name, avatar_url)
select
  au.id,
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;
