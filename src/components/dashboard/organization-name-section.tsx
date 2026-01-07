'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrgName } from '@/app/(app)/settings/branding-actions'
import { useRouter } from 'next/navigation'

interface OrganizationNameSectionProps {
    organizationId: string
    initialName: string
    canManage: boolean
}

export function OrganizationNameSection({
    organizationId,
    initialName,
    canManage
}: OrganizationNameSectionProps) {
    const router = useRouter()
    const [name, setName] = useState(initialName)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleBlur = async () => {
        if (name === initialName || !canManage) return

        setIsLoading(true)
        setError(null)

        const result = await updateOrgName(organizationId, name)

        if (result.error) {
            setError(result.error)
            setName(initialName) // Revert on error
        } else {
            router.refresh()
        }

        setIsLoading(false)
    }

    return (
        <div className="flex items-center justify-between py-4">
            <Label htmlFor="orgName" className="text-sm font-medium flex-shrink-0 w-40">
                Organization Name
            </Label>
            <div className="flex-1 max-w-md">
                <Input
                    id="orgName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="My Organization"
                    disabled={!canManage || isLoading}
                    maxLength={100}
                />
                {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                )}
            </div>
        </div>
    )
}
