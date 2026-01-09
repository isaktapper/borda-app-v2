'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Upload, X, RotateCcw } from 'lucide-react'
import { uploadProjectLogo, removeProjectLogo, updateProjectBrandColor, updateProjectBackgroundGradient } from '@/app/(app)/spaces/[spaceId]/branding-actions'
import { uploadClientLogo, removeClientLogo, getClientLogoUrl } from '@/app/(app)/spaces/[spaceId]/client-logo-actions'
import { getSignedLogoUrl, isValidHexColor, normalizeHexColor, PRESET_GRADIENTS } from '@/lib/branding'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpaceBrandingSectionProps {
  spaceId: string
  organizationId: string
  projectName: string
  initialLogoPath: string | null
  initialBrandColor: string | null
  initialClientLogoUrl: string | null
  organizationLogoPath: string | null
  organizationBrandColor: string
  initialBackgroundGradient: string | null
  organizationBackgroundGradient: string | null
}

export function SpaceBrandingSection({
  spaceId,
  organizationId,
  projectName,
  initialLogoPath,
  initialBrandColor,
  initialClientLogoUrl,
  organizationLogoPath,
  organizationBrandColor,
  initialBackgroundGradient,
  organizationBackgroundGradient
}: SpaceBrandingSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clientLogoInputRef = useRef<HTMLInputElement>(null)

  const [logoPath, setLogoPath] = useState(initialLogoPath)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [clientLogoUrl, setClientLogoUrl] = useState(initialClientLogoUrl)
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState(initialBrandColor)
  const [colorInput, setColorInput] = useState(initialBrandColor || organizationBrandColor)
  const [uploading, setUploading] = useState(false)
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [backgroundGradient, setBackgroundGradient] = useState(initialBackgroundGradient)

  // Load logo URLs on mount and when paths change
  useEffect(() => {
    const loadLogos = async () => {
      const pathToLoad = initialLogoPath || organizationLogoPath
      if (pathToLoad) {
        const url = await getSignedLogoUrl(pathToLoad)
        setLogoUrl(url)
      } else {
        setLogoUrl(null)
      }

      if (initialClientLogoUrl) {
        const clientUrl = await getClientLogoUrl(initialClientLogoUrl)
        setClientLogoPreview(clientUrl)
      }
    }
    loadLogos()
  }, [initialLogoPath, organizationLogoPath, initialClientLogoUrl])

  const isUsingOrgLogo = !logoPath && organizationLogoPath
  const isUsingOrgColor = !brandColor
  const currentColor = brandColor || organizationBrandColor
  const isUsingOrgGradient = !backgroundGradient
  const currentGradient = backgroundGradient || organizationBackgroundGradient

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadProjectLogo(spaceId, organizationId, formData)

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
    const result = await removeProjectLogo(spaceId)

    if (result.error) {
      setError(result.error)
    } else {
      setLogoPath(null)
      // Load organization logo if available
      if (organizationLogoPath) {
        const url = await getSignedLogoUrl(organizationLogoPath)
        setLogoUrl(url)
      } else {
        setLogoUrl(null)
      }
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
    if (colorInput && !isValidHexColor(colorInput)) {
      setError('Invalid color code')
      return
    }

    setSaving(true)
    setError(null)

    const colorToSave = colorInput ? normalizeHexColor(colorInput) : null
    const result = await updateProjectBrandColor(spaceId, colorToSave)

    if (result.error) {
      setError(result.error)
    } else {
      setBrandColor(colorToSave)
      setHasChanges(false)
      router.refresh()
    }

    setSaving(false)
  }

  const handleResetColor = async () => {
    setBrandColor(null)
    setColorInput(organizationBrandColor)
    setError(null)

    const result = await updateProjectBrandColor(spaceId, null)

    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const handleClientLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingClientLogo(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadClientLogo(spaceId, organizationId, formData)

    if (result.error) {
      setError(result.error)
    } else if (result.logoPath) {
      setClientLogoUrl(result.logoPath)
      const url = await getClientLogoUrl(result.logoPath)
      setClientLogoPreview(url)
      router.refresh()
    }

    setUploadingClientLogo(false)
    if (clientLogoInputRef.current) {
      clientLogoInputRef.current.value = ''
    }
  }

  const handleRemoveClientLogo = async () => {
    setError(null)
    const result = await removeClientLogo(spaceId)

    if (result.error) {
      setError(result.error)
    } else {
      setClientLogoUrl(null)
      setClientLogoPreview(null)
      router.refresh()
    }
  }

  const handleGradientSelect = async (gradientValue: string) => {
    setError(null)
    setBackgroundGradient(gradientValue)

    const result = await updateProjectBackgroundGradient(spaceId, gradientValue)

    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const handleResetGradient = async () => {
    setError(null)
    setBackgroundGradient(null)

    const result = await updateProjectBackgroundGradient(spaceId, null)

    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Projekt Branding</h3>
            <p className="text-sm text-muted-foreground">
              Customize for this project (empty = use organization's)
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Spara'}
            </Button>
          )}
        </div>

        {/* Customer Logo */}
        <div className="space-y-2 pb-4 border-b">
          <Label className="text-xs font-semibold">Customer Logo</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Upload your customer's logo to display in the portal
          </p>
          {clientLogoPreview ? (
            <div className="relative w-full h-20 rounded border bg-muted/50 flex items-center justify-center p-2">
              <img src={clientLogoPreview} alt="Customer logo" className="max-w-full max-h-full object-contain" />
              <button
                onClick={handleRemoveClientLogo}
                className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="w-full h-20 rounded border-2 border-dashed bg-muted/20 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No customer logo uploaded</p>
            </div>
          )}
          <input
            ref={clientLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleClientLogoSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => clientLogoInputRef.current?.click()}
            disabled={uploadingClientLogo}
            className="w-full"
          >
            <Upload className="size-3 mr-2" />
            {uploadingClientLogo ? 'Uploading...' : clientLogoUrl ? 'Replace' : 'Upload Customer Logo'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs">
              Logotyp {isUsingOrgLogo && <span className="text-muted-foreground">(org)</span>}
            </Label>
            {logoUrl && (
              <div className="relative w-full h-20 rounded border bg-muted/50 flex items-center justify-center p-2">
                <img src={logoUrl} alt={projectName} className="max-w-full max-h-full object-contain" />
                {logoPath && (
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                  >
                    <X className="size-3" />
                  </button>
                )}
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
              {uploading ? 'Laddar...' : logoPath ? 'Byt' : 'Ladda upp'}
            </Button>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-xs">
              Primary color {isUsingOrgColor && <span className="text-muted-foreground">(org)</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                value={colorInput}
                onChange={handleColorInputChange}
                placeholder={organizationBrandColor}
                className="font-mono text-sm"
              />
              <input
                type="color"
                value={currentColor}
                onChange={handleNativeColorChange}
                className="size-9 rounded border cursor-pointer"
              />
            </div>
            {/* Reset Button */}
            {!isUsingOrgColor && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleResetColor}>
                  <RotateCcw className="size-3 mr-1" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Gradient Picker */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              Portal Bakgrund {isUsingOrgGradient && <span className="text-muted-foreground">(org)</span>}
            </Label>
            {!isUsingOrgGradient && (
              <Button variant="ghost" size="sm" onClick={handleResetGradient} className="h-7 text-xs">
                <RotateCcw className="size-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_GRADIENTS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleGradientSelect(preset.value)}
                className={cn(
                  "relative h-16 rounded-lg border-2 transition-all overflow-hidden group",
                  currentGradient === preset.value
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
                title={preset.description}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: preset.css }}
                />
                {currentGradient === preset.value && (
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

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </Card>
  )
}
