# PostHog Analytics Documentation

This document describes all tracked events in Borda's PostHog integration.

## Setup

### Environment Variables

Add these to your `.env.local`:

```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### Getting Your API Key

1. Go to [PostHog EU](https://eu.posthog.com) and create an account
2. Create a new project for Borda
3. Go to Project Settings → Project API Key
4. Copy the key to your environment variables

## Architecture

```
src/lib/posthog/
├── provider.tsx      # PostHog React provider with EU hosting
├── types.ts          # TypeScript definitions for all events
├── analytics.ts      # Event tracking helper functions
├── feature-flags.ts  # Feature flag utilities and hooks
└── index.ts          # Barrel export
```

## User Identification

Users are automatically identified when they access the dashboard. The `PostHogIdentifier` component handles:

- **User traits**: email, name, plan, role, created_at, days_since_signup
- **Company group**: B2B analytics with company properties
- **Session recording**: Enabled for trial users

### User Traits

```typescript
{
  email: string
  name?: string
  company?: string
  company_id?: string
  plan?: 'trial' | 'growth' | 'scale'
  role?: 'owner' | 'admin' | 'member'
  created_at?: string
  days_since_signup?: number
  is_trial?: boolean
  trial_days_remaining?: number
}
```

### Company Properties (Group Analytics)

```typescript
{
  name: string
  plan: 'trial' | 'growth' | 'scale'
  employee_count?: string  // '1-10', '11-50', etc.
  industry?: string
  created_at: string
  is_trial?: boolean
}
```

## Tracked Events

### Signup & Onboarding

| Event | When | Properties |
|-------|------|------------|
| `signup_started` | User lands on signup page | `source`, `referrer` |
| `signup_completed` | User creates account | `method` (email/google), `source` |
| `onboarding_step_viewed` | Each step in wizard | `step`, `step_name`, `time_on_step_seconds` |
| `onboarding_completed` | Onboarding finished | `time_to_complete_seconds`, `steps_completed`, `industry`, `company_size`, `referral_source` |
| `workspace_created` | Workspace/org created | `workspace_name`, `has_logo`, `has_brand_color`, `industry`, `company_size` |

### Customer & Space Management

| Event | When | Properties |
|-------|------|------------|
| `space_created` | New space created | `space_id`, `space_name`, `status` |
| `space_published` | Space published | `space_id`, `space_name`, `customer_count` |
| `space_archived` | Space archived | `space_id`, `space_name` |
| `first_customer_invited` | First customer invite | `invite_method`, `customer_count`, `is_first_invite` |
| `customer_invited` | Customer invited | `invite_method`, `customer_count`, `is_first_invite` |
| `customer_added` | Customer added to space | `customer_count` |

### Task Events

| Event | When | Properties |
|-------|------|------------|
| `first_task_created` | First task created | `task_type`, `space_id` |
| `task_created` | Task created | `task_type`, `space_id` |
| `task_completed` | Task marked complete | `task_type`, `completed_by`, `space_id` |
| `task_reopened` | Task reopened | `task_type`, `space_id` |

### Engagement Events

| Event | When | Properties |
|-------|------|------------|
| `feature_used` | Feature used | `feature_name`, `context` |
| `file_uploaded` | File uploaded | `file_type`, `file_size_bytes`, `space_id` |
| `file_downloaded` | File downloaded | `file_type`, `space_id` |

### Integration Events

| Event | When | Properties |
|-------|------|------------|
| `integration_connected` | Integration connected | `integration_type` (slack/teams/etc), `action: 'connected'` |
| `integration_disconnected` | Integration disconnected | `integration_type`, `action: 'disconnected'` |

### Settings Events

| Event | When | Properties |
|-------|------|------------|
| `settings_changed` | Settings updated | `setting_name`, `setting_category`, `old_value`, `new_value` |

### Conversion Events

| Event | When | Properties |
|-------|------|------------|
| `trial_started` | Trial begins | `trial_length_days` |
| `upgrade_clicked` | Upgrade button clicked | `current_plan`, `target_plan`, `source` |
| `payment_completed` | Payment successful | `plan`, `billing_cycle`, `mrr`, `currency` |
| `trial_expired` | Trial ends without conversion | `days_active`, `features_used_count` |
| `churn` | Customer cancels | `reason`, `lifetime_days`, `plan`, `features_used_count` |

### Portal Events

| Event | When | Properties |
|-------|------|------------|
| `portal_viewed` | Customer views portal | `space_id`, `is_first_view` |
| `portal_page_viewed` | Customer views page | `space_id`, `page_name`, `is_first_view` |
| `portal_session_end` | Session ends | `duration_seconds`, `pages_viewed` |

## Usage Examples

### Track an Event

```typescript
import { trackSpaceCreated, trackFeatureUsed } from '@/lib/posthog'

// Track space creation
trackSpaceCreated({
  space_id: 'space_123',
  space_name: 'Acme Onboarding',
  status: 'draft'
})

// Track feature usage
trackFeatureUsed({
  feature_name: 'template',
  context: 'space_creation'
})
```

### Use Feature Flags

```typescript
import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/posthog'

function MyComponent() {
  const isNewDashboard = useFeatureFlag(FEATURE_FLAGS.NEW_DASHBOARD_LAYOUT)
  
  if (isNewDashboard) {
    return <NewDashboard />
  }
  return <OldDashboard />
}
```

### Identify User (Already handled automatically)

```typescript
import { identify, setCompanyGroup } from '@/lib/posthog'

// Identify user with traits
identify(userId, {
  email: 'user@company.com',
  name: 'John Doe',
  plan: 'growth'
})

// Set company group for B2B analytics
setCompanyGroup(companyId, {
  name: 'Acme Corp',
  plan: 'growth',
  employee_count: '11-50'
})
```

## Key Funnels to Create in PostHog

After implementation, create these funnels in PostHog UI:

### Signup Funnel
```
signup_started → signup_completed → workspace_created → first_customer_invited
```

### Activation Funnel
```
signup_completed → workspace_created → first_task_created → customer_added
```

### Conversion Funnel
```
trial_started → feature_used (3+ times) → upgrade_clicked → payment_completed
```

## Session Recording

Session recording is enabled for trial users to help understand where they struggle. Privacy settings:

- All text inputs are masked
- Password fields are blocked
- Elements with `data-ph-mask` attribute are masked
- Elements with `data-ph-block` or `.ph-no-capture` class are blocked

## Feature Flags

Available feature flags (defined in `src/lib/posthog/feature-flags.ts`):

| Flag | Description |
|------|-------------|
| `new-onboarding-flow` | A/B test onboarding flows |
| `skip-branding-step` | Skip branding in onboarding |
| `new-dashboard-layout` | New dashboard UI |
| `dark-mode` | Dark mode toggle |
| `teams-integration` | Microsoft Teams integration |
| `ai-suggestions` | AI-powered suggestions |
| `advanced-analytics` | Advanced analytics features |
| `beta-editor` | Beta block editor |
| `beta-automations` | Beta automations |
| `annual-discount-banner` | Annual billing discount banner |
| `free-trial-extension` | Extended trial offer |

## Privacy & GDPR

- **EU hosting**: Data stored in EU (eu.i.posthog.com)
- **DNT respect**: Do Not Track headers are honored
- **Secure cookies**: Enabled in production
- **Session recording**: Masks sensitive data

## Troubleshooting

### Events not appearing
1. Check `NEXT_PUBLIC_POSTHOG_KEY` is set correctly
2. Check browser console for PostHog errors
3. Verify DNT is not enabled in your browser

### Session recording not working
1. Ensure trial status is correctly passed to `PostHogIdentifier`
2. Check that the user is identified before recording starts

### Feature flags not loading
```typescript
import { reloadFeatureFlags } from '@/lib/posthog'

// Force reload flags
reloadFeatureFlags()
```
