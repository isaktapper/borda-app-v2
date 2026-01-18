'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrgName } from '@/app/(app)/settings/branding-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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

    const handleBlur = async () => {
        if (name === initialName || !canManage) return
        if (name.trim() === '') {
            setName(initialName)
            return
        }

        setIsLoading(true)

        const result = await updateOrgName(organizationId, name)

        if (result.error) {
            toast.error(result.error)
            setName(initialName)
        } else {
            toast.success('Organization name updated')
            router.refresh()
        }

        setIsLoading(false)
    }

    return (
        <div className="flex items-center justify-between py-3">
            <Label htmlFor="orgName" className="text-sm font-medium flex-shrink-0 w-40">
                Organization Name
            </Label>
            <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlur}
                placeholder="My Organization"
                disabled={!canManage || isLoading}
                maxLength={100}
                className="max-w-md"
            />
        </div>
    )
}
