import { notFound } from "next/navigation"
import Link from "next/link"
import { getProject } from "@/app/dashboard/projects/actions"
import { getPages } from "./pages-actions"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { FileText, LayoutDashboard, MessageSquare, Settings, Users, ArrowLeft } from "lucide-react"
import { PagesTabContent } from "@/components/dashboard/pages-tab-content"
import { TeamTabContent } from "@/components/dashboard/team-tab-content"
import { OverviewTabContent } from "@/components/dashboard/overview-tab-content"
import { SettingsTabWrapper } from "@/components/dashboard/settings-tab-wrapper"
import { ActivityTabContent } from "@/components/dashboard/activity-tab-content"
import { PortalPreview } from "@/components/dashboard/portal-preview"
import { Button } from "@/components/ui/button"
import { ProjectTagsSection } from "@/components/dashboard/project-tags-section"
import { EngagementBadge } from "@/components/dashboard/engagement-badge"
import { getProjectEngagement } from "./engagement-actions"
import { ProjectStatusSelect } from "@/components/dashboard/project-status-select"
import type { ProjectStatus } from "./status-actions"

interface ProjectPageProps {
    params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { projectId } = await params
    const [project, initialPages, engagement] = await Promise.all([
        getProject(projectId),
        getPages(projectId),
        getProjectEngagement(projectId)
    ])

    if (!project) {
        notFound()
    }

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
            {/* Compact Header with Tabs */}
            <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
                <div className="border-b bg-background flex-none shrink-0">
                    {/* Top row: Back button, Project info, Preview */}
                    <div className="flex items-center justify-between py-4 border-b">
                        <div className="flex items-center gap-6">
                            <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
                                <Link href="/dashboard/projects">
                                    <ArrowLeft className="size-4" />
                                    Till projekt
                                </Link>
                            </Button>
                            <div className="flex flex-col gap-1">
                                <h1 className="text-xl font-bold tracking-tight">{project.client_name}</h1>
                                <div className="flex items-center gap-2 text-sm">
                                    <ProjectStatusSelect
                                        projectId={projectId}
                                        currentStatus={project.status as ProjectStatus}
                                        projectName={project.client_name}
                                    />
                                    <EngagementBadge engagement={engagement} showPopover={true} />
                                    <ProjectTagsSection projectId={projectId} />
                                    {project.target_go_live_date && (
                                        <span className="text-muted-foreground">
                                            Go-live: {format(new Date(project.target_go_live_date), 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <PortalPreview projectId={projectId} projectName={project.client_name} />
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
                                value="pages"
                                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                            >
                                <FileText className="size-4" />
                                Pages
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

                {/* Content area */}
                <TabsContent value="overview" className="mt-0 py-6 overflow-auto">
                    <OverviewTabContent projectId={projectId} targetGoLive={project.target_go_live_date} />
                </TabsContent>

                <TabsContent value="pages" className="flex-1 mt-0 overflow-hidden">
                    <PagesTabContent projectId={projectId} initialPages={initialPages} />
                </TabsContent>

                <TabsContent value="activity" className="mt-0 py-6 overflow-auto">
                    <ActivityTabContent projectId={projectId} />
                </TabsContent>

                <TabsContent value="team" className="mt-0 py-6 overflow-auto">
                    <TeamTabContent
                        projectId={projectId}
                        organizationId={project.organization_id}
                        currentAssignee={project.assigned_to}
                    />
                </TabsContent>

                <TabsContent value="settings" className="mt-0 py-6 overflow-auto">
                    <SettingsTabWrapper
                        projectId={projectId}
                        organizationId={project.organization_id}
                        projectName={project.client_name}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

