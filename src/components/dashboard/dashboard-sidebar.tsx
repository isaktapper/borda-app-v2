"use client"

import * as React from "react"
import Image from "next/image"
import {
    FolderKanban,
    FileText,
    Settings,
    ChevronRight,
    ChevronsUpDown,
    User,
    LogOut,
    Plus,
    X,
    CircleCheck,
    Activity,
    BarChart3,
    Plug,
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
    SidebarSeparator,
    SidebarGroup,
    SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreateSpaceModal } from "@/components/dashboard/create-space-modal"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signout } from "@/app/auth/actions"

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
    orgName: string
    user?: {
        name: string
        email: string
        avatar?: string
    }
    isSlackConnected?: boolean
}

export function DashboardSidebar({ orgName, user, isSlackConnected, ...props }: DashboardSidebarProps) {
    const pathname = usePathname()
    const [showNotification, setShowNotification] = React.useState(true)

    const mainNavItems = [
        {
            title: "Spaces",
            url: "/spaces",
            icon: FolderKanban,
            isActive: pathname?.startsWith("/spaces"),
        },
        {
            title: "Tasks",
            url: "/tasks",
            icon: CircleCheck,
            isActive: pathname?.startsWith("/tasks"),
        },
        {
            title: "Activity",
            url: "/activity",
            icon: Activity,
            isActive: pathname?.startsWith("/activity"),
        },
    ]

    const secondaryNavItems = [
        {
            title: "Integrations",
            url: "/integrations",
            icon: Plug,
            isActive: pathname?.startsWith("/integrations"),
        },
        {
            title: "Templates",
            url: "/templates",
            icon: FileText,
            isActive: pathname?.startsWith("/templates"),
        },
        {
            title: "Analytics",
            url: "#",
            icon: BarChart3,
            isActive: false,
            comingSoon: true,
        },
    ]

    const bottomNavItems = [
        {
            title: "Settings",
            url: "/settings",
            icon: Settings,
            isActive: pathname?.startsWith("/settings"),
        },
    ]

    const handleSignout = async () => {
        await signout()
    }

    // Get initials for avatar fallback
    const initials = user?.name
        ? user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : 'U'

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-2 py-1 w-full hover:bg-sidebar-accent rounded-md transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-semibold">{orgName}</span>
                                <span className="truncate text-xs text-muted-foreground">{user?.name || user?.email || 'User'}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/settings?tab=profile" className="flex items-center gap-2 cursor-pointer">
                                <User className="size-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSignout} className="flex items-center gap-2 cursor-pointer">
                            <LogOut className="size-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>
            <SidebarContent>
                {/* Quick Action Button */}
                <SidebarGroup className="mt-2">
                    <SidebarGroupContent className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <CreateSpaceModal
                            trigger={
                                <button className="w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg py-2 px-3 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-full transition-colors">
                                    <Plus className="size-4 shrink-0" />
                                    <span className="group-data-[collapsible=icon]:hidden">New Space</span>
                                </button>
                            }
                        />
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="my-2 w-16 mx-auto" />

                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
                            {mainNavItems.map((item) => (
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
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="my-2 w-16 mx-auto" />

                {/* Secondary Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
                            {secondaryNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    {item.comingSoon ? (
                                        <SidebarMenuButton
                                            isActive={false}
                                            tooltip={`${item.title} - Coming soon`}
                                            className="cursor-not-allowed opacity-60"
                                        >
                                            <item.icon className="size-4" />
                                            <span>{item.title}</span>
                                            <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded group-data-[collapsible=icon]:hidden">
                                                Soon
                                            </span>
                                        </SidebarMenuButton>
                                    ) : (
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
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Spacer to push notification and bottom nav down */}
                <div className="flex-1" />

                {/* Slack Notification Card - only show if not connected */}
                {!isSlackConnected && showNotification && (
                    <SidebarGroup>
                        <SidebarGroupContent className="px-2 pb-1">
                            <div className="relative rounded-md bg-primary/5 border border-primary/20 p-2 group-data-[collapsible=icon]:hidden">
                                <button
                                    onClick={() => setShowNotification(false)}
                                    className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <Image
                                        src="/Slack_icon_2019.svg (1).png"
                                        alt="Slack"
                                        width={14}
                                        height={14}
                                        className="shrink-0"
                                    />
                                    <span className="text-[11px] font-medium">Slack integration</span>
                                    <span className="text-[9px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded">New</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                    Get instant updates in Slack
                                </p>
                                <Link href="/integrations" className="text-[10px] font-medium text-primary hover:underline inline-flex items-center gap-0.5 mt-1">
                                    Connect
                                    <ChevronRight className="size-2.5" />
                                </Link>
                            </div>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                <SidebarSeparator className="my-2 w-16 mx-auto" />

                {/* Bottom Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
                            {bottomNavItems.map((item) => (
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
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {/* Footer can be used for additional info or left empty */}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
