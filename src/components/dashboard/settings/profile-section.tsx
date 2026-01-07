'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { sanitizeStoragePath, sanitizeFileExtension } from '@/lib/storage-security'

interface ProfileSectionProps {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState(user.full_name || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', user.id)

    if (!error) {
      router.refresh()
    }
    setIsUpdating(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUpdating(true)

    // Upload to storage with sanitized path
    const fileExt = sanitizeFileExtension(file.name.split('.').pop() || 'png')
    const filePath = sanitizeStoragePath(`${user.id}/avatar.${fileExt}`)

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: filePath })
        .eq('id', user.id)

      if (!updateError) {
        // Get signed URL for preview
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(filePath, 60 * 60)

        if (data?.signedUrl) {
          setAvatarUrl(data.signedUrl)
        }
        router.refresh()
      }
    }

    setIsUpdating(false)
  }

  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal profile information
        </p>
      </div>

      {/* Settings List */}
      <div className="divide-y">
        {/* Avatar Section */}
        <div className="flex items-center justify-between py-4">
          <div className="flex-1">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={isUpdating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Upload className="size-4 mr-2" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="flex items-center justify-between py-4">
          <Label htmlFor="fullName" className="text-sm font-medium flex-shrink-0 w-40">
            Full Name
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="max-w-md"
          />
        </div>

        {/* Email (read-only) */}
        <div className="flex items-center justify-between py-4">
          <div className="flex-1">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>
          <div className="text-sm text-muted-foreground max-w-md">
            {user.email}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button
          onClick={handleUpdateProfile}
          disabled={isUpdating || fullName === user.full_name}
        >
          {isUpdating ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
  )
}
