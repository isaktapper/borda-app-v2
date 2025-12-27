-- Step 11: File Upload Block Schema & Storage

-- 1. Files Table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  original_name text not null,
  storage_path text not null,
  file_size_bytes bigint not null,
  mime_type text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- 2. Indexes
create index if not exists idx_files_block on public.files(block_id);
create index if not exists idx_files_project on public.files(project_id);

-- 3. RLS for Files
alter table public.files enable row level security;

create policy "files_select_policy"
  on public.files for select
  using (can_user_access_project(project_id) and deleted_at is null);

create policy "files_insert_policy"
  on public.files for insert
  with check (can_user_access_project(project_id));

create policy "files_delete_policy"
  on public.files for delete
  using (can_user_access_project(project_id));

-- 4. Supabase Storage Bucket Setup
-- Note: We try to create the bucket via SQL if the extension is available
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- 5. Storage RLS Policies
-- Allow users to read files if they have access to the project
-- The project_id is usually embedded in the storage path (e.g., project_id/file_id)
-- For now, we'll use a broad policy based on organization access if we can parse it, 
-- or rely on the application layer for signed URLs.
-- Standard policy:
create policy "Project files access"
on storage.objects for select
to authenticated
using ( bucket_id = 'project-files' );

create policy "Project files upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'project-files' );

create policy "Project files delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'project-files' );
