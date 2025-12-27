-- Create table for passwordless portal access tokens
create table if not exists public.portal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  email text not null,
  token text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_portal_tokens_token on public.portal_access_tokens(token);
create index if not exists idx_portal_tokens_project_email on public.portal_access_tokens(project_id, email);

-- RLS: Only Service Role should manage these directly, 
-- but we might need public SELECT if we validate on the client (though we'll use server actions).
alter table public.portal_access_tokens enable row level security;

-- Internal policy: Allowed via security definer RPCs or Service Role.
-- For standard users, we don't want them to see tokens.
create policy "Service role only access"
  on public.portal_access_tokens
  using (false);
