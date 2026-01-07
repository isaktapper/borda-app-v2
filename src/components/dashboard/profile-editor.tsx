'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, X, User } from 'lucide-react'
import { updateProfileName, uploadAvatar, removeAvatar } from '@/app/(app)/settings/profile/actions'
import { getAvatarSignedUrl } from '@/app/(app)/settings/profile/avatar-actions'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileEditorProps {
    userId: string
    email: string
    initialFullName: string
    initialAvatarUrl: string | null
}

export function ProfileEditor({
    userId,
    email,
    initialFullName,
    initialAvatarUrl
}: ProfileEditorProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [fullName, setFullName] = useState(initialFullName)
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Mark as mounted (fix hydration)
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFullName(e.target.value)
        setHasChanges(true)
    }

    const handleSave = async () => {
        if (!fullName || fullName.trim().length === 0) {
            setError('Name is required')
            return
        }

        setSaving(true)
        setError(null)

        const result = await updateProfileName(fullName)

        if (result.error) {
            console.error('[ProfileEditor] Save error:', result.error)
            setError(result.error)
        } else {
            setHasChanges(false)
            router.refresh()
        }

        setSaving(false)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadAvatar(formData)

        if (result.error) {
            console.error('[ProfileEditor] Upload error:', result.error)
            setError(result.error)
        } else if (result.avatarPath) {
            // Generate signed URL for immediate preview
            const signedUrl = await getAvatarSignedUrl(result.avatarPath)
            setAvatarUrl(signedUrl)
            router.refresh()
        }

        setUploading(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemoveAvatar = async () => {
        setError(null)
        const result = await removeAvatar()

        if (result.error) {
            setError(result.error)
        } else {
            setAvatarUrl(null)
            router.refresh()
        }
    }

    const getInitials = () => {
        if (!fullName) return email.charAt(0).toUpperCase()
        return fullName.charAt(0).toUpperCase()
    }

    return (
        <Card className="p-6">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold mb-1">Profil Information</h3>
                        <p className="text-sm text-muted-foreground">
                            Uppdatera ditt namn och profilbild
                        </p>
                    </div>
                    {hasChanges && (
                        <Button onClick={handleSave} disabled={saving} size="sm">
                            {saving ? 'Saving...' : 'Spara'}
                        </Button>
                    )}
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                    <Label className="text-xs">E-post</Label>
                    <Input
                        value={email}
                        disabled
                        className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                        Email address cannot be changed
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Avatar Upload */}
                    <div className="space-y-2">
                        <Label className="text-xs">Profilbild</Label>
                        {isMounted && (
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                            {getInitials()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {avatarUrl && (
                                        <button
                                            onClick={handleRemoveAvatar}
                                            className="absolute -top-2 -right-2 size-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>
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
                                    {uploading ? 'Laddar...' : avatarUrl ? 'Byt' : 'Ladda upp'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label className="text-xs">Full name</Label>
                        <Input
                            value={fullName}
                            onChange={handleNameChange}
                            placeholder="Ditt namn"
                            className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Detta namn visas i dashboarden
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-destructive">{error}</p>
                )}
            </div>
        </Card>
    )
}
