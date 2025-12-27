-- Add missing columns to organization_members for invite functionality
alter table public.organization_members
  add column if not exists invited_email text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz default now();

-- Backfill invited_email from existing users
update public.organization_members om
set invited_email = u.email
from auth.users u
where om.user_id = u.id
  and om.invited_email is null;

-- Backfill invited_at from joined_at for existing members
update public.organization_members
set invited_at = joined_at
where invited_at is null and joined_at is not null;

-- For any remaining records without invited_at, set to created timestamp or now
update public.organization_members
set invited_at = coalesce(joined_at, now())
where invited_at is null;

-- Make invited_email NOT NULL going forward
alter table public.organization_members
  alter column invited_email set not null;

-- Add index for faster email lookups
create index if not exists idx_org_members_invited_email on public.organization_members(invited_email);

-- Add comments
comment on column public.organization_members.invited_email is 'Email address of the invited user';
comment on column public.organization_members.invited_by is 'User who sent the invitation';
comment on column public.organization_members.invited_at is 'When the invitation was sent';
