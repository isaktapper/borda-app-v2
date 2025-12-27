/**
 * Branding utilities for logo and color management
 */

import { createClient } from '@/lib/supabase/client'

const DEFAULT_BRAND_COLOR = '#bef264' // Lime-300 (matches our primary)

interface Branding {
    color: string
    logoUrl: string | null
}

/**
 * Converts hex color to HSL format for CSS variables
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
    if (!logoPath) {
        return null
    }

    try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
            .from('branding')
            .createSignedUrl(logoPath, 3600) // 1 hour expiry

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
    if (!avatarPath) {
        return null
    }

    try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(avatarPath, 3600) // 1 hour expiry

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
 * Resolves branding (color + logo) with fallback hierarchy:
 * Project → Organization → Default
 */
export async function getBranding(
    project: { brand_color?: string | null; logo_path?: string | null },
    organization: { brand_color?: string | null; logo_path?: string | null }
): Promise<Branding> {
    // Resolve color with fallback
    const color = project.brand_color ?? organization.brand_color ?? DEFAULT_BRAND_COLOR

    // Resolve logo with fallback
    const logoPath = project.logo_path ?? organization.logo_path ?? null
    const logoUrl = logoPath ? await getSignedLogoUrl(logoPath) : null

    return {
        color,
        logoUrl
    }
}

/**
 * Preset brand colors for easy selection
 */
export const PRESET_BRAND_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Slate', value: '#64748b' },
]
