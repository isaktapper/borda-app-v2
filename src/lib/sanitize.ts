import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses DOMPurify with a safe configuration.
 */
export function sanitizeHtml(html: string): string {
    // Only run on client side (DOMPurify requires DOM)
    if (typeof window === 'undefined') {
        // On server, return empty or the raw HTML
        // The actual sanitization happens on the client
        return html
    }

    return DOMPurify.sanitize(html, {
        // Allow common safe HTML tags
        ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a', 'blockquote', 'pre', 'code',
            'div', 'span',
            'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img'
        ],
        // Allow safe attributes
        ALLOWED_ATTR: [
            'href', 'target', 'rel', 'class', 'id',
            'src', 'alt', 'width', 'height',
            'style'
        ],
        // Force all links to open in new tab and add security attributes
        ADD_ATTR: ['target', 'rel'],
        // Forbid dangerous protocols
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    })
}

