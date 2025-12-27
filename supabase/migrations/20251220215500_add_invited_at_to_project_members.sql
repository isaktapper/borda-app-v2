-- Add invited_at to project_members to match spec
alter table public.project_members add column if not exists invited_at timestamptz default now();
