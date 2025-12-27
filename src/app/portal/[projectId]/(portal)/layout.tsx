import { PortalSidebar } from '@/components/portal/portal-sidebar'
import { getPortalProject, getPortalPages, validatePortalAccess } from '../../actions'
import { getPortalBranding } from '../../branding-actions'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Shield, CheckCircle2 } from 'lucide-react'
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
    const [project, pages, branding, accessCheck] = await Promise.all([
        getPortalProject(projectId),
        getPortalPages(projectId),
        getPortalBranding(projectId),
        validatePortalAccess(projectId)
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

            {/* Apply brand color as CSS variable */}
            <style dangerouslySetInnerHTML={{
                __html: `:root { --primary: hsl(${primaryHSL}); --ring: hsl(${primaryHSL}); }`
            }} />
            <div className="flex h-screen bg-muted/10 selection:bg-primary/10">
            {/* Sidebar (Desktop) */}
            <aside className="w-72 hidden md:block">
                <PortalSidebar pages={pages} projectId={projectId} />
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB]">
                {/* Header */}
                <header className="h-20 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-6">
                        {branding.logoUrl ? (
                            <Image
                                src={branding.logoUrl}
                                alt={project.organization?.name || 'Logo'}
                                width={120}
                                height={40}
                                className="object-contain h-8 w-auto"
                            />
                        ) : (
                            <div className="font-black text-2xl tracking-tighter">
                                {project.organization?.name || 'Portal'}
                            </div>
                        )}
                        <div className="h-6 w-px bg-muted mx-2 hidden sm:block" />
                        <div className="hidden sm:flex flex-col">
                            <h1 className="text-sm font-bold text-foreground leading-none">{project.name}</h1>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Implementeringsportal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-muted/5 text-[11px] font-medium text-muted-foreground">
                            <Shield className="size-3 opacity-50" />
                            Säker åtkomst
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="max-w-4xl mx-auto px-8 py-12">
                        {isReadOnly && (
                            <Alert className="mb-6 border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Detta projekt är avslutat. Portalen är i läsläge och kan inte längre redigeras.
                                </AlertDescription>
                            </Alert>
                        )}
                        {children}
                    </div>
                </main>
            </div>
            <Toaster position="bottom-right" />
            </div>
        </>
    )
}
