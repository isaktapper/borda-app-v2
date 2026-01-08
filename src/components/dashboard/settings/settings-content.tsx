'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SettingsSidebar } from './settings-sidebar'
import { GeneralSettingsSection } from './general-settings-section'
import { BrandingSettingsSection } from './branding-settings-section'
import { TeamTabContent } from '@/components/dashboard/team-tab-content'

interface SettingsContentProps {
    spaceId: string
    organizationId: string
    projectName: string
    currentAssignee?: string | null
}

interface ProjectData {
    client_name: string
    name: string
    status: string
    target_go_live_date: string | null
    logo_path: string | null
    brand_color: string | null
    client_logo_url: string | null
    background_gradient: string | null
}

interface OrgData {
    logo_path: string | null
    brand_color: string | null
    background_gradient: string | null
}

export function SettingsContent({ spaceId, organizationId, projectName, currentAssignee }: SettingsContentProps) {
    const [activeSection, setActiveSection] = useState<'general' | 'branding' | 'team'>('general')
    const [projectData, setProjectData] = useState<ProjectData | null>(null)
    const [orgData, setOrgData] = useState<OrgData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            const supabase = createClient()

            const [projectResult, orgResult] = await Promise.all([
                supabase
                    .from('spaces')
                    .select('client_name, name, status, target_go_live_date, logo_path, brand_color, client_logo_url, background_gradient')
                    .eq('id', spaceId)
                    .single(),
                supabase
                    .from('organizations')
                    .select('logo_path, brand_color, background_gradient')
                    .eq('id', organizationId)
                    .single()
            ])

            setProjectData(projectResult.data)
            setOrgData(orgResult.data)
            setIsLoading(false)
        }

        fetchData()
    }, [spaceId, organizationId])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
        )
    }

    if (!projectData || !orgData) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm text-muted-foreground">Failed to load settings</p>
            </div>
        )
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar Navigation */}
            <SettingsSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-8 space-y-8">
                    {activeSection === 'general' && (
                        <>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">General Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Manage basic project information and settings
                                </p>
                            </div>
                            <GeneralSettingsSection
                                spaceId={spaceId}
                                organizationId={organizationId}
                                initialClientName={projectData.client_name}
                                initialProjectName={projectData.name}
                                initialStatus={projectData.status}
                                initialTargetGoLiveDate={projectData.target_go_live_date}
                                currentAssignee={currentAssignee}
                            />
                        </>
                    )}

                    {activeSection === 'branding' && (
                        <>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Branding</h2>
                                <p className="text-sm text-muted-foreground">
                                    Customize the visual appearance of your project portal
                                </p>
                            </div>
                            <BrandingSettingsSection
                                spaceId={spaceId}
                                organizationId={organizationId}
                                initialLogoPath={projectData.logo_path}
                                initialClientLogoUrl={projectData.client_logo_url}
                                initialBrandColor={projectData.brand_color}
                                initialBackgroundGradient={projectData.background_gradient}
                                organizationLogoPath={orgData.logo_path}
                                organizationBrandColor={orgData.brand_color || '#000000'}
                                organizationBackgroundGradient={orgData.background_gradient}
                            />
                        </>
                    )}

                    {activeSection === 'team' && (
                        <>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Team</h2>
                                <p className="text-sm text-muted-foreground">
                                    Manage project team members and customer access
                                </p>
                            </div>
                            <TeamTabContent
                                spaceId={spaceId}
                                organizationId={organizationId}
                                currentAssignee={currentAssignee}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

