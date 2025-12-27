'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createOrganization, joinOrganization } from './actions'
import { useState } from 'react'

export function JoinOrgForm({ orgId, orgName }: { orgId: string, orgName: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        const res = await joinOrganization(formData)
        if (res?.error) {
            setError(res.error)
        }
    }

    return (
        <form action={handleSubmit}>
            <input type="hidden" name="orgId" value={orgId} />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <Button type="submit" className="w-full">
                Join {orgName}
            </Button>
        </form>
    )
}

export function CreateOrgForm({ domain }: { domain: string | null }) {
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        const res = await createOrganization(formData)
        if (res?.error) {
            setError(res.error)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Organization</CardTitle>
                <CardDescription>
                    Create a new workspace for your team.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input id="name" name="name" required placeholder="Acme Corp" />
                    </div>
                    {domain && <input type="hidden" name="domain" value={domain} />}
                    {error && <div className="text-destructive text-sm">{error}</div>}
                    <Button type="submit" className="w-full">
                        Create Workspace
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
