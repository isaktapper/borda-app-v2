'use client'

import { RichTextEditor } from './rich-text-editor'

interface TextBlockContent {
    html?: string
    // Backward compatibility with old format
    variant?: 'h1' | 'h2' | 'h3' | 'p'
    text?: string
}

interface TextBlockEditorProps {
    blockId: string
    content: TextBlockContent
    onChange: (updates: Partial<TextBlockContent>) => void
}

// Convert old format to HTML
function migrateOldFormat(content: TextBlockContent): string {
    // If already HTML format, return it
    if (content.html) {
        return content.html
    }

    // Convert old { variant, text } format to HTML
    if (content.text !== undefined) {
        const text = content.text || ''
        const variant = content.variant || 'p'

        switch (variant) {
            case 'h1':
                return `<h1>${text}</h1>`
            case 'h2':
                return `<h2>${text}</h2>`
            case 'h3':
                return `<h3>${text}</h3>`
            case 'p':
            default:
                return `<p>${text}</p>`
        }
    }

    // Default empty content
    return '<p></p>'
}

export function TextBlockEditor({ blockId, content, onChange }: TextBlockEditorProps) {
    const html = migrateOldFormat(content)

    return (
        <div className="w-full">
            <RichTextEditor
                content={html}
                onChange={(newHtml) => onChange({ html: newHtml })}
                placeholder="Write something... Use the toolbar above for formatting"
            />
        </div>
    )
}
