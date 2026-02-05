-- Run this in Supabase SQL Editor
-- Fixes storage bucket RLS policies for avatar and idea attachment uploads
--
-- IMPORTANT: Make sure you have already created the buckets in the Supabase Dashboard:
-- 1. "avatars" bucket (public)
-- 2. "idea-attachments" bucket (public)

-- AVATARS bucket policies
-- File path format: {user_id}/avatar.{ext}
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- IDEA-ATTACHMENTS bucket policies
-- File path format: {user_id}/{idea_id}/{timestamp}.{ext}
create policy "Users can upload idea attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'idea-attachments'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own idea attachments"
  on storage.objects for update
  using (
    bucket_id = 'idea-attachments'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Idea attachments are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'idea-attachments');

create policy "Users can delete own idea attachments"
  on storage.objects for delete
  using (
    bucket_id = 'idea-attachments'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
