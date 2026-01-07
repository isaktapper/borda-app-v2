/**
 * Storage path security utilities to prevent path traversal attacks.
 * 
 * Path traversal attacks occur when user-controlled input is used in file paths
 * without proper validation. An attacker could use sequences like "../" to
 * access files outside the intended directory.
 */

/**
 * Sanitizes a storage path segment (single part, no slashes).
 * Removes any characters that could be used for path traversal.
 */
export function sanitizePathSegment(segment: string): string {
    if (!segment || typeof segment !== 'string') {
        throw new Error('Invalid path segment')
    }

    // Remove any path traversal sequences and dangerous characters
    let sanitized = segment
        .replace(/\.\./g, '')           // Remove ".." sequences
        .replace(/[<>:"|?*\\]/g, '')    // Remove Windows-forbidden characters
        .replace(/\//g, '')             // Remove forward slashes (shouldn't be in segment)
        .replace(/^\.+/, '')            // Remove leading dots
        .replace(/\.+$/, '')            // Remove trailing dots (except for extensions)
        .trim()

    // Ensure the segment is not empty after sanitization
    if (!sanitized) {
        throw new Error('Path segment is empty after sanitization')
    }

    return sanitized
}

/**
 * Sanitizes a complete storage path to prevent path traversal attacks.
 * 
 * This function:
 * 1. Removes ".." sequences (path traversal)
 * 2. Removes leading slashes
 * 3. Normalizes multiple consecutive slashes
 * 4. Validates each path segment
 * 
 * @param path - The storage path to sanitize
 * @returns The sanitized path
 * @throws Error if the path is invalid or empty after sanitization
 */
export function sanitizeStoragePath(path: string): string {
    if (!path || typeof path !== 'string') {
        throw new Error('Invalid storage path')
    }

    // Remove any ".." sequences first (before splitting)
    let sanitized = path.replace(/\.\./g, '')

    // Remove leading/trailing slashes and normalize multiple slashes
    sanitized = sanitized
        .replace(/^\/+/, '')         // Remove leading slashes
        .replace(/\/+$/, '')         // Remove trailing slashes
        .replace(/\/+/g, '/')        // Normalize multiple consecutive slashes

    // Validate each segment
    const segments = sanitized.split('/')
    const validatedSegments = segments.map(segment => {
        // Allow empty segments to be filtered out
        if (!segment) return ''
        
        // Remove dangerous characters from each segment
        return segment
            .replace(/[<>:"|?*\\]/g, '')  // Remove Windows-forbidden characters
            .replace(/^\.+/, '')           // Remove leading dots
            .trim()
    }).filter(Boolean)  // Remove empty segments

    // Ensure we have at least one valid segment
    if (validatedSegments.length === 0) {
        throw new Error('Storage path is empty after sanitization')
    }

    return validatedSegments.join('/')
}

/**
 * Validates that a storage path is safe for use.
 * Returns true if the path is safe, false otherwise.
 * 
 * Use this for checking paths that come from the database or other trusted sources
 * where you want to verify safety without throwing errors.
 */
export function isValidStoragePath(path: string): boolean {
    if (!path || typeof path !== 'string') {
        return false
    }

    // Check for path traversal patterns
    if (path.includes('..')) {
        return false
    }

    // Check for absolute paths
    if (path.startsWith('/')) {
        return false
    }

    // Check for null bytes
    if (path.includes('\0')) {
        return false
    }

    // Check for Windows-style paths
    if (/^[a-zA-Z]:/.test(path)) {
        return false
    }

    return true
}

/**
 * Sanitizes a file extension to prevent attacks via malicious extensions.
 */
export function sanitizeFileExtension(extension: string): string {
    if (!extension || typeof extension !== 'string') {
        return ''
    }

    // Remove leading dot if present
    extension = extension.replace(/^\./, '')

    // Only allow alphanumeric characters
    return extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/**
 * Creates a safe storage path from components.
 * This is the preferred way to construct storage paths from user input.
 * 
 * @example
 * buildStoragePath('org123', 'proj456', 'downloads', 'file.pdf')
 * // Returns: "org123/proj456/downloads/file.pdf"
 */
export function buildStoragePath(...segments: string[]): string {
    const sanitizedSegments = segments
        .filter(Boolean)
        .map(segment => {
            // If it looks like a filename (contains a dot in the last part), handle specially
            if (segment.includes('.') && !segment.includes('/')) {
                const parts = segment.split('.')
                const ext = parts.pop() || ''
                const name = parts.join('.')
                return `${sanitizePathSegment(name)}.${sanitizeFileExtension(ext)}`
            }
            return sanitizePathSegment(segment)
        })

    if (sanitizedSegments.length === 0) {
        throw new Error('Cannot build empty storage path')
    }

    return sanitizedSegments.join('/')
}

