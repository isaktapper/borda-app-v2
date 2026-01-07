# Share Modal Specification

## Overview

The Share Modal allows users to control how customers access their project portal. It provides flexible access control with options for public links, restricted access, and password protection.

---

## UI Placement

### Share Button
- **Location:** Top right corner of the project detail page, next to the "Preview" button
- **Icon:** `Share2` icon from Lucide
- **Label:** "Share" (with icon)
- **Behavior:** Opens the Share Modal dialog

```
┌─────────────────────────────────────────────────────────┐
│  Project Header                                         │
│  ┌─────────────────────────────────────────────────────┤
│  │ Project Name                    [Preview] [Share]   │
│  └─────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────┘
```

---

## Draft Project Handling

When the project status is **"Draft"**, the Share Modal should display an overlay:

### Draft Overlay
- **Visual:** Blur effect covering the entire modal content
- **Message:** "This project is in draft mode"
- **Sub-message:** "Activate the project to share it with customers"
- **Button:** "Activate Project" (primary button)
- **Behavior:** Clicking "Activate Project" changes project status from `draft` to `active`

Once activated:
- The overlay disappears
- The full Share Modal becomes accessible
- The project status in the header updates to "Active"

---

## Access Modes

The modal provides two primary access modes via radio buttons:

### 1. Public Access ("Anyone with the link")
- Anyone who has the portal URL can access it
- No email verification required
- Optional: Collect email for analytics (see below)

### 2. Restricted Access ("Only approved emails")
- Only customers whose emails are in the approved list can access
- Customer must enter their email to verify access
- Email is checked against the `project_members` table (role = 'customer')

---

## Access Settings

### Portal Link Section
```
┌─────────────────────────────────────────────────────────┐
│ Portal Link                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://app.example.com/portal/abc123    [Copy] 📋  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Access Mode Selection
```
┌─────────────────────────────────────────────────────────┐
│ Who can access this portal?                             │
│                                                         │
│ ○ Anyone with the link                                  │
│   Anyone who has this link can view the portal          │
│                                                         │
│ ● Only approved emails                                  │
│   Only customers you've added can access                │
└─────────────────────────────────────────────────────────┘
```

### Password Protection
- **Toggle:** Switch to enable/disable password protection
- **Available for:** Both public and restricted modes
- **Password Input:** Text field (appears when toggle is ON)
- **Storage:** Password is hashed using `bcrypt` before storing in database

```
┌─────────────────────────────────────────────────────────┐
│ Password Protection                              [OFF]  │
│                                                         │
│ When enabled:                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Password: ••••••••                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│ Visitors must enter this password to access the portal  │
└─────────────────────────────────────────────────────────┘
```

### Email for Analytics (Public Mode Only)
- **Toggle:** "Collect email for personalized analytics"
- **Only visible when:** Access mode is "Anyone with the link"
- **Purpose:** Track who visits even with public access
- **Behavior:** Prompts visitors for email before showing portal

```
┌─────────────────────────────────────────────────────────┐
│ Analytics                                        [ON]   │
│ Ask visitors for their email to track engagement        │
└─────────────────────────────────────────────────────────┘
```

---

## Approved Emails List (Restricted Mode)

When "Only approved emails" is selected, show a list of approved customers:

```
┌─────────────────────────────────────────────────────────┐
│ Approved Emails                                         │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Email                                          │    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ john@customer.com                              │ ✕  │ │
│ │ sarah@customer.com                             │ ✕  │ │
│ │ mike@customer.com                              │ ✕  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Add email...                            [Add]       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Projects Table Extensions
```sql
ALTER TABLE projects ADD COLUMN access_mode TEXT NOT NULL DEFAULT 'restricted'
  CHECK (access_mode IN ('public', 'restricted'));

ALTER TABLE projects ADD COLUMN access_password_hash TEXT;

ALTER TABLE projects ADD COLUMN require_email_for_analytics BOOLEAN DEFAULT false;
```

### Project Members Table (Existing)
Used for storing approved customer emails:
- `project_id` - Reference to project
- `invited_email` - Customer's email
- `role` - Set to 'customer' for portal access
- `invited_at` - When they were added
- `joined_at` - When they first accessed (nullable)

---

## Server Actions

### `share-actions.ts`

```typescript
// Get current share settings for a project
getShareSettings(projectId: string): Promise<ShareSettings>

// Update share settings (access mode, password, analytics toggle)
updateShareSettings(projectId: string, settings: UpdateShareSettingsInput): Promise<Result>

// Add an approved email
addApprovedEmail(projectId: string, email: string): Promise<Result>

// Remove an approved email
removeApprovedEmail(projectId: string, memberId: string): Promise<Result>
```

### ShareSettings Interface
```typescript
interface ShareSettings {
  accessMode: 'public' | 'restricted'
  hasPassword: boolean
  requireEmailForAnalytics: boolean
  approvedEmails: Array<{
    id: string
    email: string
    invitedAt: string
    joinedAt: string | null
  }>
  projectStatus: 'draft' | 'active' | 'completed' | 'archived'
}
```

---

## Portal Access Flow

### Public Mode (No Password)
```
User visits portal URL
       ↓
requireEmailForAnalytics?
    ├── YES → Show email input → Save email → Grant access
    └── NO  → Grant access immediately (anonymous)
```

### Public Mode (With Password)
```
User visits portal URL
       ↓
Show password input
       ↓
requireEmailForAnalytics?
    ├── YES → Also show email input
    └── NO  → Just password
       ↓
Validate password (bcrypt.compare)
       ↓
Grant access (with email or anonymous)
```

### Restricted Mode (No Password)
```
User visits portal URL
       ↓
Show email input
       ↓
Check email against project_members
    ├── FOUND    → Grant access
    └── NOT FOUND → Show "Access Denied"
```

### Restricted Mode (With Password)
```
User visits portal URL
       ↓
Show email + password inputs
       ↓
Check email against project_members
    ├── NOT FOUND → Show "Access Denied"
    └── FOUND     → Validate password
                        ├── VALID   → Grant access
                        └── INVALID → Show "Wrong password"
```

---

## Activity Tracking

### Identified Users
When a user provides their email (or is in restricted mode):
- `portal_visits.visitor_email` = user's email
- `activity_log.actor_email` = user's email
- Activity shows: "john@customer.com completed a task"

### Anonymous Users
When public mode without email collection:
- `portal_visits.visitor_email` = 'anonymous'
- `activity_log.actor_email` = 'anonymous'
- Activity shows: "Anonymous Customer completed a task"

---

## Component Structure

```
src/
├── components/
│   └── dashboard/
│       └── share-modal.tsx          # Main modal component
│
└── app/
    └── (app)/
        └── projects/
            └── [projectId]/
                └── share-actions.ts  # Server actions
```

---

## Modal UI States

### Loading State
- Show spinner while fetching settings
- Disable all inputs

### Saving State
- Show "Saving..." on changed fields
- Auto-save on toggle changes
- Debounce password input

### Error State
- Show toast notification on errors
- Keep modal open for retry

---

## Integration with Stakeholders Section

The Share Modal can also be opened from the Stakeholders section in Settings:
- "Add Stakeholder" button opens Share Modal
- When modal closes, stakeholders list refreshes
- Provides consistent UX for managing customer access

---

## Security Considerations

1. **Password Hashing:** Always use bcrypt with appropriate salt rounds (10+)
2. **Session Management:** Use JWT tokens for portal sessions
3. **RLS Policies:** Ensure database policies restrict access appropriately
4. **Rate Limiting:** Consider rate limiting on access validation endpoints
5. **Audit Logging:** Log all access attempts for security review

