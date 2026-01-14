# Building Blocks - Complete Guide

This guide documents how to create new block types in the Impel platform, based on the Timeline block implementation.

## Overview

A block consists of several interconnected parts:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Block System                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Database         → Migration for block type constraint       │
│  2. Data Model       → TypeScript interfaces                     │
│  3. Block Editor     → Edit UI component                         │
│  4. Block Renderer   → Display component (SharedBlockRenderer)   │
│  5. Integration      → Wire up in multiple files                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Database Migration

**File:** `supabase/migrations/[timestamp]_add_[blocktype]_block_type.sql`

The `blocks` table has a CHECK constraint limiting allowed types. You must add your new type:

```sql
-- Add [blocktype] to the allowed block types

-- Step 1: Drop the existing check constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

-- Step 2: Create new check constraint including your type
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
CHECK (type IN (
  'text', 'task', 'form', 'question', 'checklist', 
  'file_upload', 'file_download', 'embed', 'contact', 
  'divider', 'meeting', 'action_plan', 'media', 
  'accordion', 'timeline'  -- Add your type here
));
```

> ⚠️ **IMPORTANT:** Do NOT run migrations automatically. The user runs them manually.

---

## Step 2: Data Model (TypeScript Interfaces)

**File:** `src/components/blocks/shared-block-renderer.tsx` (top of file)

Define your block's content structure:

```typescript
// Example: Timeline block interfaces
interface TimelinePhase {
    id: string                    // crypto.randomUUID()
    title: string
    description?: string          // Optional
    date?: string                 // ISO date string
    status: 'completed' | 'current' | 'upcoming'
}

interface TimelineBlockContent {
    title?: string                // Block title
    description?: string          // Block description  
    phases: TimelinePhase[]       // Main data
    showDates: boolean            // Display option
}
```

---

## Step 3: Block Editor Component

**File:** `src/components/dashboard/editor/[blocktype]-block-editor.tsx`

Create the editing UI:

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { BlockEditorWrapper } from './block-editor-wrapper'
// ... other imports

interface YourBlockEditorProps {
    content: YourBlockContent
    onChange: (content: YourBlockContent) => void
}

export function YourBlockEditor({ content, onChange }: YourBlockEditorProps) {
    // Local state for complex interactions if needed
    
    const handleFieldChange = (field: string, value: any) => {
        onChange({ ...content, [field]: value })
    }

    return (
        <BlockEditorWrapper blockType="your_type">
            <div className="space-y-4">
                {/* Title input */}
                <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input
                        value={content.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="Block title..."
                    />
                </div>
                
                {/* Your block-specific fields */}
            </div>
        </BlockEditorWrapper>
    )
}
```

### For Sortable Lists (like Timeline phases)

Use `@dnd-kit` for drag-and-drop:

```typescript
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable item component
function SortableItem({ item, onUpdate, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <GripVertical {...attributes} {...listeners} />
            {/* Item content */}
        </div>
    )
}
```

---

## Step 4: Block Renderer (SharedBlockRenderer)

**File:** `src/components/blocks/shared-block-renderer.tsx`

### 4.1 Add to renderBlock switch

```typescript
// Around line 117-152 in renderBlock()
case 'your_type':
    return <YourBlock content={block.content} />
```

### 4.2 Create the renderer component

```typescript
function YourBlock({ content }: { content: YourBlockContent }) {
    // Handle empty state
    if (!content.items?.length) {
        return (
            <BlockContainer
                title={content.title}
                description={content.description}
            >
                <div className="text-center p-5 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                        No items added yet
                    </p>
                </div>
            </BlockContainer>
        )
    }

    return (
        <BlockContainer
            title={content.title}
            description={content.description}
        >
            {/* Your block's display UI */}
        </BlockContainer>
    )
}
```

### 4.3 Using Tooltips for extra info

```typescript
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

// In your component:
{item.description ? (
    <Tooltip>
        <TooltipTrigger asChild>
            <div className="cursor-help">
                <Info className="size-3.5 text-muted-foreground/50" />
                {/* Content */}
            </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{item.description}</p>
        </TooltipContent>
    </Tooltip>
) : (
    <div>{/* Content without tooltip */}</div>
)}
```

---

## Step 5: Integration Points

You must update **5 files** to fully integrate a new block:

### 5.1 `blocks-tab-content.tsx`

**Add to BLOCK_TYPES array:**
```typescript
// Around line 96-109
{ type: 'your_type', label: 'Your Block', icon: YourIcon, category: 'projects' },
```

**Add to BLOCK_ICONS map:**
```typescript
// Around line 111-124
your_type: YourIcon,
```

**Add to getBlockTitle function:**
```typescript
case 'your_type':
    return block.content.title || 'Your Block'
```

### 5.2 `editor-tab-content.tsx`

**Import your editor:**
```typescript
import { YourBlockEditor } from './your-block-editor'
import { YourIcon } from 'lucide-react'
```

**Add to BLOCK_EDITOR_CONFIG:**
```typescript
// Around line 60-118
your_type: {
    label: 'Your Block',
    description: 'Description of your block',
    icon: YourIcon
},
```

**Add case in BlockEditorRouter:**
```typescript
// Around line 182-274
case 'your_type':
    return (
        <YourBlockEditor
            content={block.content}
            onChange={onChange}
        />
    )
```

### 5.3 `space-v2-client.tsx`

**Add initial content in handleAddBlock:**
```typescript
// Around line 209-224
if (type === 'your_type') initialContent = {
    title: '',
    description: '',
    items: [],
    // ... your default values
}
```

### 5.4 `unified-editor-sidebar.tsx`

**Add to getBlockTypeLabel:**
```typescript
// Around line 137-150
your_type: 'Your Block',
```

### 5.5 `shared-block-renderer.tsx`

- Add TypeScript interface (top of file)
- Add case in `renderBlock()` switch
- Add renderer component function

---

## Common Patterns

### Status-based styling

```typescript
const getStatusStyles = () => {
    switch (status) {
        case 'completed':
            return {
                iconBg: 'bg-emerald-100 text-emerald-600',
                border: 'border-emerald-200',
            }
        case 'current':
            return {
                iconBg: 'bg-primary/10 text-primary',
                border: 'border-primary/30',
                glow: 'ring-2 ring-primary/20',
            }
        case 'upcoming':
            return {
                iconBg: 'bg-muted text-muted-foreground',
                border: 'border-muted',
            }
    }
}
```

### Date formatting

```typescript
import { format } from 'date-fns'

const formatDate = (dateString: string) => {
    try {
        return format(new Date(dateString), 'd MMM')
    } catch {
        return dateString
    }
}
```

### BlockContainer usage

Always wrap your block content in `BlockContainer`:

```typescript
<BlockContainer
    title={content.title}
    description={content.description}
>
    {/* Your content */}
</BlockContainer>
```

---

## Checklist for New Blocks

- [ ] **Migration:** Create SQL file to add type to constraint
- [ ] **Interface:** Define TypeScript types in shared-block-renderer.tsx
- [ ] **Editor:** Create `[type]-block-editor.tsx` component
- [ ] **Renderer:** Add component in shared-block-renderer.tsx
- [ ] **BLOCK_TYPES:** Add in blocks-tab-content.tsx
- [ ] **BLOCK_ICONS:** Add in blocks-tab-content.tsx
- [ ] **getBlockTitle:** Add case in blocks-tab-content.tsx
- [ ] **BLOCK_EDITOR_CONFIG:** Add in editor-tab-content.tsx
- [ ] **BlockEditorRouter:** Add case in editor-tab-content.tsx
- [ ] **handleAddBlock:** Add initial content in space-v2-client.tsx
- [ ] **getBlockTypeLabel:** Add in unified-editor-sidebar.tsx
- [ ] **renderBlock:** Add case in shared-block-renderer.tsx
- [ ] **Test:** Verify add, edit, save, and render all work

---

## Troubleshooting

### Block disappears on save
**Cause:** Database constraint doesn't include your block type
**Fix:** Run migration to add type to `blocks_type_check` constraint

### Block can't be added
**Cause:** Missing from `BLOCK_TYPES` array
**Fix:** Add to blocks-tab-content.tsx

### Block can't be edited
**Cause:** Missing case in `BlockEditorRouter`
**Fix:** Add case in editor-tab-content.tsx

### Block shows "Unknown block type"
**Cause:** Missing case in `renderBlock()`
**Fix:** Add case and renderer component in shared-block-renderer.tsx

### Block title shows wrong in sidebar
**Cause:** Missing in `getBlockTitle()` or `getBlockTypeLabel()`
**Fix:** Add cases in both blocks-tab-content.tsx and unified-editor-sidebar.tsx
