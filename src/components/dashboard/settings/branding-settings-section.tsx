'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadProjectLogo, removeProjectLogo } from '@/app/(app)/projects/[projectId]/branding-actions'
import { uploadClientLogo, removeClientLogo, getClientLogoUrl } from '@/app/(app)/projects/[projectId]/client-logo-actions'
import { updateProjectBrandColor, updateProjectBackgroundGradient } from '@/app/(app)/projects/[projectId]/branding-actions'
import { PRESET_GRADIENTS, getSignedLogoUrl } from '@/lib/branding'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BrandingSettingsSectionProps {
    projectId: string
    organizationId: string
    initialLogoPath: string | null
    initialClientLogoUrl: string | null
    initialBrandColor: string | null
    initialBackgroundGradient: string | null
    organizationLogoPath: string | null
    organizationBrandColor: string
    organizationBackgroundGradient: string | null
}

export function BrandingSettingsSection({
    projectId,
    organizationId,
    initialLogoPath,
    initialClientLogoUrl,
    initialBrandColor,
    initialBackgroundGradient,
    organizationLogoPath,
    organizationBrandColor,
    organizationBackgroundGradient
}: BrandingSettingsSectionProps) {
    const router = useRouter()
    const logoInputRef = useRef<HTMLInputElement>(null)
    const clientLogoInputRef = useRef<HTMLInputElement>(null)

    const [logoPath, setLogoPath] = useState(initialLogoPath)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [clientLogoUrl, setClientLogoUrl] = useState(initialClientLogoUrl)
    const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null)
    const [brandColor, setBrandColor] = useState(initialBrandColor || organizationBrandColor)
    const [backgroundGradient, setBackgroundGradient] = useState(initialBackgroundGradient)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingClientLogo, setUploadingClientLogo] = useState(false)

    // Load logos
    useEffect(() => {
        const loadLogos = async () => {
            // Load organization or project logo
            const pathToLoad = initialLogoPath || organizationLogoPath
            if (pathToLoad) {
                const url = await getSignedLogoUrl(pathToLoad)
                setLogoUrl(url)
            }

            // Load client logo
            if (initialClientLogoUrl) {
                const url = await getClientLogoUrl(initialClientLogoUrl)
                setClientLogoPreview(url)
            }
        }
        loadLogos()
    }, [initialLogoPath, organizationLogoPath, initialClientLogoUrl])

    const isUsingOrgLogo = !logoPath && organizationLogoPath
    const currentColor = brandColor || organizationBrandColor
    const currentGradient = backgroundGradient || organizationBackgroundGradient

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingLogo(true)
        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadProjectLogo(projectId, organizationId, formData)

        if (result.error) {
            toast.error(result.error)
        } else if (result.logoPath) {
            setLogoPath(result.logoPath)
            const url = await getSignedLogoUrl(result.logoPath)
            setLogoUrl(url)
            toast.success('Logo uploaded')
            router.refresh()
        }

        setUploadingLogo(false)
        if (logoInputRef.current) {
            logoInputRef.current.value = ''
        }
    }

    const handleRemoveLogo = async () => {
        const result = await removeProjectLogo(projectId)

        if (result.error) {
            toast.error(result.error)
        } else {
            setLogoPath(null)
            const orgUrl = organizationLogoPath ? await getSignedLogoUrl(organizationLogoPath) : null
            setLogoUrl(orgUrl)
            toast.success('Using organization logo')
            router.refresh()
        }
    }

    const handleClientLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingClientLogo(true)
        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadClientLogo(projectId, formData)

        if (result.error) {
            toast.error(result.error)
        } else if (result.logoPath) {
            setClientLogoUrl(result.logoPath)
            const url = await getClientLogoUrl(result.logoPath)
            setClientLogoPreview(url)
            toast.success('Logo uploaded')
            router.refresh()
        }

        setUploadingClientLogo(false)
        if (clientLogoInputRef.current) {
            clientLogoInputRef.current.value = ''
        }
    }

    const handleRemoveClientLogo = async () => {
        const result = await removeClientLogo(projectId)

        if (result.error) {
            toast.error(result.error)
        } else {
            setClientLogoUrl(null)
            setClientLogoPreview(null)
            toast.success('Logo removed')
            router.refresh()
        }
    }

    const handleColorChange = async (color: string) => {
        setBrandColor(color)
        const result = await updateProjectBrandColor(projectId, color)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Brand color updated')
            router.refresh()
        }
    }

    const handleGradientSelect = async (gradientValue: string) => {
        setBackgroundGradient(gradientValue)
        const result = await updateProjectBackgroundGradient(projectId, gradientValue)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Background gradient updated')
            router.refresh()
        }
    }

    const handleResetGradient = async () => {
        setBackgroundGradient(null)
        const result = await updateProjectBackgroundGradient(projectId, null)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Using organization gradient')
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            {/* Settings Table */}
            <div className="divide-y rounded-lg border">
                {/* Your Logo (Organization) */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label className="text-sm font-medium">
                        Your Logo
                    </Label>
                    <div className="flex justify-end">
                        <div className="flex items-center gap-4">
                            {logoUrl ? (
                                <div className="relative w-24 h-24 rounded border bg-muted/50 flex items-center justify-center p-2">
                                    <img
                                        src={logoUrl}
                                        alt="Organization logo"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    {!isUsingOrgLogo && (
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded border-2 border-dashed bg-muted/20 flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">No logo</span>
                                </div>
                            )}
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                onChange={handleLogoSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="gap-2"
                            >
                                {uploadingLogo ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Upload className="size-4" />
                                )}
                                Upload Logo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Customer Logo */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label className="text-sm font-medium">
                        Customer Logo
                    </Label>
                    <div className="flex justify-end">
                        <div className="flex items-center gap-4">
                            {clientLogoPreview ? (
                                <div className="relative w-24 h-24 rounded border bg-muted/50 flex items-center justify-center p-2">
                                    <img
                                        src={clientLogoPreview}
                                        alt="Customer logo"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    <button
                                        onClick={handleRemoveClientLogo}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded border-2 border-dashed bg-muted/20 flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">No logo</span>
                                </div>
                            )}
                            <input
                                ref={clientLogoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                onChange={handleClientLogoSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clientLogoInputRef.current?.click()}
                                disabled={uploadingClientLogo}
                                className="gap-2"
                            >
                                {uploadingClientLogo ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Upload className="size-4" />
                                )}
                                Upload Logo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Brand Color */}
                <div className="grid grid-cols-[300px_1fr] p-4 items-center">
                    <Label htmlFor="brand-color" className="text-sm font-medium">
                        Brand Color
                    </Label>
                    <div className="flex justify-end">
                        <div className="flex items-center gap-3 w-96">
                            <Input
                                id="brand-color"
                                type="color"
                                value={currentColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="w-20 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={currentColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="font-mono text-sm flex-1"
                                placeholder="#000000"
                            />
                        </div>
                    </div>
                </div>

                {/* Background Gradient */}
                <div className="grid grid-cols-[300px_1fr] p-4">
                    <Label className="text-sm font-medium pt-2">
                        Background Gradient
                    </Label>
                    <div className="flex justify-end">
                        <div className="space-y-3 w-96">
                            <div className="grid grid-cols-3 gap-2">
                                {PRESET_GRADIENTS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => handleGradientSelect(preset.value)}
                                        className={cn(
                                            "h-16 rounded-lg border-2 transition-all",
                                            currentGradient === preset.value
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-muted-foreground/20"
                                        )}
                                        style={{
                                            background: preset.css
                                        }}
                                        title={preset.name}
                                    />
                                ))}
                            </div>
                            {backgroundGradient && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetGradient}
                                    className="gap-2"
                                >
                                    <X className="size-4" />
                                    Reset to organization gradient
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
