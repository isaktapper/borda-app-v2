'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Upload, X, RotateCcw } from 'lucide-react'
import { uploadProjectLogo, removeProjectLogo, updateProjectBrandColor } from '@/app/dashboard/projects/[projectId]/branding-actions'
import { getSignedLogoUrl, isValidHexColor, normalizeHexColor } from '@/lib/branding'
import { useRouter } from 'next/navigation'

interface ProjectBrandingSectionProps {
  projectId: string
  organizationId: string
  projectName: string
  initialLogoPath: string | null
  initialBrandColor: string | null
  organizationLogoPath: string | null
  organizationBrandColor: string
}

export function ProjectBrandingSection({
  projectId,
  organizationId,
  projectName,
  initialLogoPath,
  initialBrandColor,
  organizationLogoPath,
  organizationBrandColor
}: ProjectBrandingSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoPath, setLogoPath] = useState(initialLogoPath)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState(initialBrandColor)
  const [colorInput, setColorInput] = useState(initialBrandColor || organizationBrandColor)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load logo URL on mount and when paths change
  useEffect(() => {
    const loadLogo = async () => {
      const pathToLoad = initialLogoPath || organizationLogoPath
      if (pathToLoad) {
        const url = await getSignedLogoUrl(pathToLoad)
        setLogoUrl(url)
      } else {
        setLogoUrl(null)
      }
    }
    loadLogo()
  }, [initialLogoPath, organizationLogoPath])

  const isUsingOrgLogo = !logoPath && organizationLogoPath
  const isUsingOrgColor = !brandColor
  const currentColor = brandColor || organizationBrandColor

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadProjectLogo(projectId, organizationId, formData)

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
    const result = await removeProjectLogo(projectId)

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
      setError('Ogiltig färgkod')
      return
    }

    setSaving(true)
    setError(null)

    const colorToSave = colorInput ? normalizeHexColor(colorInput) : null
    const result = await updateProjectBrandColor(projectId, colorToSave)

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

    const result = await updateProjectBrandColor(projectId, null)

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
              Anpassa för detta projekt (tomt = använd organisationens)
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Sparar...' : 'Spara'}
            </Button>
          )}
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
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
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
              Primärfärg {isUsingOrgColor && <span className="text-muted-foreground">(org)</span>}
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

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </Card>
  )
}
