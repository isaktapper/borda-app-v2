-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  domain text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Users (extends auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  is_super_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Organization Members
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  deleted_at timestamptz,
  unique (organization_id, user_id)
);

-- Generic Email Domains
create table generic_email_domains (
  domain text primary key
);

insert into generic_email_domains (domain) values
('gmail.com'), ('googlemail.com'), ('hotmail.com'), ('outlook.com'), 
('yahoo.com'), ('icloud.com'), ('me.com'), ('live.com'), 
('msn.com'), ('protonmail.com'), ('proton.me');

-- RLS Enablement
alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_members enable row level security;
alter table generic_email_domains enable row level security;

-- RLS Policies

-- Users
create policy "Users can view own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id);

-- Organizations
create policy "Users can view organizations they belong to"
  on organizations for select
  using (
    exists (
      select 1 from organization_members
      where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
      and organization_members.deleted_at is null
    )
  );

-- Organization Members
create policy "Users can view members of their organizations"
  on organization_members for select
  using (
    exists (
      select 1 from organization_members as om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.deleted_at is null
    )
  );

-- Triggers & Functions

-- Handle New User (from auth.users)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes
create index idx_organization_members_user_id on organization_members(user_id);
create index idx_organization_members_organization_id on organization_members(organization_id);
create index idx_organizations_domain on organizations(domain);
