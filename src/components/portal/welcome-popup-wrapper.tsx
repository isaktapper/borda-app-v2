'use client'

import { WelcomePopupModal } from './welcome-popup-modal'
import { dismissWelcomePopup } from '@/app/space/welcome-popup-actions'

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

interface WelcomePopupWrapperProps {
    spaceId: string
    content: WelcomePopupContent
    pages: { id: string; slug: string }[]
}

export function WelcomePopupWrapper({
    spaceId,
    content,
    pages,
}: WelcomePopupWrapperProps) {
    const handleDismiss = async () => {
        await dismissWelcomePopup(spaceId)
    }

    return (
        <WelcomePopupModal
            spaceId={spaceId}
            content={content}
            pages={pages}
            onDismiss={handleDismiss}
        />
    )
}
