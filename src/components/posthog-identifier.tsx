'use client'

import { useEffect, useRef } from 'react'
import { identify, setCompanyGroup, startSessionRecording } from '@/lib/posthog'
import type { UserTraits, CompanyProperties } from '@/lib/posthog'

interface PostHogIdentifierProps {
    userId: string
    userEmail: string
    userName?: string
    userRole?: 'owner' | 'admin' | 'member'
    createdAt?: string
    
    // Organization data
    organizationId?: string
    organizationName?: string
    plan?: 'trial' | 'growth' | 'scale'
    isTrialing?: boolean
    trialDaysRemaining?: number
    
    // Organization metadata
    industry?: string
    companySize?: string
}

/**
 * PostHog Identifier Component
 * 
 * This component identifies the user and their organization
 * when they are logged in. It should be included in the
 * authenticated app layout.
 * 
 * Features:
 * - Identifies user with traits
 * - Sets company group for B2B analytics
 * - Starts session recording for trial users
 */
export function PostHogIdentifier({
    userId,
    userEmail,
    userName,
    userRole,
    createdAt,
    organizationId,
    organizationName,
    plan,
    isTrialing,
    trialDaysRemaining,
    industry,
    companySize,
}: PostHogIdentifierProps) {
    const hasIdentified = useRef(false)

    useEffect(() => {
        // Only identify once per mount
        if (hasIdentified.current) return
        hasIdentified.current = true

        // Calculate days since signup
        let daysSinceSignup: number | undefined
        if (createdAt) {
            const signupDate = new Date(createdAt)
            const now = new Date()
            daysSinceSignup = Math.floor(
                (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
            )
        }

        // Build user traits
        const userTraits: UserTraits = {
            email: userEmail,
            name: userName,
            company: organizationName,
            company_id: organizationId,
            plan: plan,
            role: userRole,
            created_at: createdAt,
            days_since_signup: daysSinceSignup,
            is_trial: isTrialing,
            trial_days_remaining: trialDaysRemaining,
        }

        // Remove undefined values
        const cleanTraits = Object.fromEntries(
            Object.entries(userTraits).filter(([, v]) => v !== undefined)
        ) as UserTraits

        // Identify user
        identify(userId, cleanTraits)

        // Set company group for B2B analytics
        if (organizationId && organizationName) {
            const companyProperties: CompanyProperties = {
                name: organizationName,
                plan: plan || 'trial',
                employee_count: companySize,
                industry: industry,
                created_at: createdAt || new Date().toISOString(),
                is_trial: isTrialing,
            }

            // Remove undefined values
            const cleanCompanyProps = Object.fromEntries(
                Object.entries(companyProperties).filter(([, v]) => v !== undefined)
            ) as CompanyProperties

            setCompanyGroup(organizationId, cleanCompanyProps)
        }

        // Start session recording for trial users
        // This helps understand where trial users struggle
        if (isTrialing) {
            startSessionRecording()
        }
    }, [
        userId,
        userEmail,
        userName,
        userRole,
        createdAt,
        organizationId,
        organizationName,
        plan,
        isTrialing,
        trialDaysRemaining,
        industry,
        companySize,
    ])

    // This component doesn't render anything
    return null
}
