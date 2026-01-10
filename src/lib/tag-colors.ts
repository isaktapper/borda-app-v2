/**
 * Tag colors with both hex (for compatibility) and OKLCH (for modern usage)
 * OKLCH values provide better perceptual uniformity and consistency
 */
export const TAG_COLORS = [
  { name: 'Gray', value: '#6B7280', oklch: 'oklch(0.52 0.02 240)' },      // Neutral grey
  { name: 'Blue', value: '#2563EB', oklch: 'oklch(0.52 0.24 265)' },      // Primary blue
  { name: 'Green', value: '#059669', oklch: 'oklch(0.58 0.16 165)' },     // Success green
  { name: 'Yellow', value: '#D97706', oklch: 'oklch(0.68 0.18 70)' },     // Warning amber
  { name: 'Red', value: '#DC2626', oklch: 'oklch(0.58 0.24 25)' },        // Destructive red
  { name: 'Purple', value: '#7C3AED', oklch: 'oklch(0.52 0.26 290)' },    // Violet purple
  { name: 'Pink', value: '#DB2777', oklch: 'oklch(0.58 0.26 345)' },      // Hot pink
  { name: 'Indigo', value: '#4F46E5', oklch: 'oklch(0.50 0.24 275)' },    // Indigo blue
  { name: 'Teal', value: '#0D9488', oklch: 'oklch(0.58 0.14 190)' },      // Teal cyan
  { name: 'Orange', value: '#EA580C', oklch: 'oklch(0.64 0.22 50)' },     // Bright orange
] as const

export type TagColor = typeof TAG_COLORS[number]['value']
export type TagColorOKLCH = typeof TAG_COLORS[number]['oklch']
