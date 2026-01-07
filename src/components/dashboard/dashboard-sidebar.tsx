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
    HelpCircle,
    X,
    CircleCheck,
    Activity,
    BarChart3,
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
import { Button } from "@/components/ui/button"
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
}

export function DashboardSidebar({ orgName, user, ...props }: DashboardSidebarProps) {
    const pathname = usePathname()
    const [showNotification, setShowNotification] = React.useState(true)

    const mainNavItems = [
        {
            title: "Projects",
            url: "/projects",
            icon: FolderKanban,
            isActive: pathname?.startsWith("/projects"),
        },
        {
            title: "Tasks",
            url: "/tasks",
            icon: CircleCheck,
            isActive: pathname?.startsWith("/tasks"),
        },
        {
            title: "Activity",
            url: "#",
            icon: Activity,
            isActive: false,
        },
    ]

    const secondaryNavItems = [
        {
            title: "Analytics",
            url: "#",
            icon: BarChart3,
            isActive: false,
        },
        {
            title: "Templates",
            url: "/templates",
            icon: FileText,
            isActive: pathname?.startsWith("/templates"),
        },
    ]

    const bottomNavItems = [
        {
            title: "Settings",
            url: "/settings",
            icon: Settings,
            isActive: pathname?.startsWith("/settings"),
        },
        {
            title: "Help Center",
            url: "#",
            icon: HelpCircle,
            isActive: false,
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
            <SidebarHeader className="border-b border-sidebar-border/50 py-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-2 w-full hover:bg-sidebar-accent rounded-md transition-colors">
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
                            <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
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
                <SidebarGroup>
                    <SidebarGroupContent className="px-2">
                        <Button className="w-full justify-start gap-2" variant="default">
                            <Plus className="size-4" />
                            <span className="group-data-[collapsible=icon]:hidden">Create new project</span>
                        </Button>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="my-2 mx-3" />

                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2">
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

                <SidebarSeparator className="my-2 mx-3" />

                {/* Secondary Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2">
                            {secondaryNavItems.map((item) => (
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

                {/* Spacer to push notification and bottom nav down */}
                <div className="flex-1" />

                {/* Notification Card */}
                {showNotification && (
                    <SidebarGroup>
                        <SidebarGroupContent className="px-2 pb-2">
                            <div className="relative rounded-lg bg-primary/5 border border-primary/20 p-3 group-data-[collapsible=icon]:hidden">
                                <button
                                    onClick={() => setShowNotification(false)}
                                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs font-semibold text-primary">New</span>
                                </div>
                                <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                                    <Image
                                        src="/Slack_icon_2019.svg (1).png"
                                        alt="Slack"
                                        width={16}
                                        height={16}
                                        className="shrink-0"
                                    />
                                    Slack integration
                                </h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Connect your Slack workspace to Borda for instant updates
                                </p>
                                <Link href="/settings?tab=integrations" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                                    Connect
                                    <ChevronRight className="size-3" />
                                </Link>
                            </div>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                <SidebarSeparator className="my-2 mx-3" />

                {/* Bottom Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2">
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
