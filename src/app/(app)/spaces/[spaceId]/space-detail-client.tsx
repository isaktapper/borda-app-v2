'use client'

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { LayoutDashboard, MessageSquare, Settings, Users, ArrowLeft, Edit3, Sparkles } from "lucide-react"
import { PortalPreview } from "@/components/dashboard/portal-preview"
import { Button } from "@/components/ui/button"
import { SpaceTagsSection } from "@/components/dashboard/space-tags-section"
import { EngagementBadge } from "@/components/dashboard/engagement-badge"
import { SpaceStatusSelect } from "@/components/dashboard/space-status-select"
import { refreshEngagementScore } from "./engagement-actions"
import type { SpaceStatus } from "./status-actions"
import type { EngagementScoreResult } from "@/lib/engagement-score"

interface SpaceDetailClientProps {
    project: any
    spaceId: string
    engagement: any
    children: React.ReactNode
}

export function SpaceDetailClient({
    project,
    spaceId,
    engagement: initialEngagement,
    children
}: SpaceDetailClientProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [engagement, setEngagement] = useState<EngagementScoreResult | null>(initialEngagement)

    const handleRefreshEngagement = async () => {
        const updated = await refreshEngagementScore(spaceId)
        if (updated) {
            setEngagement(updated)
        }
    }

    // Get tab from URL, default to 'overview'
    const currentTab = searchParams.get('tab') || 'overview'

    // Handle tab change and update URL
    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', value)
        router.push(`?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
            {/* Compact Header with Tabs */}
            <Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-col flex-1 overflow-hidden">
                <div className="border-b bg-background flex-none shrink-0">
                    {/* Top row: Back button, Space info, Preview */}
                    <div className="flex items-center justify-between py-4 border-b">
                        <div className="flex items-center gap-6">
                            <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
                                <Link href="/spaces">
                                    <ArrowLeft className="size-4" />
                                    Back to projects
                                </Link>
                            </Button>
                            <div className="flex flex-col gap-1">
                                <h1 className="text-xl font-bold tracking-tight">{project.client_name}</h1>
                                <div className="flex items-center gap-2 text-sm">
                                    <SpaceStatusSelect
                                        spaceId={spaceId}
                                        currentStatus={project.status as SpaceStatus}
                                        projectName={project.client_name}
                                    />
                                    <EngagementBadge
                                        engagement={engagement}
                                        showPopover={true}
                                        spaceId={spaceId}
                                        onRefresh={handleRefreshEngagement}
                                    />
                                    <SpaceTagsSection spaceId={spaceId} />
                                    {project.target_go_live_date && (
                                        <span className="text-muted-foreground">
                                            Go-live: {format(new Date(project.target_go_live_date), 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2"><Button variant="outline" size="sm" asChild className="gap-2"><Link href={`/v2/spaces/${spaceId}`}><Sparkles className="size-4" />Try New Editor</Link></Button><PortalPreview spaceId={spaceId} projectName={project.client_name} /></div>
                    </div>

                    {/* Tabs row */}
                    <TabsList className="h-12 bg-transparent border-0 p-0 w-full justify-start rounded-none">
                        <TabsTrigger
                            value="overview"
                            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <LayoutDashboard className="size-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="editor"
                            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Edit3 className="size-4" />
                            Editor
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <MessageSquare className="size-4" />
                            Activity
                        </TabsTrigger>
                        <TabsTrigger
                            value="team"
                            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Users className="size-4" />
                            Team
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Settings className="size-4" />
                            Settings
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Content area - rendered by server component */}
                {children}
            </Tabs>
        </div>
    )
}
