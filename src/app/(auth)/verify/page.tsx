import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function VerifyPage() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                    Check your email
                </h1>
                <p className="text-muted-foreground">
                    We've sent you a verification link. Please check your inbox to verify your account.
                </p>
            </div>

            <div className="space-y-4">
                <Button asChild variant="outline" className="w-full h-11 rounded-md font-medium">
                    <Link href="/login">
                        Back to sign in
                    </Link>
                </Button>

                <p className="text-sm text-muted-foreground">
                    Didn't receive the email?{' '}
                    <Link href="/signup" className="text-foreground font-medium hover:underline underline-offset-4">
                        Try again
                    </Link>
                </p>
            </div>
        </div>
    )
}
