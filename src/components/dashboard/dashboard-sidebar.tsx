"use client"

import * as React from "react"
import {
    LayoutDashboard,
    FolderKanban,
    FileText,
    Settings,
    ChevronRight,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
    orgName: string
}

export function DashboardSidebar({ orgName, ...props }: DashboardSidebarProps) {
    const pathname = usePathname()

    const navItems = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
            isActive: pathname === "/dashboard",
        },
        {
            title: "Projects",
            url: "/dashboard/projects",
            icon: FolderKanban,
            isActive: pathname?.startsWith("/dashboard/projects"),
        },
        {
            title: "Templates",
            url: "/dashboard/templates",
            icon: FileText,
            isActive: pathname?.startsWith("/dashboard/templates"),
        },
        {
            title: "Settings",
            url: "/dashboard/settings",
            icon: Settings,
            isActive: pathname?.startsWith("/dashboard/settings"),
        },
    ]

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b border-sidebar-border/50 py-4">
                <div className="flex items-center gap-2 px-2">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="font-bold text-xl">I</span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold text-base">Impel</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="px-2 pt-2">
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={item.isActive}
                                tooltip={item.title}
                            >
                                <Link href={item.url}>
                                    <item.icon className="size-4" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border/50 py-4">
                <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</span>
                        <span className="truncate font-medium">{orgName}</span>
                    </div>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
