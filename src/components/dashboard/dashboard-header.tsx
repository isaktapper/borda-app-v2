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

// Map route segments to display names
const segmentNames: Record<string, string> = {
    'spaces': 'Spaces',
    'templates': 'Templates',
    'settings': 'Settings',
    'profile': 'Profile',
    'team': 'Team',
    'organization': 'Organization',
    'tags': 'Tags',
}

export function DashboardHeader() {
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background">
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

            <Image
                src="/borda_logo.png"
                alt="Borda"
                width={100}
                height={30}
                className="h-8 w-auto"
                priority
            />
        </header>
    )
}
