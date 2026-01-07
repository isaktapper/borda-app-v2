import { PortalNavigation } from '@/components/portal/portal-navigation'
import { PortalProgressIndicator } from '@/components/portal/portal-progress-indicator'
import { getPortalProject, getPortalPages, validatePortalAccess } from '../../actions'
import { getPortalBranding } from '../../branding-actions'
import { getProjectProgress } from '@/app/(app)/projects/progress-actions'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { hexToHSL } from '@/lib/branding'
import { VisitLogger } from '@/components/portal/visit-logger'
import { cookies } from 'next/headers'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default async function PortalLayout({
    children,
    params
}: {
    children: React.ReactNode
    params: Promise<{ projectId: string }>
}) {
    const { projectId } = await params
    const [project, pages, branding, accessCheck, progress] = await Promise.all([
        getPortalProject(projectId),
        getPortalPages(projectId),
        getPortalBranding(projectId),
        validatePortalAccess(projectId),
        getProjectProgress(projectId, true) // Use admin client for portal access
    ])

    if (!project) {
        notFound()
    }

    const isReadOnly = accessCheck.readOnly

    // Convert brand color to HSL for CSS variables
    const primaryHSL = hexToHSL(branding.color)

    // Get visitor email from portal session cookie for visit logging
    const cookieStore = await cookies()
    const portalCookie = cookieStore.get(`portal_session_${projectId}`)
    let visitorEmail = 'unknown'

    if (portalCookie) {
        try {
            // Decode JWT to get email (simplified - just for logging)
            const payload = portalCookie.value.split('.')[1]
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
            visitorEmail = decoded.email || 'unknown'
        } catch (e) {
            console.error('[PortalLayout] Failed to decode portal cookie:', e)
        }
    }

    return (
        <>
            {/* Log portal visit (client-side, once per session) */}
            <VisitLogger projectId={projectId} visitorEmail={visitorEmail} />

            {/* Apply brand color AND gradient as CSS variables */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    :root {
                        --primary: hsl(${primaryHSL});
                        --ring: hsl(${primaryHSL});
                    }
                    .portal-gradient-bg {
                        background: ${branding.gradientCSS};
                    }
                `
            }} />

            <div className="flex flex-col min-h-screen portal-gradient-bg selection:bg-primary/10">
                {/* Header with Logo + Navigation + Contact */}
                <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-3 items-center px-6 h-16 gap-4">
                            {/* Left: Logo + Project Name */}
                            <div className="flex items-center gap-3 shrink-0">
                                {branding.logoUrl ? (
                                    <Image
                                        src={branding.logoUrl}
                                        alt={project.organization?.name || 'Logo'}
                                        width={100}
                                        height={32}
                                        className="object-contain h-7 w-auto"
                                    />
                                ) : (
                                    <div className="font-bold text-base">
                                        {project.organization?.name || 'Portal'}
                                    </div>
                                )}
                                <div className="h-5 w-px bg-border" />
                                <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">{project.name}</h1>
                            </div>

                            {/* Center: Navigation Tabs */}
                            <div className="flex justify-center">
                                <PortalNavigation pages={pages} projectId={projectId} />
                            </div>

                            {/* Right: Progress + Contact */}
                            <div className="flex items-center justify-end gap-4">
                                {progress && (
                                    <PortalProgressIndicator
                                        percentage={progress.progressPercentage}
                                        completedItems={progress.completedTasks + progress.answeredForms + progress.uploadedFiles}
                                        totalItems={progress.totalTasks + progress.totalForms + progress.totalFiles}
                                    />
                                )}
                                <a
                                    href="mailto:support@example.com"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                                >
                                    Contact us
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area - Full Width */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                        {isReadOnly && (
                            <Alert className="mb-6 border-green-200 bg-white/90 backdrop-blur-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    This project is archived. Portal is in read-only mode.
                                </AlertDescription>
                            </Alert>
                        )}
                        {children}
                    </div>
                </main>

                <Toaster position="bottom-right" />
            </div>
        </>
    )
}
