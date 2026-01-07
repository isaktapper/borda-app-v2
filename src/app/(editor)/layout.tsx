import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function EditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fullscreen layout for editor - no sidebar, no dashboard chrome
    return <div className="h-screen overflow-hidden">{children}</div>
}
