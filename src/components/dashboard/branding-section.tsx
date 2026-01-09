'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, X } from 'lucide-react'
import { uploadOrgLogo, removeOrgLogo, updateOrgBrandColor } from '@/app/(app)/settings/branding-actions'
import { getSignedLogoUrl, isValidHexColor, normalizeHexColor } from '@/lib/branding'
import { useRouter } from 'next/navigation'

interface BrandingSectionProps {
  organizationId: string
  organizationName: string
  initialLogoPath: string | null
  initialBrandColor: string
  canManage: boolean
}

export function BrandingSection({
  organizationId,
  organizationName,
  initialLogoPath,
  initialBrandColor,
  canManage
}: BrandingSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoPath, setLogoPath] = useState(initialLogoPath)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState(initialBrandColor)
  const [colorInput, setColorInput] = useState(initialBrandColor)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Mark as mounted (fix hydration)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load logo URL on mount and when initialLogoPath changes
  useEffect(() => {
    if (!isMounted) return

    const loadLogo = async () => {
      if (initialLogoPath) {
        const url = await getSignedLogoUrl(initialLogoPath)
        setLogoUrl(url)
      } else {
        setLogoUrl(null)
      }
    }
    loadLogo()
  }, [initialLogoPath, isMounted])

  // Sync state with props
  useEffect(() => {
    setBrandColor(initialBrandColor)
    setColorInput(initialBrandColor)
  }, [initialBrandColor])

  useEffect(() => {
    setLogoPath(initialLogoPath)
  }, [initialLogoPath])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadOrgLogo(organizationId, formData)

    if (result.error) {
      setError(result.error)
    } else if (result.logoPath) {
      setLogoPath(result.logoPath)
      const url = await getSignedLogoUrl(result.logoPath)
      setLogoUrl(url)
      setHasChanges(false)
      router.refresh()
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    setError(null)
    const result = await removeOrgLogo(organizationId)

    if (result.error) {
      setError(result.error)
    } else {
      setLogoPath(null)
      setLogoUrl(null)
      setHasChanges(false)
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
      setError('Invalid color code')
      return
    }

    setSaving(true)
    setError(null)

    const normalized = normalizeHexColor(colorInput)

    const result = await updateOrgBrandColor(organizationId, normalized)

    if (result.error) {
      setError(result.error)
    } else {
      setBrandColor(normalized)
      setHasChanges(false)
      router.refresh()
    }

    setSaving(false)
  }

  if (!canManage) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-4">
          {isMounted && logoUrl && (
            <div className="w-24 h-16 rounded border flex items-center justify-center bg-muted/50">
              <img src={logoUrl} alt={organizationName} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="size-8 rounded border" style={{ backgroundColor: brandColor }} />
            <span className="text-sm font-mono">{brandColor}</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Branding</h3>
            <p className="text-sm text-muted-foreground">
              Logo and color shown in the customer portal
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Spara'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Logotyp</Label>
            {isMounted && logoUrl && (
              <div className="relative w-full h-20 rounded border bg-muted/50 flex items-center justify-center p-2">
                <img src={logoUrl} alt={organizationName} className="max-w-full max-h-full object-contain" />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
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
              className="w-full"
            >
              <Upload className="size-3 mr-2" />
              {uploading ? 'Laddar...' : logoUrl ? 'Byt' : 'Ladda upp'}
            </Button>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-xs">Primary color</Label>
            <div className="flex gap-2">
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
                className="size-9 rounded border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </Card>
  )
}
