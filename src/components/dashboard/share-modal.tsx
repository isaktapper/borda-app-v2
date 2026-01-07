'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Copy,
    Check,
    Link2,
    Globe,
    Lock,
    Mail,
    X,
    Loader2,
    Plus,
    Eye,
    EyeOff,
    Sparkles,
    Users
} from 'lucide-react'
import {
    getShareSettings,
    updateShareSettings,
    addApprovedEmail,
    removeApprovedEmail,
    updateProjectStatus,
    type ShareSettings
} from '@/app/(app)/projects/[projectId]/share-actions'
import { toast } from 'sonner'

interface ShareModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    onStatusChange?: (status: string) => void
}

export function ShareModal({ open, onOpenChange, projectId, onStatusChange }: ShareModalProps) {
    const [settings, setSettings] = useState<ShareSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [addingEmail, setAddingEmail] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [activating, setActivating] = useState(false)

    const portalUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/portal/${projectId}`
        : `/portal/${projectId}`

    useEffect(() => {
        if (open) {
            loadSettings()
        }
    }, [open, projectId])

    const loadSettings = async () => {
        setLoading(true)
        const result = await getShareSettings(projectId)
        if (result.success) {
            setSettings(result.data)
            setPassword('')
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(portalUrl)
        setCopied(true)
        toast.success('Link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleAccessModeChange = async (mode: 'public' | 'restricted') => {
        if (!settings) return
        setSaving(true)
        const result = await updateShareSettings(projectId, { accessMode: mode })
        if (result.success) {
            setSettings({ ...settings, accessMode: mode })
        } else {
            toast.error(result.error)
        }
        setSaving(false)
    }

    const handlePasswordToggle = async (enabled: boolean) => {
        if (!settings) return
        setSaving(true)

        if (enabled) {
            // Password will be set when user enters one
            setSettings({ ...settings, hasPassword: true })
            setSaving(false)
        } else {
            // Remove password
            const result = await updateShareSettings(projectId, { password: null })
            if (result.success) {
                setSettings({ ...settings, hasPassword: false })
                setPassword('')
            } else {
                toast.error(result.error)
            }
            setSaving(false)
        }
    }

    const handlePasswordSave = async () => {
        if (!password.trim()) return
        setSaving(true)
        const result = await updateShareSettings(projectId, { password })
        if (result.success) {
            toast.success('Password saved successfully')
            setPassword('')
            if (settings) {
                setSettings({ ...settings, hasPassword: true })
            }
        } else {
            toast.error(result.error || 'Failed to save password')
        }
        setSaving(false)
    }

    const handleAnalyticsToggle = async (enabled: boolean) => {
        if (!settings) return
        setSaving(true)
        const result = await updateShareSettings(projectId, { requireEmailForAnalytics: enabled })
        if (result.success) {
            setSettings({ ...settings, requireEmailForAnalytics: enabled })
        } else {
            toast.error(result.error)
        }
        setSaving(false)
    }

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail.trim() || !settings) return

        setAddingEmail(true)
        const result = await addApprovedEmail(projectId, newEmail.trim())
        if (result.success) {
            setSettings({
                ...settings,
                approvedEmails: [
                    { id: result.id, email: newEmail.trim().toLowerCase(), invitedAt: new Date().toISOString(), joinedAt: null },
                    ...settings.approvedEmails
                ]
            })
            setNewEmail('')
            toast.success('Email added')
        } else {
            toast.error(result.error)
        }
        setAddingEmail(false)
    }

    const handleRemoveEmail = async (memberId: string) => {
        if (!settings) return
        const result = await removeApprovedEmail(projectId, memberId)
        if (result.success) {
            setSettings({
                ...settings,
                approvedEmails: settings.approvedEmails.filter(e => e.id !== memberId)
            })
            toast.success('Email removed')
        } else {
            toast.error(result.error)
        }
    }

    const handleActivateProject = async () => {
        setActivating(true)
        const result = await updateProjectStatus(projectId, 'active')
        if (result.success) {
            if (settings) {
                setSettings({ ...settings, projectStatus: 'active' })
            }
            onStatusChange?.('active')
            toast.success('Project activated')
        } else {
            toast.error(result.error)
        }
        setActivating(false)
    }

    const isDraft = settings?.projectStatus === 'draft'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="size-5" />
                        Share Portal
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="relative">
                        {/* Draft Overlay */}
                        {isDraft && (
                            <div className="absolute -inset-6 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                                <div className="text-center space-y-4 p-6">
                                    <div className="size-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                                        <Sparkles className="size-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">Project is in draft mode</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs">
                                            Activate the project to share it with customers.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleActivateProject}
                                        disabled={activating}
                                        className="gap-2"
                                    >
                                        {activating ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : null}
                                        Activate Project
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Portal Link */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Portal Link
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={portalUrl}
                                        readOnly
                                        className="font-mono text-sm bg-muted"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCopyLink}
                                        className="shrink-0"
                                    >
                                        {copied ? (
                                            <Check className="size-4 text-green-500" />
                                        ) : (
                                            <Copy className="size-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Access Mode */}
                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Who can access?
                                </Label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleAccessModeChange('public')}
                                        disabled={saving}
                                        className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                                            settings?.accessMode === 'public'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-muted-foreground/30'
                                        }`}
                                    >
                                        <div className={`size-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                            settings?.accessMode === 'public' ? 'border-primary' : 'border-muted-foreground/30'
                                        }`}>
                                            {settings?.accessMode === 'public' && (
                                                <div className="size-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Globe className="size-4 text-muted-foreground" />
                                                <span className="font-medium">Anyone with the link</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Anyone who has this link can view the portal
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleAccessModeChange('restricted')}
                                        disabled={saving}
                                        className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                                            settings?.accessMode === 'restricted'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-muted-foreground/30'
                                        }`}
                                    >
                                        <div className={`size-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                            settings?.accessMode === 'restricted' ? 'border-primary' : 'border-muted-foreground/30'
                                        }`}>
                                            {settings?.accessMode === 'restricted' && (
                                                <div className="size-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Users className="size-4 text-muted-foreground" />
                                                <span className="font-medium">Only approved emails</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Only customers you&apos;ve added can access
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Password Protection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock className="size-4 text-muted-foreground" />
                                        <Label htmlFor="password-toggle" className="text-sm font-medium cursor-pointer">
                                            Password protection
                                        </Label>
                                        {settings?.hasPassword && (
                                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <Switch
                                        id="password-toggle"
                                        checked={settings?.hasPassword || false}
                                        onCheckedChange={handlePasswordToggle}
                                        disabled={saving}
                                    />
                                </div>
                                {settings?.hasPassword && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {password ? 'Enter a new password:' : 'Password is set. Enter a new one to change it:'}
                                        </p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Enter new password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                </button>
                                            </div>
                                            <Button
                                                onClick={handlePasswordSave}
                                                disabled={!password.trim() || saving}
                                                size="sm"
                                            >
                                                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Email for Analytics (Public mode only) */}
                            {settings?.accessMode === 'public' && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Mail className="size-4 text-muted-foreground" />
                                        <Label htmlFor="analytics-toggle" className="text-sm font-medium cursor-pointer">
                                            Collect email for analytics
                                        </Label>
                                    </div>
                                    <Switch
                                        id="analytics-toggle"
                                        checked={settings.requireEmailForAnalytics}
                                        onCheckedChange={handleAnalyticsToggle}
                                        disabled={saving}
                                    />
                                </div>
                            )}

                            {/* Approved Emails (Restricted mode only) */}
                            {settings?.accessMode === 'restricted' && (
                                <div className="space-y-3">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Approved Emails
                                    </Label>

                                    {/* Add email form */}
                                    <form onSubmit={handleAddEmail} className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="customer@company.com"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!newEmail.trim() || addingEmail}
                                        >
                                            {addingEmail ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Plus className="size-4" />
                                            )}
                                        </Button>
                                    </form>

                                    {/* Email list */}
                                    {settings.approvedEmails.length > 0 ? (
                                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                            {settings.approvedEmails.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between px-3 py-2 text-sm"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Mail className="size-4 text-muted-foreground shrink-0" />
                                                        <span className="truncate">{item.email}</span>
                                                        {item.joinedAt && (
                                                            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                                                Joined
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveEmail(item.id)}
                                                        className="text-muted-foreground hover:text-destructive p-1"
                                                    >
                                                        <X className="size-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                                            No approved emails yet. Add emails above.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

