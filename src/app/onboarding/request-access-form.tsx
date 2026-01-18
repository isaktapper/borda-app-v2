'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Building2 } from 'lucide-react'
import Link from 'next/link'
import { requestAccessToOrganization } from './actions'

interface RequestAccessFormProps {
  orgId: string
  orgName: string
  userEmail: string
  userName: string | null
}

export function RequestAccessForm({ 
  orgId, 
  orgName, 
  userEmail,
  userName 
}: RequestAccessFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [name, setName] = useState(userName || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await requestAccessToOrganization({
        email: userEmail,
        name: name || null,
        organizationId: orgId
      })

      if (result.error) {
        setError(result.error)
      } else {
        setIsSubmitted(true)
      }
    })
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Request sent!</h3>
              <p className="text-sm text-muted-foreground">
                Your request to join <strong>{orgName}</strong> has been sent to the organization administrators.
              </p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll receive an email at <strong>{userEmail}</strong> once your request has been reviewed.
              </p>
            </div>
            <div className="pt-4">
              <Button variant="outline" asChild>
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Request access to {orgName}</CardTitle>
        <CardDescription>
          This organization requires approval to join. Submit a request and an administrator will review it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={userEmail} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your name (optional)</Label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              This helps administrators recognize you
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending request...
              </>
            ) : (
              'Request access'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <p className="text-center text-sm text-muted-foreground">
            Want to create a separate workspace instead?
          </p>
          <div className="mt-2 text-center">
            <Button variant="link" asChild className="h-auto p-0">
              <Link href="/onboarding?create=true">
                Create new workspace
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
