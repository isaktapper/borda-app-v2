-- Fix RLS for Onboarding

-- 1. Allow authenticated users to view generic email domains
create policy "Allow authenticated users to view generic domains"
  on generic_email_domains for select
  using (auth.role() = 'authenticated');

-- 2. Allow users to view organizations that match their email domain
-- This enables the "Join existing organization" feature during onboarding
create policy "Users can view organizations matching their domain"
  on organizations for select
  using (
    domain is not null 
    and 
    domain = split_part(auth.jwt() ->> 'email', '@', 2)
  );
