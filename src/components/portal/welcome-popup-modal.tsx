'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

interface WelcomePopupContent {
    enabled: boolean
    title: string
    description: string
    imageUrl?: string | null
    videoUrl?: string | null
    ctaText?: string | null
    ctaAction?: 'dismiss' | 'go_to_page' | 'link'
    ctaPageId?: string | null
    ctaLink?: string | null
}

interface WelcomePopupModalProps {
    spaceId: string
    content: WelcomePopupContent
    pages: { id: string; slug: string }[]
    onDismiss: () => Promise<void>
}

const DISMISSED_KEY_PREFIX = 'welcome_popup_dismissed_'

export function WelcomePopupModal({
    spaceId,
    content,
    pages,
    onDismiss,
}: WelcomePopupModalProps) {
    const [open, setOpen] = useState(false) // Start closed, check localStorage first
    const [isDismissing, setIsDismissing] = useState(false)

    // Check localStorage on mount to see if already dismissed
    useEffect(() => {
        const dismissedKey = `${DISMISSED_KEY_PREFIX}${spaceId}`
        const isDismissed = localStorage.getItem(dismissedKey) === 'true'
        if (!isDismissed) {
            setOpen(true)
        }
    }, [spaceId])

    const handleDismiss = async () => {
        setIsDismissing(true)
        try {
            // Save to localStorage first (works for all users including anonymous)
            const dismissedKey = `${DISMISSED_KEY_PREFIX}${spaceId}`
            localStorage.setItem(dismissedKey, 'true')
            // Also try server-side dismiss (for logged-in users with space_member records)
            await onDismiss().catch(() => {
                // Ignore server errors - localStorage already persisted
            })
            setOpen(false)
        } catch (error) {
            console.error('Failed to dismiss welcome popup:', error)
            setIsDismissing(false)
        }
    }

    const handleCtaClick = async () => {
        if (content.ctaAction === 'dismiss') {
            await handleDismiss()
        } else if (content.ctaAction === 'go_to_page' && content.ctaPageId) {
            const page = pages.find(p => p.id === content.ctaPageId)
            if (page) {
                await handleDismiss()
                window.location.href = `/space/${spaceId}/shared/${page.slug}`
            }
        } else if (content.ctaAction === 'link' && content.ctaLink) {
            await handleDismiss()
            window.open(content.ctaLink, '_blank')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => {
            if (!value) handleDismiss()
        }}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
                {/* Image */}
                {content.imageUrl && (
                    <div className="relative h-48 sm:h-64 w-full">
                        <img
                            src={content.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="p-6 pt-4">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-xl font-semibold">
                            {content.title || 'Welcome!'}
                        </DialogTitle>
                        {content.description && (
                            <DialogDescription className="mt-2 text-base text-muted-foreground whitespace-pre-wrap">
                                {content.description}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {/* CTA Button */}
                    <div className="mt-6 flex gap-3">
                        {content.ctaText ? (
                            <>
                                <Button
                                    onClick={handleCtaClick}
                                    className="flex-1"
                                    disabled={isDismissing}
                                >
                                    {content.ctaText}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleDismiss}
                                    disabled={isDismissing}
                                >
                                    {isDismissing ? 'Closing...' : 'Close'}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleDismiss}
                                className="w-full"
                                disabled={isDismissing}
                            >
                                {isDismissing ? 'Getting started...' : "Let's get started"}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
