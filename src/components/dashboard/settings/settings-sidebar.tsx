'use client'

import { cn } from '@/lib/utils'
import { Settings, Palette, LayoutTemplate } from 'lucide-react'

interface SettingsSidebarProps {
    activeSection: 'general' | 'branding' | 'templates'
    onSectionChange: (section: 'general' | 'branding' | 'templates') => void
}

const sections = [
    {
        id: 'general' as const,
        label: 'General Settings',
        icon: Settings
    },
    {
        id: 'branding' as const,
        label: 'Branding',
        icon: Palette
    },
    {
        id: 'templates' as const,
        label: 'Templates',
        icon: LayoutTemplate
    }
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
    return (
        <div className="w-56 border-r bg-background flex flex-col shrink-0">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-sm text-muted-foreground">Settings</h2>
            </div>
            <nav className="flex-1 p-2">
                <div className="space-y-1">
                    {sections.map((section) => {
                        const Icon = section.icon
                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionChange(section.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeSection === section.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="size-4" />
                                {section.label}
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
