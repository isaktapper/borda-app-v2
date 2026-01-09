'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, X, Loader2, Check } from 'lucide-react'
import { uploadOrgLogo, removeOrgLogo, updateOrgBrandColor, updateOrgBackgroundGradient } from '@/app/(app)/settings/branding-actions'
import { getSignedLogoUrl, isValidHexColor, normalizeHexColor, PRESET_GRADIENTS } from '@/lib/branding'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface OrganizationBrandingFormProps {
  organizationId: string
  organizationName: string
  initialLogoPath: string | null
  initialLogoUrl: string | null
  initialBrandColor: string
  initialBackgroundGradient: string | null
  canManage: boolean
}

export function OrganizationBrandingForm({
  organizationId,
  organizationName,
  initialLogoPath,
  initialLogoUrl,
  initialBrandColor,
  initialBackgroundGradient,
  canManage
}: OrganizationBrandingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoPath, setLogoPath] = useState(initialLogoPath)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [brandColor, setBrandColor] = useState(initialBrandColor)
  const [colorInput, setColorInput] = useState(initialBrandColor)
  const [backgroundGradient, setBackgroundGradient] = useState(initialBackgroundGradient)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadOrgLogo(organizationId, formData)

    if (result.error) {
      alert(result.error)
    } else if (result.logoPath) {
      setLogoPath(result.logoPath)
      const url = await getSignedLogoUrl(result.logoPath)
      setLogoUrl(url)
      router.refresh()
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    const result = await removeOrgLogo(organizationId)

    if (result.error) {
      alert(result.error)
    } else {
      setLogoPath(null)
      setLogoUrl(null)
      router.refresh()
    }
  }

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setColorInput(value)
    setHasChanges(true)

    if (isValidHexColor(value)) {
      const normalized = normalizeHexColor(value)
      setBrandColor(normalized)
    }
  }

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setColorInput(color)
    setBrandColor(color)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!isValidHexColor(colorInput)) {
      alert('Invalid color code')
      return
    }

    setSaving(true)

    const normalized = normalizeHexColor(colorInput)
    const result = await updateOrgBrandColor(organizationId, normalized)

    if (result.error) {
      alert(result.error)
    } else {
      setBrandColor(normalized)
      setHasChanges(false)
      router.refresh()
    }

    setSaving(false)
  }

  const handleGradientSelect = async (gradientValue: string) => {
    setBackgroundGradient(gradientValue)

    const result = await updateOrgBackgroundGradient(organizationId, gradientValue)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  if (!canManage) {
    const currentGradientPreset = backgroundGradient
      ? PRESET_GRADIENTS.find(g => g.value === backgroundGradient)
      : null

    return (
      <div className="divide-y">
        {logoUrl && (
          <div className="flex items-center justify-between py-4">
            <Label className="text-sm font-medium">Logo</Label>
            <div className="w-24 h-16 rounded border bg-muted/50 flex items-center justify-center p-2">
              <img src={logoUrl} alt={organizationName} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between py-4">
          <Label className="text-sm font-medium">Primary Color</Label>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded border" style={{ backgroundColor: brandColor }} />
            <span className="text-sm font-mono">{brandColor}</span>
          </div>
        </div>
        {currentGradientPreset && (
          <div className="flex items-center justify-between py-4">
            <Label className="text-sm font-medium">Portal Bakgrund</Label>
            <div className="flex items-center gap-2">
              <div className="w-24 h-8 rounded border" style={{ background: currentGradientPreset.css }} />
              <span className="text-sm">{currentGradientPreset.name}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="divide-y">
        {/* Logo Upload */}
        <div className="flex items-center justify-between py-4">
          <div className="flex-1">
            <Label className="text-sm font-medium">Logo</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Logo shown in customer portals
            </p>
          </div>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <div className="relative w-24 h-16 rounded border bg-muted/50 flex items-center justify-center p-2">
                <img src={logoUrl} alt={organizationName} className="max-w-full max-h-full object-contain" />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Upload className="size-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : logoUrl ? 'Change' : 'Upload'}
            </Button>
          </div>
        </div>

        {/* Color Picker */}
        <div className="flex items-center justify-between py-4">
          <Label className="text-sm font-medium flex-shrink-0 w-40">
            Primary Color
          </Label>
          <div className="flex gap-2 max-w-md flex-1">
            <Input
              value={colorInput}
              onChange={handleColorInputChange}
              placeholder={initialBrandColor}
              className="font-mono text-sm"
            />
            <input
              type="color"
              value={brandColor}
              onChange={handleNativeColorChange}
              className="size-10 rounded border cursor-pointer"
            />
          </div>
        </div>

        {/* Gradient Picker */}
        <div className="flex items-start justify-between py-4">
          <div className="flex-shrink-0 w-40">
            <Label className="text-sm font-medium">Portal Bakgrund</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Bakgrundsfärg för customer portals
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-md flex-1">
            {PRESET_GRADIENTS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleGradientSelect(preset.value)}
                className={cn(
                  "relative h-16 rounded-lg border-2 transition-all overflow-hidden group",
                  backgroundGradient === preset.value
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
                title={preset.description}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: preset.css }}
                />
                {backgroundGradient === preset.value && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-4 text-white stroke-[3px]" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <p className="text-[10px] font-medium text-white text-center">{preset.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
