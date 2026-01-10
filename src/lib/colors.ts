/**
 * Central Color System
 * Single source of truth for all OKLCH colors in the platform
 */

// ============================================================================
// Color Scales
// ============================================================================

/**
 * Grey scale colors (10 shades)
 * Used for backgrounds, borders, and text
 */
export const greyScale = {
  50: 'oklch(0.99 0 0)',   // #FCFCFC - Lightest
  100: 'oklch(0.97 0 0)',  // #F6F6F6
  200: 'oklch(0.96 0 0)',  // #F5F5F5
  300: 'oklch(0.93 0 0)',  // #EDEDED
  400: 'oklch(0.91 0 0)',  // #E8E8E8
  500: 'oklch(0.89 0 0)',  // #E4E4E6
  600: 'oklch(0.85 0 0)',  // #D8D8D8
  700: 'oklch(0.38 0 0)',  // #59595B
  800: 'oklch(0.21 0 0)',  // #2E2E30
  900: 'oklch(0.13 0 0)',  // #1B1B1B - Darkest
} as const

/**
 * Primary blue color ramp (11 shades from 50-950)
 * Used for interactive elements, buttons, links
 */
export const blueScale = {
  50: 'oklch(0.96 0.02 240)',   // #e8f6ff - Lightest
  100: 'oklch(0.94 0.04 240)',  // #d5edff
  200: 'oklch(0.88 0.08 240)',  // #b3dcff
  300: 'oklch(0.80 0.14 240)',  // #85c2ff
  400: 'oklch(0.69 0.18 240)',  // #5699ff
  500: 'oklch(0.59 0.22 240)',  // #2f70ff
  600: 'oklch(0.48 0.26 240)',  // #0c41ff - Primary
  700: 'oklch(0.43 0.28 240)',  // #0031eb
  800: 'oklch(0.39 0.24 240)',  // #0632cd
  900: 'oklch(0.33 0.18 240)',  // #10349f
  950: 'oklch(0.20 0.12 240)',  // #0a1c5c - Darkest
} as const

/**
 * Semantic status colors (kept from existing system)
 */
export const semanticStatusColors = {
  success: 'oklch(0.6 0.15 145)',      // Green
  warning: 'oklch(0.75 0.15 75)',      // Orange
  destructive: 'oklch(0.65 0.22 25)',  // Red
} as const

/**
 * Combined color scales
 */
export const colorScales = {
  grey: greyScale,
  blue: blueScale,
  ...semanticStatusColors,
} as const

// ============================================================================
// Semantic Color Tokens
// ============================================================================

/**
 * Background layers (4 levels for depth hierarchy)
 * Based on design principle: 4 background layers for product design
 */
export const backgroundColors = {
  1: greyScale[100],  // #F6F6F6 - Primary app background
  2: greyScale[200],  // #F5F5F5 - Cards, panels
  3: greyScale[300],  // #EDEDED - Hover states, nested panels
  4: greyScale[400],  // #E8E8E8 - Modals, popovers, deepest layer
} as const

/**
 * Border colors
 * Based on design principle: ~85% white for borders (not black)
 */
export const borderColors = {
  default: greyScale[500],  // #E4E4E6 - Primary borders (~85% white)
  subtle: greyScale[600],   // #D8D8D8 - Lighter borders
} as const

/**
 * Text colors (3 variants)
 * Based on design principle:
 * - Darkest: ~11% white for headings
 * - Body: 15-20% white
 * - Subtext: 30-40% white
 */
export const textColors = {
  primary: greyScale[900],    // #1B1B1B - Headings (~11% white)
  secondary: greyScale[800],  // #2E2E30 - Body text (15-20% white)
  muted: greyScale[700],      // #59595B - Subtext (30-40% white)
} as const

/**
 * Interactive element colors (Primary blue)
 * Based on design principle: Hover states step up the scale
 */
export const interactiveColors = {
  primary: blueScale[600],        // #0c41ff - Buttons, CTAs
  primaryHover: blueScale[700],   // #0031eb - Hover state (step up)
  primaryActive: blueScale[800],  // #0632cd - Active/pressed state
  primarySubtle: blueScale[100],  // #d5edff - Light backgrounds
  primaryMuted: blueScale[200],   // #b3dcff - Hover on light backgrounds
  accent: blueScale[400],         // #5699ff - Links, accents
  accentHover: blueScale[500],    // #2f70ff - Link hover
} as const

/**
 * Complete semantic color mapping
 */
export const semanticColors = {
  background: backgroundColors,
  border: borderColors,
  text: textColors,
  interactive: interactiveColors,
  status: semanticStatusColors,
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert hex color to OKLCH format
 * @param hex - Hex color string (with or without #)
 * @returns OKLCH color string
 */
export function hexToOKLCH(hex: string): string {
  // Normalize hex input
  const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`

  // Remove # and parse
  const cleanHex = normalizedHex.substring(1)

  // Parse RGB values
  let r: number, g: number, b: number

  if (cleanHex.length === 3) {
    // Short form: #RGB -> #RRGGBB
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255
    g = parseInt(cleanHex.substring(2, 4), 16) / 255
    b = parseInt(cleanHex.substring(4, 6), 16) / 255
  }

  // Convert RGB to linear RGB
  const toLinear = (c: number) => {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }

  const rLinear = toLinear(r)
  const gLinear = toLinear(g)
  const bLinear = toLinear(b)

  // Convert linear RGB to XYZ (D65 illuminant)
  const x = 0.4124564 * rLinear + 0.3575761 * gLinear + 0.1804375 * bLinear
  const y = 0.2126729 * rLinear + 0.7151522 * gLinear + 0.0721750 * bLinear
  const z = 0.0193339 * rLinear + 0.1191920 * gLinear + 0.9503041 * bLinear

  // Convert XYZ to OKLCH
  // First to OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z)
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z)
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const b_lab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  // Convert a, b to C, H
  const C = Math.sqrt(a * a + b_lab * b_lab)
  let H = Math.atan2(b_lab, a) * 180 / Math.PI

  if (H < 0) H += 360

  // Round to 2 decimal places
  const lightness = Math.round(L * 100) / 100
  const chroma = Math.round(C * 100) / 100
  const hue = Math.round(H * 100) / 100

  return `oklch(${lightness} ${chroma} ${hue})`
}

/**
 * Generate a light background color from an OKLCH color
 * Useful for badge backgrounds, hover states, etc.
 * @param oklchColor - OKLCH color string
 * @param opacity - Opacity level (0-1), default 0.1
 * @returns OKLCH color string with increased lightness
 */
export function getLightBackground(oklchColor: string, opacity: number = 0.1): string {
  // Parse OKLCH values
  const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)

  if (!match) {
    console.warn('Invalid OKLCH color format:', oklchColor)
    return oklchColor
  }

  const l = parseFloat(match[1])
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])

  // Increase lightness and reduce chroma for a subtle background
  const newL = Math.min(0.98, l + (1 - l) * 0.9)  // Push towards white
  const newC = c * opacity  // Reduce saturation based on opacity

  return `oklch(${newL.toFixed(2)} ${newC.toFixed(2)} ${h.toFixed(2)})`
}

/**
 * Get contrasting text color (black or white) for a given background
 * @param backgroundColor - OKLCH background color string
 * @returns 'oklch(0.13 0 0)' (black) or 'oklch(1 0 0)' (white)
 */
export function getContrastText(backgroundColor: string): string {
  // Parse OKLCH lightness value
  const match = backgroundColor.match(/oklch\(([\d.]+)/)

  if (!match) {
    console.warn('Invalid OKLCH color format:', backgroundColor)
    return greyScale[900]  // Default to black
  }

  const lightness = parseFloat(match[1])

  // If background is light (L > 0.5), use dark text; otherwise use white
  return lightness > 0.5 ? greyScale[900] : 'oklch(1 0 0)'
}

/**
 * Generate a full color scale (50-950) from a base OKLCH color
 * Useful for custom brand colors
 * @param baseColor - OKLCH color string (will be used as 600)
 * @returns Object with color scale from 50 to 950
 */
export function generateColorScale(baseColor: string): Record<number, string> {
  const match = baseColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)

  if (!match) {
    console.warn('Invalid OKLCH color format:', baseColor)
    return { 600: baseColor }
  }

  const baseL = parseFloat(match[1])
  const baseC = parseFloat(match[2])
  const baseH = parseFloat(match[3])

  // Generate scale by adjusting lightness
  // Keep chroma and hue constant for color consistency
  const scale: Record<number, string> = {}

  const steps = [
    { key: 50, l: 0.96 },
    { key: 100, l: 0.94 },
    { key: 200, l: 0.88 },
    { key: 300, l: 0.80 },
    { key: 400, l: 0.69 },
    { key: 500, l: 0.59 },
    { key: 600, l: baseL },  // Use base lightness
    { key: 700, l: baseL - 0.05 },
    { key: 800, l: baseL - 0.09 },
    { key: 900, l: baseL - 0.15 },
    { key: 950, l: baseL - 0.28 },
  ]

  steps.forEach(({ key, l }) => {
    const adjustedL = Math.max(0, Math.min(1, l))  // Clamp to 0-1
    const adjustedC = key <= 200 ? baseC * 0.5 : baseC  // Reduce chroma for very light colors
    scale[key] = `oklch(${adjustedL.toFixed(2)} ${adjustedC.toFixed(2)} ${baseH.toFixed(2)})`
  })

  return scale
}

/**
 * Validate OKLCH color string format
 * @param color - Color string to validate
 * @returns true if valid OKLCH format
 */
export function isValidOKLCH(color: string): boolean {
  return /^oklch\([\d.]+\s+[\d.]+\s+[\d.]+\)$/.test(color)
}

// ============================================================================
// TypeScript Types
// ============================================================================

export type GreyScale = typeof greyScale
export type BlueScale = typeof blueScale
export type ColorScales = typeof colorScales
export type SemanticColors = typeof semanticColors
export type BackgroundColors = typeof backgroundColors
export type BorderColors = typeof borderColors
export type TextColors = typeof textColors
export type InteractiveColors = typeof interactiveColors

// Color scale keys
export type GreyScaleKey = keyof GreyScale
export type BlueScaleKey = keyof BlueScale

// ============================================================================
// Exports
// ============================================================================

export default {
  colorScales,
  semanticColors,
  hexToOKLCH,
  getLightBackground,
  getContrastText,
  generateColorScale,
  isValidOKLCH,
}
