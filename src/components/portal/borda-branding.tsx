import Link from 'next/link'
import Image from 'next/image'

interface BordaBrandingProps {
  /** Whether to show the branding - should be pre-computed based on plan + settings */
  show?: boolean
  /** Optional className for additional styling */
  className?: string
}

/**
 * "Powered by Borda" footer branding component
 * Displayed in shared spaces and portal previews
 * 
 * Visibility rules:
 * - Growth plan: Always shown, cannot be hidden
 * - Scale/Trial plan: Shown by default, can be disabled in org/space settings
 */
export function BordaBranding({ show = true, className = '' }: BordaBrandingProps) {
  if (!show) return null

  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <Link
        href="https://borda.work"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <span>Powered by</span>
        <Image
          src="/borda_logo.png"
          alt="Borda"
          width={60}
          height={20}
          className="h-4 w-auto opacity-50 group-hover:opacity-80 transition-opacity"
        />
      </Link>
    </div>
  )
}

/**
 * Server component wrapper that fetches branding visibility
 * Use this in server components where you need to check plan + settings
 */
export async function BordaBrandingServer({
  organizationId,
  spaceId,
  className = '',
}: {
  organizationId: string
  spaceId?: string
  className?: string
}) {
  // Import here to avoid circular dependencies
  const { shouldShowBordaBranding } = await import('@/lib/permissions')
  
  const show = await shouldShowBordaBranding(organizationId, spaceId)
  
  return <BordaBranding show={show} className={className} />
}
