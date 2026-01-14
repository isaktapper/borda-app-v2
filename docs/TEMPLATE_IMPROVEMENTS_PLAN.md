# Template Improvements Plan

> **Project Goal:** Enable creating templates independently from spaces, with AI-assisted template generation.

## Executive Summary

This document outlines the implementation plan for two major template improvements:

1. **Phase 1:** Standalone template editor - Create templates without needing an existing space
2. **Phase 2:** AI-powered template creation - Generate templates from natural language or uploaded documents

---

## Current State Analysis

### How Templates Work Today

```
┌─────────────────────────────────────────────────────────────────┐
│                    Current Template Flow                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Create a Space manually                                      │
│  2. Build pages and blocks in the space                          │
│  3. Go to Space Settings → Templates                             │
│  4. Click "Save as Template" to snapshot the space               │
│  5. Template stores: pages[], each with blocks[]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files
- `/src/app/(app)/templates/` - Templates listing page
- `/src/app/(app)/templates/actions.ts` - Template CRUD operations
- `/src/lib/types/templates.ts` - TypeScript interfaces
- `/src/components/dashboard/space-v2-client.tsx` - Space editor
- `/src/components/dashboard/editor/*` - Block editors

### Database Schema (Current)

```sql
templates (
  id uuid,
  organization_id uuid,
  name text,
  description text,
  template_data jsonb,  -- { pages: TemplatePage[] }
  is_public boolean,
  created_by uuid,
  created_at, updated_at, deleted_at
)
```

---

## Phase 1: Standalone Template Editor

### Overview

Enable users to create templates directly from `/templates` without first creating a space. The template editor will be a modified version of the space editor with template-specific functionality.

### Key Differences from Space Editor

| Feature | Space Editor | Template Editor |
|---------|--------------|-----------------|
| Share button | ✅ Yes | ❌ No |
| Preview button | ✅ Portal preview | ⚠️ Template preview (read-only) |
| Task assignees | ✅ Staff/Stakeholder | ❌ No assignment (template) |
| Due dates | ✅ Absolute dates | ✅ **Relative dates** (e.g., +5 days) |
| Settings tab | ✅ General, Branding, Templates | ✅ Template info only |
| Activity tab | ✅ Yes | ❌ No |
| Responses tab | ✅ Yes | ❌ No |
| URL structure | `/spaces/[spaceId]` | `/templates/[templateId]` |

### Relative Due Dates (Valuecase-style)

Based on [Valuecase documentation](https://help.valuecase.com/en/articles/232082-configure-relative-task-due-dates-in-templates):

**Reference Date Options:**
1. **Start Date Based** - Tasks scheduled forward from space creation date
   - `+0` = Same day as start
   - `+5` = 5 business days after start
   
2. **Target Date Based** - Tasks scheduled backward from go-live date
   - `-10` = 10 business days before target
   - `+0` = Same day as target

**Template Settings:**
```typescript
interface TemplateSettings {
  referenceDateType: 'start' | 'target'
  skipWeekends: boolean  // Count only business days
}
```

**Task Due Date in Templates:**
```typescript
interface TemplateTask {
  // ... existing fields
  dueDate?: string           // Remove absolute date support
  relativeDueDate?: number   // +5 or -10 (days from reference)
}
```

---

### User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    New Template Creation Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /templates                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Templates                              [+ New Template]  │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  NAME         DESCRIPTION      PAGES    CREATED          │   │
│  │  Onboarding   Customer...      3        Jan 10, 2026     │   │
│  │  Enterprise   Large client...  5        Jan 5, 2026      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  Click "+ New Template"                                          │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Create New Template                                      │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                           │   │
│  │  ○ Start from scratch                                     │   │
│  │  ○ Create with AI ✨ (Phase 2)                            │   │
│  │                                                           │   │
│  │  Template Name: [________________________]                │   │
│  │  Description:   [________________________]                │   │
│  │                                                           │   │
│  │                          [Cancel]  [Create Template]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  /templates/[templateId]                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ← Templates  │ Editor │ Settings │        [Preview]     │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  ┌─────────────┐  ┌────────────────────────────────────┐ │   │
│  │  │ PAGES       │  │                                    │ │   │
│  │  │ ─────────── │  │    Page Content Preview            │ │   │
│  │  │ Welcome     │  │                                    │ │   │
│  │  │ Onboarding  │  │    [Block]                         │ │   │
│  │  │ Resources   │  │    [Block]                         │ │   │
│  │  │             │  │    [Block]                         │ │   │
│  │  │ [+ Page]    │  │                                    │ │   │
│  │  └─────────────┘  └────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Implementation Tasks

#### 1.1 Database Changes

**File:** `supabase/migrations/[timestamp]_template_editor_support.sql`

```sql
-- Add template editor support columns
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS reference_date_type text DEFAULT 'start' 
  CHECK (reference_date_type IN ('start', 'target')),
ADD COLUMN IF NOT EXISTS skip_weekends boolean DEFAULT true;

-- Note: template_data JSONB structure remains the same
-- Relative dates stored in task.relativeDueDate (number)
```

#### 1.2 New Routes

| Route | Purpose |
|-------|---------|
| `/templates/new` | Create template modal/page |
| `/templates/[templateId]` | Template editor (like space editor) |
| `/templates/[templateId]/preview` | Read-only template preview |

#### 1.3 New Components

```
src/
├── app/
│   └── (editor)/
│       └── templates/
│           └── [templateId]/
│               ├── page.tsx              # Template editor page
│               └── loading.tsx
│
├── components/
│   └── dashboard/
│       ├── template-editor-client.tsx    # Main template editor (fork of space-v2-client)
│       ├── template-header.tsx           # Header without Share button
│       ├── create-template-modal.tsx     # Modal for creating new template
│       └── editor/
│           ├── template-settings-tab.tsx # Template-specific settings
│           └── relative-date-picker.tsx  # Component for +N / -N day selection
```

#### 1.4 Type Definitions

**File:** `src/lib/types/templates.ts`

```typescript
// Add to existing file

export interface TemplateSettings {
  referenceDateType: 'start' | 'target'
  skipWeekends: boolean
}

// Extend TemplateBlock content for action_plan
export interface TemplateActionPlanTask {
  id: string
  title: string
  description?: string
  relativeDueDate?: number  // +5 (after start) or -10 (before target)
  // Note: No assignee field in templates
  quickAction?: QuickAction
}

export interface TemplateActionPlanMilestone {
  id: string
  title: string
  description?: string
  relativeDueDate?: number
  sortOrder: number
  tasks: TemplateActionPlanTask[]
}

export interface TemplateActionPlanContent {
  title?: string
  description?: string
  milestones: TemplateActionPlanMilestone[]
  permissions?: ActionPlanPermissions
}
```

#### 1.5 Server Actions

**File:** `src/app/(app)/templates/actions.ts`

Add these functions:

```typescript
// Create empty template
export async function createTemplate(name: string, description?: string)

// Update template data (pages, blocks)
export async function updateTemplateData(templateId: string, data: TemplateData)

// Update template settings
export async function updateTemplateSettings(
  templateId: string, 
  settings: TemplateSettings
)

// Get template with all data for editor
export async function getTemplateForEditor(templateId: string)

// Add page to template
export async function addTemplatePageAction(templateId: string, title: string)

// Delete page from template  
export async function deleteTemplatePageAction(templateId: string, pageId: string)

// Reorder pages in template
export async function reorderTemplatePagesAction(templateId: string, pageIds: string[])
```

#### 1.6 Modified Block Editors

The following block editors need "template mode" support:

| Block Type | Changes Needed |
|------------|----------------|
| `action-plan-block-editor.tsx` | Hide assignee picker, show relative date picker |
| `task-block-editor.tsx` | Same as above |
| Calendar pickers | Replace with relative date input (+N/-N days) |

**Approach:** Add `isTemplateMode?: boolean` prop to editors that need modification.

---

### Detailed File Changes

#### 1. Template Editor Page

**File:** `src/app/(editor)/templates/[templateId]/page.tsx`

```typescript
// Similar structure to /src/app/(editor)/spaces/[spaceId]/page.tsx
// But loads template data instead of space data
```

#### 2. Template Editor Client

**File:** `src/components/dashboard/template-editor-client.tsx`

Key differences from `space-v2-client.tsx`:

1. **Header:** Use `TemplateHeader` instead of `SpaceHeader`
   - No Share button
   - No status badge
   - Back link goes to `/templates`

2. **Tabs:** Only "Editor" and "Settings"
   - No Activity tab
   - No Responses tab

3. **Sidebar:** Pass `isTemplateMode={true}` to editors

4. **Data handling:** 
   - Save to `templates.template_data` instead of `pages`/`blocks` tables
   - All data is in-memory until saved (like current behavior)

#### 3. Template Header

**File:** `src/components/dashboard/template-header.tsx`

```typescript
interface TemplateHeaderProps {
  templateId: string
  templateName: string
  activeTab: 'editor' | 'settings'
  pages: TemplatePage[]
  selectedPageId: string | null
  onTabChange: (tab: 'editor' | 'settings') => void
  onPageSelect: (pageId: string) => void
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
}

// Render:
// [← Templates] [Editor] [Settings]    {templateName}    [Save] [Preview]
```

#### 4. Relative Date Picker

**File:** `src/components/dashboard/editor/relative-date-picker.tsx`

```typescript
interface RelativeDatePickerProps {
  value?: number           // +5 or -10
  onChange: (value: number | undefined) => void
  referenceType: 'start' | 'target'
}

// UI: Input with +/- prefix and "business days" suffix
// Example: [+] [5] business days from start
// Example: [-] [10] business days before target
```

---

### UI Mockups

#### Create Template Modal

```
┌────────────────────────────────────────────────┐
│  Create New Template                        ✕  │
├────────────────────────────────────────────────┤
│                                                │
│  How would you like to start?                  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  📝  Start from scratch                  │  │
│  │      Build your template page by page    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  ✨  Create with AI (Coming soon)        │  │
│  │      Describe your implementation plan   │  │  ← Disabled in Phase 1
│  └──────────────────────────────────────────┘  │
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│  Template Name *                               │
│  ┌──────────────────────────────────────────┐  │
│  │ e.g., Enterprise Onboarding              │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Description (Optional)                        │
│  ┌──────────────────────────────────────────┐  │
│  │ Describe what this template is for...    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│                    [Cancel]  [Create Template] │
└────────────────────────────────────────────────┘
```

#### Template Settings Tab

```
┌────────────────────────────────────────────────────────────────────┐
│  Template Settings                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BASIC INFO                                                         │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Template Name                                                      │
│  ┌────────────────────────────────────────────┐                    │
│  │ Enterprise Onboarding                       │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                     │
│  Description                                                        │
│  ┌────────────────────────────────────────────┐                    │
│  │ Complete onboarding flow for enterprise... │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                     │
│                                                                     │
│  DATE SCHEDULING                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Reference Date                                                     │
│  ┌────────────────────────────────────────────┐                    │
│  │ ● Start Date (project kick-off)            │                    │
│  │ ○ Target Date (go-live deadline)           │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                     │
│  ┌────────────────────────────────────────────┐                    │
│  │ [✓] Skip weekends (count business days)    │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                     │
│                                                                     │
│  DANGER ZONE                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  [🗑️ Delete Template]                                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

#### Relative Date Picker (in Action Plan editor)

```
Task: Complete security review
┌─────────────────────────────────────────────────────────────────┐
│  [═] ☐  Security review                    [👤] [📅] [⚡] [🗑️] │
└─────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼ Click date icon
                                    ┌───────────────────────┐
                                    │  Due Date             │
                                    │  ────────────────────│
                                    │                       │
                                    │  [+] [5] days         │
                                    │                       │
                                    │  ℹ️ 5 business days   │
                                    │  after start date     │
                                    │                       │
                                    │  [Clear]              │
                                    └───────────────────────┘
```

---

### Acceptance Criteria (Phase 1)

- [ ] User can click "+ New Template" on /templates page
- [ ] User can create a template with name and description
- [ ] User is redirected to template editor after creation
- [ ] Template editor has Pages, Blocks, and Editor sidebar tabs
- [ ] User can add/edit/delete/reorder pages
- [ ] User can add/edit/delete/reorder blocks on each page
- [ ] All block types work in template mode
- [ ] Action Plan and Task blocks show relative date picker instead of calendar
- [ ] Action Plan and Task blocks hide assignee picker
- [ ] Template Settings tab shows template info and date scheduling options
- [ ] Save button persists all changes to database
- [ ] Template appears in /templates table after save
- [ ] Template can be used to create new spaces (existing flow works)
- [ ] Relative dates are converted to absolute dates when creating space from template

---

## Phase 2: AI-Powered Template Creation

### Overview

Allow users to generate templates using AI by:
1. Describing their implementation plan in natural language
2. Uploading documents (PDF, Word, Excel) with existing plans

### User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Template Creation Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Choose "Create with AI" in modal                        │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Create Template with AI ✨                               │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                           │   │
│  │  Describe your implementation plan:                       │   │
│  │  ┌───────────────────────────────────────────────────┐   │   │
│  │  │ Our customer onboarding has 4 phases:             │   │   │
│  │  │ 1. Kickoff meeting and requirements gathering     │   │   │
│  │  │ 2. Technical setup and integration (2 weeks)      │   │   │
│  │  │ 3. Training sessions for end users                │   │   │
│  │  │ 4. Go-live support and handoff                    │   │   │
│  │  │                                                   │   │   │
│  │  │ Each phase should have specific tasks with...     │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  Or upload existing documents:                            │   │
│  │  ┌───────────────────────────────────────────────────┐   │   │
│  │  │  📄 implementation_plan.docx          ✕           │   │   │
│  │  │  📊 project_timeline.xlsx             ✕           │   │   │
│  │  │  [+ Add more files]                               │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │                    [Cancel]  [Generate Template ✨]       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  Step 2: AI generates template structure                         │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Review Generated Template                                │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │                                                           │   │
│  │  Template Name: Customer Onboarding                       │   │
│  │                                                           │   │
│  │  📄 Pages (4)                                             │   │
│  │  ├── Welcome                                              │   │
│  │  │   └── Text: Welcome message                            │   │
│  │  │   └── Contact: Account manager                         │   │
│  │  ├── Phase 1: Kickoff                                     │   │
│  │  │   └── Action Plan: Kickoff tasks (5 tasks)             │   │
│  │  ├── Phase 2: Technical Setup                             │   │
│  │  │   └── Action Plan: Integration tasks (8 tasks)         │   │
│  │  │   └── File Upload: Technical docs                      │   │
│  │  └── Phase 3: Training                                    │   │
│  │      └── Action Plan: Training tasks (4 tasks)            │   │
│  │                                                           │   │
│  │          [← Back]  [Edit in Editor]  [Save Template]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Technical Architecture

#### AI Integration Options

1. **OpenAI GPT-4** (Recommended)
   - Best at understanding complex plans
   - JSON mode for structured output
   - Function calling for template schema

2. **Anthropic Claude**
   - Alternative option
   - Good at document analysis

#### Document Processing

| File Type | Processing Method |
|-----------|-------------------|
| PDF | pdf-parse or pdf.js |
| Word (.docx) | mammoth.js |
| Excel (.xlsx) | xlsx or exceljs |
| Plain text | Direct processing |

#### API Endpoint

**File:** `src/app/api/templates/generate/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { description, documentContents } = await request.json()
  
  // 1. Combine user description + document contents
  // 2. Send to OpenAI with template schema
  // 3. Return structured template data
  
  const templateData = await generateTemplateWithAI(
    description,
    documentContents
  )
  
  return NextResponse.json({ templateData })
}
```

#### AI Prompt Strategy

```typescript
const systemPrompt = `You are an expert at creating implementation plans 
and project templates. Given a description or document content, generate 
a structured template with pages and blocks.

Output format (JSON):
{
  "name": "Template name",
  "description": "Template description", 
  "pages": [
    {
      "title": "Page title",
      "blocks": [
        {
          "type": "action_plan",
          "content": {
            "title": "Phase name",
            "milestones": [
              {
                "title": "Milestone",
                "tasks": [
                  { 
                    "title": "Task", 
                    "relativeDueDate": 5  // days from start
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}

Block types available: text, action_plan, file_upload, file_download, 
contact, embed, timeline, divider`
```

---

### Implementation Tasks

#### 2.1 File Upload & Processing

**File:** `src/lib/document-parser.ts`

```typescript
export async function parseDocument(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'pdf':
      return parsePDF(file)
    case 'docx':
      return parseWord(file)
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    case 'txt':
    case 'md':
      return file.text()
    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}
```

#### 2.2 AI Template Generation

**File:** `src/lib/ai/template-generator.ts`

```typescript
export async function generateTemplate(
  description: string,
  documents: string[]
): Promise<TemplateData> {
  const openai = new OpenAI()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: TEMPLATE_GENERATION_PROMPT },
      { role: 'user', content: buildUserPrompt(description, documents) }
    ]
  })
  
  return parseAndValidateTemplate(response.choices[0].message.content)
}
```

#### 2.3 New Components

```
src/
├── components/
│   └── dashboard/
│       ├── ai-template-wizard.tsx       # Multi-step wizard for AI generation
│       ├── document-uploader.tsx        # File upload with preview
│       └── template-preview.tsx         # Preview generated template
```

#### 2.4 Environment Variables

```env
# .env.local
OPENAI_API_KEY=sk-...
```

---

### Cost Considerations

| Operation | Est. Tokens | Est. Cost (GPT-4 Turbo) |
|-----------|-------------|-------------------------|
| Simple template (text only) | ~2,000 | ~$0.06 |
| Complex template (with docs) | ~10,000 | ~$0.30 |
| Document parsing | Variable | - |

**Recommendation:** Consider usage limits or premium feature gating.

---

### Acceptance Criteria (Phase 2)

- [ ] User can select "Create with AI" in template creation modal
- [ ] User can enter free-text description of their plan
- [ ] User can upload PDF, Word, or Excel documents
- [ ] Documents are parsed and content extracted
- [ ] AI generates structured template from input
- [ ] User can preview generated template before saving
- [ ] User can edit generated template in editor
- [ ] Generated template saves correctly to database
- [ ] Error handling for AI failures and rate limits
- [ ] Loading states during AI processing

---

## Implementation Timeline

### Phase 1: Standalone Template Editor

| Week | Tasks |
|------|-------|
| 1 | Database migration, type definitions, route setup |
| 2 | Template editor client component, header, basic sidebar |
| 3 | Relative date picker, modified block editors |
| 4 | Settings tab, save/load functionality, testing |

**Estimated:** 4 weeks

### Phase 2: AI-Powered Creation

| Week | Tasks |
|------|-------|
| 1 | Document parsing library integration |
| 2 | OpenAI integration, prompt engineering |
| 3 | AI wizard UI, preview component |
| 4 | Testing, error handling, polish |

**Estimated:** 4 weeks

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complex template state management | Fork space editor, minimize changes |
| Relative date calculation errors | Comprehensive unit tests |
| AI generates invalid templates | Schema validation, fallback UI |
| Document parsing failures | Graceful degradation, manual input |
| API costs | Usage tracking, potential rate limits |

---

## Open Questions

1. **Should templates support multiple reference date types per template?**
   - E.g., some tasks from start, others from target
   - Recommendation: Start simple (one type per template)

2. **How to handle existing templates without relative dates?**
   - Treat as "no scheduled dates" in template mode
   - When editing, allow conversion

3. **Should AI generation be a premium feature?**
   - Consider API costs
   - Could be limited by plan tier

4. **Template versioning?**
   - Not in scope for Phase 1/2
   - Consider for future

---

## Appendix: File Reference

### Files to Create

```
src/app/(editor)/templates/[templateId]/page.tsx
src/app/(editor)/templates/[templateId]/loading.tsx
src/app/api/templates/generate/route.ts (Phase 2)
src/components/dashboard/template-editor-client.tsx
src/components/dashboard/template-header.tsx
src/components/dashboard/create-template-modal.tsx
src/components/dashboard/editor/template-settings-tab.tsx
src/components/dashboard/editor/relative-date-picker.tsx
src/components/dashboard/ai-template-wizard.tsx (Phase 2)
src/components/dashboard/document-uploader.tsx (Phase 2)
src/lib/document-parser.ts (Phase 2)
src/lib/ai/template-generator.ts (Phase 2)
supabase/migrations/[timestamp]_template_editor_support.sql
```

### Files to Modify

```
src/app/(app)/templates/page.tsx              # Add "New Template" button
src/app/(app)/templates/actions.ts            # Add new server actions
src/lib/types/templates.ts                    # Add new interfaces
src/components/dashboard/editor/action-plan-block-editor.tsx  # Template mode
src/components/dashboard/editor/task-block-editor.tsx         # Template mode
src/components/dashboard/templates-table.tsx  # Add edit action
```

---

*Document created: January 14, 2026*
*Last updated: January 14, 2026*
