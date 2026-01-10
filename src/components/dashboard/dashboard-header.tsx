"use client"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"

// Map route segments to display names
const segmentNames: Record<string, string> = {
    'spaces': 'Spaces',
    'templates': 'Templates',
    'settings': 'Settings',
    'profile': 'Profile',
    'team': 'Team',
    'organization': 'Organization',
    'tags': 'Tags',
    'billing': 'Billing',
    'activity': 'Activity',
    'tasks': 'Tasks',
    'integrations': 'Integrations',
}

interface DashboardHeaderProps {
    trialDaysRemaining?: number
    isTrialing?: boolean
}

export function DashboardHeader({ trialDaysRemaining = 0, isTrialing = false }: DashboardHeaderProps) {
    const pathname = usePathname()

    // Build breadcrumb segments from pathname
    const segments = pathname.split('/').filter(Boolean)

    // Build breadcrumb items
    const breadcrumbItems = segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1

        // Get display name (check if it's a UUID/ID or a known segment)
        const isId = segment.length > 20 || /^\d+$/.test(segment)
        const displayName = isId ? segment : (segmentNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1))

        return {
            path,
            label: displayName,
            isLast,
            isId
        }
    })

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background z-10">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbItems.map((item, index) => (
                            <div key={item.path} className="flex items-center gap-2">
                                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                                    {item.isLast ? (
                                        <BreadcrumbPage className={item.isId ? "font-mono text-xs" : ""}>
                                            {item.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href={item.path}>
                                            {item.label}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex items-center gap-4">
                {/* Trial Countdown */}
                {isTrialing && trialDaysRemaining > 0 && (
                    <Link 
                        href="/settings?tab=billing"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                            {trialDaysRemaining === 1 
                                ? '1 day left' 
                                : `${trialDaysRemaining} days left`
                            }
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                            · Upgrade
                        </span>
                    </Link>
                )}

                <Image
                    src="/borda_logo.png"
                    alt="Borda"
                    width={100}
                    height={30}
                    className="h-8 w-auto"
                    priority
                />
            </div>
        </header>
    )
}
