# Block Editor Design Guide

## Principles

1. **Compact & Functional** - Maximize content, minimize chrome
2. **Consistent Layout** - All editors follow same pattern
3. **Progressive Disclosure** - Use tabs to organize complex settings
4. **Immediate Feedback** - No save button, changes apply instantly

## Layout Structure

```
┌─────────────────────────────────┐
│ Block Info Header               │ ← 60px, muted bg
│ Icon + Title + Description      │
├─────────────────────────────────┤
│ [Tab1] [Tab2] [Tab3]           │ ← Optional tabs
├─────────────────────────────────┤
│                                 │
│ Content Area (scrollable)       │ ← p-4 padding
│                                 │
│ - Form groups with labels       │
│ - Inputs/controls               │
│ - Helper text                   │
│                                 │
└─────────────────────────────────┘
```

## Spacing Standards

- **Outer padding:** `p-4` (16px)
- **Section gaps:** `space-y-4` (16px between sections)
- **Form field gaps:** `space-y-3` (12px between fields)
- **Label to input:** `mb-2` (8px)
- **Inline elements:** `gap-2` (8px)

## Typography

- **Section heading:** `text-sm font-semibold`
- **Form label:** `text-sm font-medium`
- **Helper text:** `text-xs text-muted-foreground`
- **Input text:** `text-sm`

## Components

Use shadcn/ui components consistently:
- `Label` for form labels
- `Input` for text fields
- `Textarea` for multiline
- `Select` for dropdowns
- `Switch` for toggles
- `Button` variant="outline" for actions

## Tabs (when needed)

Use tabs for:
- **Content** - Main editing interface
- **Settings** - Configuration options
- **Layout** - Display/styling options

Don't use tabs if editor is simple (< 5 fields).

## Example: Simple Editor

```typescript
export function TextBlockEditor({ content, onChange }) {
  return (
    <BlockEditorWrapper blockType="text">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2">Content</Label>
          <RichTextEditor
            value={content.html}
            onChange={(html) => onChange({ html })}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use markdown formatting for rich text
          </p>
        </div>
      </div>
    </BlockEditorWrapper>
  )
}
```

## Example: Complex Editor with Tabs

```typescript
export function FormBlockEditor({ content, onChange }) {
  const [activeTab, setActiveTab] = useState('questions')

  return (
    <BlockEditorWrapper
      blockType="form"
      tabs={[
        { id: 'questions', label: 'Questions' },
        { id: 'settings', label: 'Settings' }
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'questions' && (
        <QuestionsTab content={content} onChange={onChange} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab content={content} onChange={onChange} />
      )}
    </BlockEditorWrapper>
  )
}
```

## Migration Checklist

When refactoring an existing block editor:

- [ ] Remove outer `Card` component
- [ ] Wrap content in `BlockEditorWrapper`
- [ ] Add tabs if complex (> 5 settings)
- [ ] Apply consistent spacing (p-4, space-y-4, etc.)
- [ ] Use shadcn/ui components consistently
- [ ] Add helper text where appropriate
- [ ] Test in unified sidebar (480px width)

## Design Tokens

```typescript
// Sidebar
export const SIDEBAR_WIDTH = 480 // px
export const SIDEBAR_PADDING = 16 // px (p-4)

// Spacing
export const SECTION_GAP = 16 // px (space-y-4)
export const FIELD_GAP = 12 // px (space-y-3)
export const LABEL_MARGIN = 8 // px (mb-2)
export const INLINE_GAP = 8 // px (gap-2)

// Typography
export const HEADING_SIZE = 'text-sm font-semibold'
export const LABEL_SIZE = 'text-sm font-medium'
export const HELPER_SIZE = 'text-xs text-muted-foreground'
export const INPUT_SIZE = 'text-sm'

// Colors
export const TAB_ACTIVE_BG = 'bg-background'
export const TAB_INACTIVE_BG = 'hover:bg-muted/50'
export const SECTION_BG = 'bg-muted/30'
export const SELECTED_RING = 'ring-2 ring-primary/50'
```
