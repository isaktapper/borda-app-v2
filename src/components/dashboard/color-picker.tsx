'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESET_BRAND_COLORS, isValidHexColor, normalizeHexColor } from '@/lib/branding'

interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
    label?: string
    showCustomInput?: boolean
}

export function ColorPicker({
    value,
    onChange,
    label = 'Brand Color',
    showCustomInput = true
}: ColorPickerProps) {
    const [customColor, setCustomColor] = useState(value)
    const [customError, setCustomError] = useState<string | null>(null)

    const handlePresetClick = (color: string) => {
        onChange(color)
        setCustomColor(color)
        setCustomError(null)
    }

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value
        setCustomColor(input)
        setCustomError(null)

        // Validate and update if valid
        if (isValidHexColor(input)) {
            onChange(normalizeHexColor(input))
        } else if (input.length >= 6) {
            setCustomError('Invalid color code. Use hex format (e.g. #6366f1)')
        }
    }

    return (
        <div className="space-y-4">
            {label && <Label>{label}</Label>}

            {/* Preset Colors Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PRESET_BRAND_COLORS.map((preset) => {
                    const isSelected = value.toLowerCase() === preset.value.toLowerCase()

                    return (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => handlePresetClick(preset.value)}
                            className={cn(
                                "group relative aspect-square rounded-xl border-2 transition-all overflow-hidden",
                                isSelected
                                    ? "border-foreground ring-2 ring-ring ring-offset-2 scale-105"
                                    : "border-transparent hover:border-muted-foreground/30 hover:scale-105"
                            )}
                            title={`${preset.name} (${preset.value})`}
                        >
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: preset.value }}
                            />
                            {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="p-1 rounded-full bg-white">
                                        <Check className="size-4 text-black" strokeWidth={3} />
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[8px] text-white font-bold uppercase tracking-wider text-center truncate">
                                    {preset.name}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Custom Color Input */}
            {showCustomInput && (
                <div className="space-y-2">
                    <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                        Or enter custom color
                    </Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                id="custom-color"
                                value={customColor}
                                onChange={handleCustomColorChange}
                                placeholder="#6366f1"
                                className={cn(
                                    "font-mono pl-12",
                                    customError && "border-destructive"
                                )}
                            />
                            <div
                                className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-md border-2 border-muted"
                                style={{
                                    backgroundColor: isValidHexColor(customColor)
                                        ? normalizeHexColor(customColor)
                                        : '#ffffff'
                                }}
                            />
                        </div>
                        <input
                            type="color"
                            value={isValidHexColor(customColor) ? normalizeHexColor(customColor) : '#ffffff'}
                            onChange={(e) => {
                                setCustomColor(e.target.value)
                                onChange(e.target.value)
                                setCustomError(null)
                            }}
                            className="size-9 rounded-md border-2 border-input cursor-pointer"
                            title="Select color"
                        />
                    </div>
                    {customError && (
                        <p className="text-xs text-destructive">{customError}</p>
                    )}
                </div>
            )}

            {/* Preview */}
            <div className="pt-2 border-t">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">
                    Preview
                </Label>
                <div className="flex gap-2">
                    <Button style={{ backgroundColor: value, borderColor: value }}>
                        Exempelknapp
                    </Button>
                    <Button variant="outline" style={{ color: value, borderColor: value }}>
                        Secondary
                    </Button>
                    <div className="flex-1 h-9 rounded-md border-2" style={{ borderColor: value, backgroundColor: `${value}10` }}>
                        <div className="h-full w-1/2 rounded-l-sm" style={{ backgroundColor: value }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
