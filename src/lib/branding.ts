/**
 * Branding utilities for logo and color management
 */

import { createClient } from '@/lib/supabase/client'
import { sanitizeStoragePath, isValidStoragePath } from '@/lib/storage-security'
import { hexToOKLCH as convertHexToOKLCH } from '@/lib/colors'

const DEFAULT_BRAND_COLOR = '#000000' // Black default

interface Branding {
    color: string           // Hex format for compatibility
    colorOKLCH: string      // OKLCH format for modern usage
    logoUrl: string | null
    gradientCSS: string
}

/**
 * Converts hex color to OKLCH format
 * Example: #3b82f6 → "oklch(0.59 0.22 240)"
 */
export function hexToOKLCH(hex: string): string {
    return convertHexToOKLCH(hex)
}

/**
 * Converts hex color to HSL format for CSS variables
 * @deprecated Use hexToOKLCH instead for better color consistency
 * Example: #6366f1 → "239 84% 67%"
 */
export function hexToHSL(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '')

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
            case g:
                h = ((b - r) / d + 2) / 6
                break
            case b:
                h = ((r - g) / d + 4) / 6
                break
        }
    }

    // Convert to degrees and percentages
    const hDeg = Math.round(h * 360)
    const sPercent = Math.round(s * 100)
    const lPercent = Math.round(l * 100)

    return `${hDeg} ${sPercent}% ${lPercent}%`
}

/**
 * Validates hex color format
 */
export function isValidHexColor(hex: string): boolean {
    return /^#?[0-9A-F]{6}$/i.test(hex)
}

/**
 * Ensures hex color has # prefix
 */
export function normalizeHexColor(hex: string): string {
    hex = hex.trim()
    return hex.startsWith('#') ? hex : `#${hex}`
}

/**
 * Gets signed URL for a logo from Supabase Storage
 */
export async function getSignedLogoUrl(logoPath: string): Promise<string | null> {
    if (!logoPath || !isValidStoragePath(logoPath)) {
        return null
    }

    try {
        const supabase = createClient()
        const safePath = sanitizeStoragePath(logoPath)
        const { data, error } = await supabase.storage
            .from('branding')
            .createSignedUrl(safePath, 3600) // 1 hour expiry

        if (error) {
            console.error('[getSignedLogoUrl] Error:', error)
            return null
        }

        return data.signedUrl
    } catch (error) {
        console.error('[getSignedLogoUrl] Unexpected error:', error)
        return null
    }
}

/**
 * Gets signed URL for an avatar from Supabase Storage
 */
export async function getSignedAvatarUrl(avatarPath: string): Promise<string | null> {
    if (!avatarPath || !isValidStoragePath(avatarPath)) {
        return null
    }

    try {
        const supabase = createClient()
        const safePath = sanitizeStoragePath(avatarPath)
        const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(safePath, 3600) // 1 hour expiry

        if (error) {
            console.error('[getSignedAvatarUrl] Error:', error)
            return null
        }

        return data.signedUrl
    } catch (error) {
        console.error('[getSignedAvatarUrl] Unexpected error:', error)
        return null
    }
}

/**
 * Resolves branding (color + logo + gradient) with fallback hierarchy:
 * Project → Organization → Default
 */
export async function getBranding(
    project: { brand_color?: string | null; logo_path?: string | null; background_gradient?: string | null },
    organization: { brand_color?: string | null; logo_path?: string | null; background_gradient?: string | null }
): Promise<Branding> {
    // Resolve color with fallback
    const color = project.brand_color ?? organization.brand_color ?? DEFAULT_BRAND_COLOR

    // Convert to OKLCH for modern usage
    const colorOKLCH = convertHexToOKLCH(color)

    // Resolve logo with fallback
    const logoPath = project.logo_path ?? organization.logo_path ?? null
    const logoUrl = logoPath ? await getSignedLogoUrl(logoPath) : null

    // Resolve gradient with fallback
    const gradientValue = project.background_gradient ?? organization.background_gradient ?? null
    const gradientCSS = getGradientCSS(gradientValue)

    return {
        color,          // Hex for backward compatibility
        colorOKLCH,     // OKLCH for modern usage
        logoUrl,
        gradientCSS
    }
}

/**
 * Preset brand colors for easy selection
 * Includes both hex (for compatibility) and OKLCH (for modern usage)
 */
export const PRESET_BRAND_COLORS = [
    { name: 'Blue', value: '#3b82f6', oklch: 'oklch(0.59 0.22 240)' },
    { name: 'Indigo', value: '#6366f1', oklch: 'oklch(0.54 0.24 275)' },
    { name: 'Violet', value: '#8b5cf6', oklch: 'oklch(0.58 0.26 295)' },
    { name: 'Purple', value: '#a855f7', oklch: 'oklch(0.60 0.28 305)' },
    { name: 'Pink', value: '#ec4899', oklch: 'oklch(0.62 0.28 350)' },
    { name: 'Red', value: '#ef4444', oklch: 'oklch(0.62 0.26 25)' },
    { name: 'Orange', value: '#f97316', oklch: 'oklch(0.68 0.24 45)' },
    { name: 'Amber', value: '#f59e0b', oklch: 'oklch(0.72 0.20 70)' },
    { name: 'Teal', value: '#14b8a6', oklch: 'oklch(0.68 0.18 180)' },
    { name: 'Green', value: '#22c55e', oklch: 'oklch(0.72 0.22 145)' },
    { name: 'Emerald', value: '#10b981', oklch: 'oklch(0.68 0.20 160)' },
    { name: 'Slate', value: '#64748b', oklch: 'oklch(0.52 0.04 240)' },
]

/**
 * Preset background gradients for portal customization
 */
export const PRESET_GRADIENTS = [
    {
        name: 'Sunset',
        value: 'sunset',
        css: 'linear-gradient(135deg, #FFF5F7 0%, #FFF1F3 25%, #FFE4E8 50%, #FED7E2 75%, #FCE7F0 100%)',
        description: 'Warm pink and peach tones'
    },
    {
        name: 'Ocean',
        value: 'ocean',
        css: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 33%, #BAE6FD 66%, #7DD3FC 100%)',
        description: 'Cool blue tones'
    },
    {
        name: 'Forest',
        value: 'forest',
        css: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 33%, #BBF7D0 66%, #86EFAC 100%)',
        description: 'Fresh green tones'
    },
    {
        name: 'Lavender',
        value: 'lavender',
        css: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 33%, #E9D5FF 66%, #D8B4FE 100%)',
        description: 'Soft purple tones'
    },
    {
        name: 'Amber',
        value: 'amber',
        css: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 33%, #FDE68A 66%, #FCD34D 100%)',
        description: 'Warm yellow tones'
    },
    {
        name: 'Slate',
        value: 'slate',
        css: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 33%, #E2E8F0 66%, #CBD5E1 100%)',
        description: 'Neutral gray tones'
    }
] as const

const DEFAULT_GRADIENT_CSS = 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)' // Subtle gray gradient

/**
 * Converts gradient preset identifier to CSS
 */
export function getGradientCSS(gradientValue: string | null | undefined): string {
    if (!gradientValue) {
        return DEFAULT_GRADIENT_CSS
    }

    const preset = PRESET_GRADIENTS.find(g => g.value === gradientValue)
    return preset ? preset.css : DEFAULT_GRADIENT_CSS
}
