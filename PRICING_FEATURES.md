# Borda - Complete Feature List for Pricing Strategy

## Product Overview
Borda is a customer portal platform designed for customer success teams. It enables organizations to create personalized onboarding/project portals for their customers, track engagement, and manage customer interactions throughout the customer journey.

---

## Core Features

### 1. Project Management
- **Create projects** - Each project represents a customer onboarding/implementation
- **Project statuses**: Draft → Active → Completed → Archived
- **Customer information** - Client name, project name
- **Target go-live dates** - Set deadlines for project completion
- **Project assignment** - Assign team members to specific projects
- **Auto-activation** - Projects automatically activate when first customer is invited

### 2. Page Builder (Portal Content)
Multi-page content creation with drag-and-drop organization:
- **Unlimited pages per project**
- **Page ordering and navigation**
- **WYSIWYG content editor**

### 3. Content Blocks (8 Block Types)

| Block Type | Description | Use Case |
|------------|-------------|----------|
| **Text Block** | Rich text with HTML formatting (headings, paragraphs, lists, links) | Instructions, guides, information |
| **Task Block** | Checklist items with due dates and descriptions | Customer action items, onboarding steps |
| **File Upload** | Customers can upload files with optional file type restrictions | Document collection, asset gathering |
| **File Download** | Share files with customers (PDF, images, documents) | Contracts, guides, resources |
| **Form Block** | Questions with multiple types: text, textarea, select, multiselect, date | Data collection, surveys, requirements |
| **Embed Block** | Embed Loom, YouTube videos | Training videos, tutorials |
| **Contact Card** | Team member profile with photo, name, title, email, phone | Point of contact information |
| **Divider** | Visual separator (line or space) | Content organization |

### 4. Customer Portal (White-labeled)
- **Branded customer experience** - Custom logos, colors, gradients
- **Mobile responsive design**
- **Progress tracking** - Visual progress indicator
- **Real-time data saving** - Task completions and form responses auto-save
- **Interactive elements** - Customers can complete tasks, upload files, answer questions
- **Multi-page navigation**

### 5. Access Control & Security

| Feature | Description |
|---------|-------------|
| **Public access** | Anyone with the link can access |
| **Restricted access** | Only approved email addresses can access |
| **Password protection** | Additional password layer for both modes |
| **Email collection** | Optional email capture for analytics on public portals |
| **Access tokens** | Secure, time-limited access links |
| **Portal sessions** | JWT-based session management |

### 6. Customer Invitation System
- **Email invitations** - Send branded invitation emails to customers
- **Magic link access** - No password required, secure token-based access
- **Resend invitations** - Easily resend access links
- **Cancel invitations** - Remove customer access
- **Track join status** - See who has accessed the portal

### 7. Branding & White-labeling

| Level | Features |
|-------|----------|
| **Organization level** | Default logo, brand color, background gradient |
| **Project level** | Override with project-specific branding |
| **Customer logo** | Display customer's logo in their portal |
| **Background gradients** | Preset professional gradient options |
| **Primary color** | Custom hex color for buttons, accents |

### 8. Team Management

| Role | Permissions |
|------|-------------|
| **Owner** | Full access including billing, user management, all settings |
| **Admin** | Manage users, all projects, settings (not billing) |
| **Member** | Create and edit assigned projects |

Features:
- Invite team members via email
- Role assignment and modification
- Remove team members
- Track invitation status

### 9. Activity Tracking & Analytics

#### Activity Types Tracked:
- Task completions/reopening
- File uploads/downloads
- Form responses
- Project status changes
- Portal visits

#### Activity Features:
- **Activity feed** - Real-time activity stream
- **Filtering** - By activity type, by project scope
- **Search** - Search through activities
- **Date grouping** - Activities organized by date
- **My Projects vs All Projects** - Toggle between personal and organization view

### 10. Engagement Metrics
- **Engagement levels**: High, Medium, Low, None
- **Portal visit tracking** - Log all customer visits
- **Time to first access** - Measure how quickly customers access their portal
- **Completion tracking** - Track task and form completion rates

### 11. Project Insights (Coming Soon / Analytics Dashboard)

| KPI | Description |
|-----|-------------|
| Total Projects | All-time project count |
| Active Projects | Currently active projects |
| Avg Completion Days | Average days from active to completed |
| Avg Time to First Access | Days from invite to first portal visit |
| Projects by Month | Trend chart of project creation |
| Status Distribution | Draft/Active/Completed/Archived breakdown |
| Engagement Distribution | High/Medium/Low engagement breakdown |
| Completion Funnel | Created → Activated → Completed funnel |
| Upcoming Deadlines | Projects approaching target dates |

### 12. Tags & Organization
- **Custom tags** - Create organization-wide tags with colors
- **Multi-tag projects** - Apply multiple tags per project
- **Tag filtering** - Filter project list by tags
- **Tag management** - Create, edit, delete tags

### 13. Templates
- **Save as template** - Convert any project structure to a reusable template
- **Template library** - Organization-wide template collection
- **Quick start** - Create new projects from templates

### 14. Tasks Dashboard (Cross-Project View)
- **Aggregated task view** - See all tasks across all projects
- **Grouped by project** - Tasks organized by project
- **Quick navigation** - Jump directly to project from task
- **Status overview** - See completion status at a glance

### 15. Integrations

#### Slack Integration
- **Connect workspace** - OAuth-based Slack connection
- **Channel selection** - Choose notification channel
- **Activity notifications** - Get notified when customers:
  - Complete tasks
  - Upload files
  - Submit form responses
  - Visit the portal

### 16. Email Notifications
- **Customer invitation emails** - Branded invite emails
- **Task reminder emails** (scheduled cron job)
- **Access request emails**

---

## Quantifiable Limits (For Tier Planning)

Consider these as potential limits per pricing tier:

| Feature | Possible Limits |
|---------|-----------------|
| Team members | 1, 3, 5, 10, Unlimited |
| Active projects | 5, 15, 50, Unlimited |
| Storage (files) | 1GB, 5GB, 25GB, 100GB |
| Portal visitors/month | 100, 500, 2000, Unlimited |
| Templates | 3, 10, Unlimited |
| Custom branding | Basic, Full, White-label |
| Integrations | None, Slack only, All |
| Activity history | 30 days, 90 days, 1 year, Unlimited |
| Analytics/Insights | Basic, Advanced |
| Support | Community, Email, Priority |

---

## Premium/Add-on Features to Consider

These features could be positioned as premium add-ons:

1. **Advanced Analytics Dashboard** - Detailed insights and reporting
2. **Custom Domain** - Use your own domain for portals
3. **Remove Borda branding** - Full white-label
4. **API Access** - Programmatic access
5. **SSO/SAML** - Enterprise single sign-on
6. **Audit logs** - Detailed security logging
7. **Custom integrations** - Beyond Slack
8. **Priority support** - Faster response times
9. **Dedicated success manager** - Enterprise support
10. **Data export** - Bulk data export capabilities
11. **Advanced permissions** - Granular role customization
12. **Multi-organization** - Manage multiple workspaces

---

## Competitive Positioning Points

**Key Value Propositions:**
1. **Purpose-built for customer onboarding** - Not a generic project tool
2. **Customer-facing portals** - Beautiful, branded experience for customers
3. **Zero customer login friction** - Magic link access, no passwords needed
4. **Real-time engagement tracking** - Know exactly where customers are in their journey
5. **Slack notifications** - Stay informed without checking the dashboard
6. **Progressive interaction** - Tasks, files, forms in one unified experience

---

## Technical Specifications

- **Platform**: Web-based (Next.js, React)
- **Database**: PostgreSQL (Supabase)
- **File Storage**: Cloud-based (Supabase Storage)
- **Authentication**: Email/Password, Google OAuth
- **Email Service**: Resend
- **Hosting**: Vercel-compatible

---

## User Types

1. **Organization Admin/Owner** - Manages team, billing, settings
2. **Team Member** - Creates and manages projects
3. **Customer** - Accesses their portal, completes tasks, uploads files

---

*Document generated for pricing strategy planning. Last updated: January 2026*

