export const TAG_COLORS = [
  { name: 'Gray', value: '#9ca3af' },
  { name: 'Red', value: '#fca5a5' },
  { name: 'Orange', value: '#fdba74' },
  { name: 'Amber', value: '#fcd34d' },
  { name: 'Yellow', value: '#fde047' },
  { name: 'Lime', value: '#bef264' },
  { name: 'Green', value: '#86efac' },
  { name: 'Emerald', value: '#6ee7b7' },
  { name: 'Teal', value: '#5eead4' },
  { name: 'Cyan', value: '#67e8f9' },
  { name: 'Sky', value: '#7dd3fc' },
  { name: 'Blue', value: '#93c5fd' },
  { name: 'Indigo', value: '#a5b4fc' },
  { name: 'Violet', value: '#c4b5fd' },
  { name: 'Purple', value: '#d8b4fe' },
  { name: 'Fuchsia', value: '#f0abfc' },
  { name: 'Pink', value: '#f9a8d4' },
  { name: 'Rose', value: '#fda4af' },
] as const

export type TagColor = typeof TAG_COLORS[number]['value']
