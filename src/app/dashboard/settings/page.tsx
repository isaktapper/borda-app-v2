import { Users, Building, Tag } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function SettingsPage() {
    return (
        <div className="space-y-4">
            <div className="border-b pb-3">
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace and profile settings.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/dashboard/settings/team">
                    <Card className="p-5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg p-2 bg-primary/10">
                                <Users className="size-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="font-semibold text-sm">Team</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Hantera organisationens medlemmar
                                </p>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                    Bjud in teammedlemmar, hantera roller och behörigheter.
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/dashboard/settings/organization">
                    <Card className="p-5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg p-2 bg-primary/10">
                                <Building className="size-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="font-semibold text-sm">Organization</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Organisationsinställningar
                                </p>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                    Hantera branding, logo och primärfärg.
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/dashboard/settings/tags">
                    <Card className="p-5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg p-2 bg-primary/10">
                                <Tag className="size-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="font-semibold text-sm">Tags</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Tagghantering
                                </p>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                    Skapa, redigera och ta bort taggar för projekt.
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
