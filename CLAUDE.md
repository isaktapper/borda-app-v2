# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start local development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint

# Supabase - Migration workflow
# NOTE: Claude creates migration files, but user runs them manually in Supabase SQL editor
npx supabase migration new <name>    # Create new migration file (Claude can do this)
```

## Architecture Overview

### Tech Stack
- **Next.js 16.1.0** with App Router (Server/Client Components)
- **React 19.2.3** with React Compiler enabled
- **Supabase** for auth, database (PostgreSQL), and storage
- **TypeScript 5** with strict mode
- **Tailwind CSS 4** with shadcn/ui components
- **Resend** for email delivery

### Application Type
Multi-tenant project management and customer portal platform. Staff users manage projects and invite external customers to view/interact with content through passwordless portal links.

## Authentication Architecture

### Dual Authentication System

1. **Staff Authentication (Supabase Auth)**
   - Standard email/password signup and login
   - Routes: `/login`, `/signup`, `/verify`, `/auth/callback`
   - Session managed via Supabase cookies
   - Access to `/dashboard/*` routes
   - Users stored in `auth.users` (Supabase built-in) and mirrored to `public.users`

2. **Customer Portal Authentication (JWT Tokens)**
   - Passwordless access via unique email links
   - Tokens stored in `portal_access_tokens` table (UUID, 7-day expiry)
   - JWT cookies: `portal_session_{projectId}` (signed with `PORTAL_SESSION_SECRET`)
   - Access to `/portal/[projectId]/*` routes
   - **Key files:**
     - `/src/lib/portal-auth.ts` - JWT creation/verification
     - `/src/app/portal/access-actions.ts` - Token validation

### Middleware Flow (`/src/middleware.ts`)

```
All requests → middleware intercept
    ↓
Update Supabase session (refresh auth cookies)
    ↓
Route protection check:
  - /dashboard/* → Requires Supabase auth, redirect to /login if missing
  - /portal/[projectId]/access → Public (token validation page)
  - /portal/[projectId]/* → Requires portal cookie OR staff access
  - /login, /signup → Redirect to /dashboard if already authenticated
```

## Database Schema & Patterns

### Core Tables

- **organizations** - Multi-tenant orgs (companies using the platform)
- **users** - Extends `auth.users`, stores full_name, avatar_url
- **organization_members** - Links users to orgs with roles (owner/admin/member)
- **projects** - 7-digit numeric IDs, belongs to organization
- **project_members** - Links users/customers to projects (roles: owner/collaborator/customer)
- **pages** - Content pages within projects (hierarchical via sort_order)
- **blocks** - Content units in pages (JSONB content, types: text/task/question/checklist/file/embed/contact/divider)
- **tasks** - Trackable action items (linked to task blocks)
- **responses** - Customer-submitted answers (linked to question/checklist blocks)
- **files** - Upload metadata (linked to file blocks)
- **templates** - Reusable page layouts
- **portal_access_tokens** - Temporary access tokens for customers
- **activity_log** - Audit trail of project activities
- **email_log** - Sent email tracking

### Key Patterns

**Soft Deletes:** All tables use `deleted_at` columns. Never hard-delete records.

**JSONB Content Storage:** Blocks use flexible JSONB `content` field:
```json
{
  "title": "Task title",
  "description": "Details",
  "items": ["Checklist item 1", "Item 2"],
  "placeholder": "Question prompt text"
}
```

**Row-Level Security (RLS):**
- All tables have RLS enabled
- Helper function: `get_user_org_ids()` returns org IDs user belongs to
- Prevents recursive RLS policy checks
- Example policy pattern:
  ```sql
  CREATE POLICY "Users can view org projects"
    ON projects FOR SELECT
    USING (organization_id IN (SELECT get_user_org_ids()))
  ```

**Database Views:**
- `projects_with_assigned` - Joins projects with assigned user data (avoids RLS join issues)

**RPC Functions:**
- `create_organization_rpc()` - Atomic org creation + member insert (SECURITY DEFINER)
- `get_user_org_ids()` - Returns user's organization IDs

## Server Actions Pattern

All mutations use Next.js Server Actions (`'use server'`). Located throughout `/src/app/` directories.

**Standard Pattern:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(formData: FormData) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Extract form data
  const value = formData.get('field') as string

  // Database operation (RLS enforces authorization)
  const { data, error } = await supabase
    .from('table')
    .insert({ value })
    .select()
    .single()

  if (error) return { error: error.message }

  // Invalidate cache
  revalidatePath('/dashboard/path')

  return { success: true, data }
}
```

**Key Server Action Files:**
- `/src/app/auth/actions.ts` - login, signup, signout
- `/src/app/dashboard/projects/actions.ts` - project CRUD
- `/src/app/dashboard/projects/[projectId]/block-actions.ts` - block CRUD
- `/src/app/portal/actions.ts` - portal data fetching and mutations

## Supabase Client Patterns

### Server-Side Clients

**Standard User Client (RLS enforced):**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

**Admin Client (bypasses RLS):**
```typescript
import { createAdminClient } from '@/lib/supabase/server'

const supabase = await createAdminClient()
```
Use admin client for system operations (token generation, cron jobs, portal access validation).

### Client-Side

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient() // Browser-only
```

## Portal System

### Customer Portal Flow

1. Staff invites customer via email to project
2. Server generates UUID token, stores in `portal_access_tokens`
3. Email sent with link: `/portal/{projectId}/access?token={uuid}`
4. Customer clicks link → `validatePortalToken()` server action:
   - Validates token in DB
   - Marks as used (`used_at` timestamp)
   - Creates JWT cookie: `portal_session_{projectId}`
   - Redirects to `/portal/{projectId}`
5. Portal pages use `getAuthPortalClient(projectId)` to fetch data:
   - Verifies JWT cookie OR checks if Supabase user has access
   - Returns admin client with manual permission check

### Portal Data Fetching

**Pattern:**
```typescript
// In /src/app/portal/actions.ts
export async function getPortalProject(projectId: string) {
  const supabase = await getAuthPortalClient(projectId)

  // Fetch project data with admin client
  // Manual authorization check done in getAuthPortalClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  return data
}
```

## Block System

### Block Types & Content Structure

Each block has a `type` field and JSONB `content` field:

- **text**: `{ text: string }` - Rich text content
- **task**: Related `tasks` table rows (title, status, due_date, assignee_id)
- **question**: `{ question: string, placeholder?: string }` - Free-form input
- **checklist**: `{ title: string, items: string[] }` - Multi-checkbox list
- **file**: Related `files` table rows (storage metadata)
- **embed**: `{ url: string, type: 'video' | 'iframe' }` - Embedded content
- **contact**: `{ name, email, phone, ... }` - Contact card
- **divider**: No content - Visual separator

### Block Editor

**Location:** `/src/components/dashboard/editor/`

- Uses `@dnd-kit` for drag-and-drop reordering
- Type-specific editors: `{type}-block-editor.tsx`
- Parent: `block-editor.tsx` manages block list state
- Sort order tracked separately from content

## Migrations

### Migration Workflow

**IMPORTANT:** Claude can create migration files in `/supabase/migrations/`, but the user will run them manually in the Supabase SQL editor. Do NOT run any commands to apply migrations.

**Claude's role:**
1. Create new migration files with descriptive names
2. Write the SQL in the migration file
3. Inform the user that the migration is ready to run

**User's role:**
1. Review the migration SQL
2. Run it manually in Supabase SQL editor

### Creating New Migrations

When creating migrations, write SQL directly to a new file in `/supabase/migrations/` with timestamp format:
```
/supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
```

**Migration Best Practices:**
1. Always include RLS policies for new tables
2. Use `IF NOT EXISTS` for idempotent migrations
3. Prefer `security_invoker = true` for views (RLS honored)
4. Add indexes for foreign keys and common query patterns
5. Use soft deletes (`deleted_at`) instead of DROP/DELETE

**Example Migration Structure:**
```sql
-- 1. Create table
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  deleted_at timestamptz
);

-- 2. Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Users can view org records"
  ON my_table FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- 4. Add indexes
CREATE INDEX idx_my_table_organization_id ON my_table(organization_id);
```

## Email System

**Location:** `/src/lib/email/`

```typescript
import { sendEmail } from '@/lib/email'
import { emailTemplate } from '@/lib/email/templates'

await sendEmail({
  to: 'customer@example.com',
  subject: 'Subject line',
  html: emailTemplate({ variable: 'value' }),
  type: 'email_type',
  metadata: { key: 'value' }
})
```

- Uses Resend API (`NEXT_PUBLIC_RESEND_API_KEY`)
- Logs all emails to `email_log` table
- Templates in `/src/lib/email/templates.ts`

## Cron Jobs

**Vercel Cron Configuration:** `/vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/task-reminders",
      "schedule": "0 8 * * *"  // Daily at 8 AM UTC
    }
  ]
}
```

**Cron Endpoint Pattern:**
```typescript
// /src/app/api/cron/*/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use admin client for system operations
  const supabase = await createAdminClient()

  // Perform task...

  return Response.json({ message: 'Success', count: 42 })
}
```

## Environment Variables

Required variables (add to `.env.local`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Portal JWT
PORTAL_SESSION_SECRET=  # 30+ character random string

# Cron
CRON_SECRET=  # Bearer token for cron endpoints

# Email
NEXT_PUBLIC_RESEND_API_KEY=
```

## Common Gotchas

### RLS Join Issues

When joining tables with RLS, users may not have permission to see related rows. Solutions:

1. **Use a view with `security_invoker = true`:**
   ```sql
   CREATE VIEW projects_with_assigned AS
   SELECT p.*, jsonb_build_object('id', u.id, 'email', u.email) AS assigned_user
   FROM projects p
   LEFT JOIN users u ON p.assigned_to = u.id;

   ALTER VIEW projects_with_assigned SET (security_invoker = true);
   ```

2. **Add RLS policy to allow viewing related users:**
   ```sql
   CREATE POLICY "Users can view org members"
     ON users FOR SELECT
     USING (
       id IN (
         SELECT user_id FROM organization_members
         WHERE organization_id IN (SELECT get_user_org_ids())
       )
     );
   ```

### Portal Access Debugging

If portal access fails:
1. Check JWT cookie exists: `portal_session_{projectId}`
2. Verify `PORTAL_SESSION_SECRET` matches between token creation and validation
3. Check token expiry in `portal_access_tokens` table
4. Ensure `getAuthPortalClient()` falls back to Supabase auth check

### Server Actions Not Revalidating

Always call `revalidatePath()` after mutations:
```typescript
revalidatePath('/dashboard/projects')  // Specific path
revalidatePath('/dashboard/projects', 'layout')  // All nested routes
```

## Key File Locations

- **Auth middleware:** `/src/middleware.ts`, `/src/lib/supabase/middleware.ts`
- **Supabase clients:** `/src/lib/supabase/server.ts`, `/src/lib/supabase/client.ts`
- **Portal auth:** `/src/lib/portal-auth.ts`
- **Email system:** `/src/lib/email/index.ts`, `/src/lib/email/templates.ts`
- **Server actions:** Throughout `/src/app/` directories (look for `'use server'`)
- **UI components:** `/src/components/ui/` (shadcn), `/src/components/dashboard/`, `/src/components/portal/`
- **Database migrations:** `/supabase/migrations/`

## UI Component Library (shadcn/ui)

This project uses shadcn/ui components. Configuration in `components.json`.

**Adding new components:**
```bash
npx shadcx@latest add button
npx shadcx@latest add dialog
# etc.
```

Components are installed directly into `/src/components/ui/` and can be modified as needed.

**Styling with Tailwind:**
- Use `cn()` utility from `/src/lib/utils.ts` to merge classes
- Tailwind config uses CSS variables for theming (see `/src/app/globals.css`)
