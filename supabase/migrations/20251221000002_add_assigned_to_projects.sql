-- Add assigned_to column to projects table for tracking responsible CS member
alter table public.projects
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

-- Add index for faster lookups
create index if not exists idx_projects_assigned_to on public.projects(assigned_to);

-- Add comment
comment on column public.projects.assigned_to is 'The CS team member responsible for this project';
